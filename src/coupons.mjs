export const couponStores = [
  { marketplace: "Mercado Livre", url: "https://www.mercadolivre.com.br/cupons", action: "Ver cupons", hosts: ["www.mercadolivre.com.br", "mercadolivre.com.br", "produto.mercadolivre.com.br"] },
  { marketplace: "Amazon", url: "https://www.amazon.com.br/deals", action: "Ver ofertas e cupons", hosts: ["amazon.com.br", "www.amazon.com.br"] },
  { marketplace: "Shopee", url: "https://shopee.com.br/m/cupom-de-desconto", action: "Ver cupons", hosts: ["shopee.com.br", "www.shopee.com.br"] },
  { marketplace: "Magalu", url: "https://www.magazineluiza.com.br/selecao/cupons/", action: "Ver cupons", hosts: ["magazineluiza.com.br", "www.magazineluiza.com.br", "especiais.magazineluiza.com.br"] },
];

const storesByName = new Map(couponStores.map(store => [store.marketplace, store]));
const active = `
  c.verification_status = 'verified'
  AND julianday(c.verified_at) <= julianday('now')
  AND (c.valid_from IS NULL OR julianday(c.valid_from) <= julianday('now'))
  AND julianday(c.valid_until) > julianday('now')
`;
const maxMoney = 1_000_000_000;
const couponFields = `c.id, c.marketplace, c.code, c.campaign_name, c.official_source_url,
  c.discount_type, c.discount_value, c.min_order_cents, c.max_discount_cents,
  c.product_id, c.terms, c.valid_until, c.verified_at`;

function officialUrl(value, marketplace) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        !storesByName.get(marketplace)?.hosts.includes(url.hostname)) return null;
    // Keep public campaign identifiers and discard tracking or account parameters.
    for (const key of [...url.searchParams.keys()]) {
      if (!["node", "campaign", "promo", "seller_id"].includes(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function publicCoupon(row) {
  const source = officialUrl(row.official_source_url, row.marketplace);
  if (!source || !row.terms || (row.discount_type === "percent" && row.discount_value > 100)) return null;
  const { listing_id, ...data } = row;
  return { ...data, official_source_url: source };
}

export async function listCoupons(db, marketplace = null) {
  if (marketplace !== null && !storesByName.has(marketplace)) {
    return { status: 400, data: { error: "Selecione uma das quatro lojas parceiras." } };
  }
  const { results } = await db.prepare(`
    SELECT ${couponFields}
    FROM verified_coupons c
    WHERE ${active} AND (? IS NULL OR c.marketplace = ?)
    ORDER BY julianday(c.valid_until), c.id DESC
    LIMIT 60
  `).bind(marketplace, marketplace).all();
  return { data: {
    coupons: results.map(publicCoupon).filter(Boolean),
    stores: couponStores.map(({ hosts, ...source }) => source),
  } };
}

export async function couponsForVariant(db, productId, payment) {
  const { results } = await db.prepare(`
    SELECT ${couponFields}, e.listing_id
    FROM verified_coupons c JOIN coupon_offer_eligibility e ON e.coupon_id = c.id
    WHERE ${active} AND c.product_id = ? AND e.payment = ? AND c.discount_type != 'shipping'
      AND julianday(e.verified_at) <= julianday('now')
    ORDER BY julianday(c.valid_until), c.id DESC
  `).bind(productId, payment).all();
  return results.reduce((byStore, row) => {
    const coupon = publicCoupon(row);
    if (!coupon) return byStore;
    const key = JSON.stringify([row.marketplace, row.listing_id]);
    const candidates = byStore.get(key) ?? [];
    candidates.push(coupon);
    byStore.set(key, candidates);
    return byStore;
  }, new Map());
}

export function bestCouponForOffer(coupons, offer) {
  const candidates = coupons.get(JSON.stringify([offer.marketplace, offer.listing_id])) ?? [];
  let best = null;
  for (const coupon of candidates) {
    if (offer.price_cents < coupon.min_order_cents) continue;
    const amount = coupon.discount_type === "percent"
      ? Math.floor(offer.price_cents * coupon.discount_value / 100)
      : coupon.discount_value;
    const discount = Math.min(amount, coupon.max_discount_cents ?? amount, offer.price_cents);
    if (discount > (best?.discount_cents ?? 0)) {
      best = { ...coupon, discount_cents: discount, estimated_price_cents: offer.price_cents - discount };
    }
  }
  return best;
}

export async function couponForCatalogOffer(db, id) {
  const now = Date.now();
  const quote = await db.prepare(`
    SELECT q.marketplace, q.listing_id, q.price_cents, q.product_id, q.payment
    FROM public_comparison_offers q
    WHERE q.catalog_offer_id = ? AND q.available = 1 AND q.observed_ms <= ? AND q.expires_ms > ?
      AND NOT EXISTS (
        SELECT 1 FROM comparison_offers other
        WHERE other.marketplace = q.marketplace AND other.listing_id = q.listing_id
          AND other.available = 0 AND other.observed_ms >= q.observed_ms
      )
    ORDER BY q.observed_ms DESC, q.listing_id, q.payment LIMIT 1
  `).bind(id, now, now).first();
  if (!quote) return { coupon: null };
  const coupons = await couponsForVariant(db, quote.product_id, quote.payment);
  return { coupon: bestCouponForOffer(coupons, quote) };
}

function clean(value, max) {
  return typeof value === "string" && value.length <= max ? value.trim() : "";
}

function cents(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= maxMoney;
}

function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 19) !== value.slice(0, 19)) return null;
  return parsed.toISOString();
}

export async function listAdminCoupons(db) {
  const { results } = await db.prepare(`
    SELECT c.id, c.marketplace, c.campaign_name, c.code, c.valid_until, c.verification_status,
      CASE WHEN ${active} THEN 1 ELSE 0 END AS visible
    FROM verified_coupons c ORDER BY c.id DESC LIMIT 50
  `).all();
  return { coupons: results };
}

export async function publishCoupon(db, actor, body) {
  const marketplace = body?.marketplace;
  const campaign = clean(body?.campaign_name, 140);
  const code = clean(body?.code, 60) || null;
  const terms = clean(body?.terms, 700);
  const source = officialUrl(body?.official_source_url, marketplace);
  const kind = body?.discount_type;
  const value = body?.discount_value;
  const minimum = body?.min_order_cents ?? 0;
  const cap = body?.max_discount_cents ?? null;
  const start = date(body?.valid_from);
  const end = date(body?.valid_until);
  const verified = new Date().toISOString();
  const productId = clean(body?.product_id, 80) || null;
  const listingId = clean(body?.listing_id, 150) || null;
  const payment = body?.payment;
  const appliesToListing = listingId !== null || Boolean(payment);
  if (!body || body.confirmed_official !== true || !campaign || !terms || !source ||
      !["fixed", "percent", "shipping"].includes(kind) || !cents(value) || !cents(minimum) ||
      (kind === "shipping" ? value !== 0 : value === 0) || (kind === "percent" && value > 100) ||
      (cap !== null && (!cents(cap) || cap === 0 || kind !== "percent")) ||
      (body.valid_from != null && !start) || !end || end <= verified || (start && start >= end) ||
      (productId && !/^[a-z0-9][a-z0-9-]{1,79}$/.test(productId)) ||
      (body.code != null && body.code !== "" && !code) ||
      (body.product_id != null && body.product_id !== "" && !productId) ||
      (body.listing_id != null && body.listing_id !== "" && !listingId) ||
      (appliesToListing && (!productId || !listingId || !["cash", "pix"].includes(payment) ||
        kind === "shipping" || body.confirmed_listing_terms !== true))) {
    return { status: 422, data: { error: "Confira a fonte oficial, as regras, a validade e os dados de aplicação do cupom." } };
  }
  if (productId && !await db.prepare("SELECT id FROM comparison_products WHERE id = ?").bind(productId).first()) {
    return { status: 422, data: { error: "Selecione uma variante cadastrada no comparador." } };
  }
  if (appliesToListing) {
    const quote = await db.prepare(`
      SELECT listing_id FROM public_comparison_offers
      WHERE product_id = ? AND marketplace = ? AND listing_id = ? AND payment = ?
        AND available = 1 AND expires_ms > ?
    `).bind(productId, marketplace, listingId, payment, Date.now()).first();
    if (!quote) return { status: 422, data: { error: "Informe um anúncio com cotação vigente para essa variante e forma de pagamento." } };
  }

  const identity = [marketplace, source, campaign, code ?? "", productId ?? "", end];
  const matchingCampaign = `marketplace = ? AND official_source_url = ? AND campaign_name = ?
    AND coalesce(code, '') = ? AND coalesce(product_id, '') = ? AND valid_until = ?`;
  const statements = [
    db.prepare(`
      DELETE FROM coupon_offer_eligibility WHERE coupon_id IN (
        SELECT id FROM verified_coupons WHERE ${matchingCampaign}
          AND (verified_at IS NULL OR julianday(verified_at) <= julianday(?))
          AND (verification_status <> 'verified' OR discount_type <> ? OR discount_value <> ?
            OR min_order_cents <> ? OR max_discount_cents IS NOT ? OR valid_from IS NOT ? OR terms <> ?)
      )
    `).bind(...identity, verified, kind, value, minimum, cap, start, terms),
    db.prepare(`
      INSERT INTO verified_coupons (marketplace, code, campaign_name, official_source_url, discount_type,
        discount_value, min_order_cents, max_discount_cents, valid_from, valid_until, product_id, terms,
        verification_status, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)
      ON CONFLICT DO UPDATE SET discount_type = excluded.discount_type, discount_value = excluded.discount_value,
        min_order_cents = excluded.min_order_cents, max_discount_cents = excluded.max_discount_cents,
        valid_from = excluded.valid_from, terms = excluded.terms, verification_status = 'verified',
        verified_at = excluded.verified_at
      WHERE verified_coupons.verified_at IS NULL OR julianday(excluded.verified_at) >= julianday(verified_coupons.verified_at)
    `).bind(marketplace, code, campaign, source, kind, value, minimum, cap, start, end, productId, terms, verified),
  ];
  if (appliesToListing) {
    statements.push(db.prepare(`
      INSERT INTO coupon_offer_eligibility (coupon_id, listing_id, payment, verified_at)
      SELECT id, ?, ?, ? FROM verified_coupons
      WHERE ${matchingCampaign} AND verified_at = ?
      ON CONFLICT(coupon_id, listing_id, payment) DO UPDATE SET verified_at = excluded.verified_at
    `).bind(listingId, payment, verified, ...identity, verified));
  }
  statements.push(db.prepare(`
    INSERT INTO admin_events (actor_email,event_type,offer_id,details)
    VALUES (?, 'coupon_verified', NULL, ?)
  `).bind(actor, `${marketplace} · ${campaign}`));
  await db.batch(statements);
  return { status: 201, data: { ok: true } };
}

export async function expireCoupon(db, actor, id) {
  const [, result] = await db.batch([
    db.prepare(`
      INSERT INTO admin_events (actor_email,event_type,offer_id,details)
      SELECT ?, 'coupon_expired', NULL, campaign_name FROM verified_coupons WHERE id = ? AND verification_status <> 'expired'
    `).bind(actor, id),
    db.prepare("UPDATE verified_coupons SET verification_status = 'expired' WHERE id = ? AND verification_status <> 'expired'").bind(id),
  ]);
  return result.meta.changes
    ? { data: { ok: true } }
    : { status: 404, data: { error: "Cupom ativo ou cadastrado não encontrado." } };
}
