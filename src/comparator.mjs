import { safeProductImageUrl } from "./product_images.mjs";
import { normalizeProductSearch, productSearchTerms } from "./comparator_search.mjs";
import { bestCouponForOffer, couponsForVariant } from "./coupons.mjs";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MARKETS = ["Mercado Livre", "Amazon", "Shopee", "Magalu"];
const PAYMENTS = ["cash", "pix"];
const ID = /^[a-z0-9][a-z0-9-]{1,79}$/;
const MARKET_HOSTS = {
  "Mercado Livre": ["www.mercadolivre.com.br", "mercadolivre.com.br", "produto.mercadolivre.com.br"],
  Amazon: ["www.amazon.com.br", "amazon.com.br"],
  Shopee: ["shopee.com.br", "www.shopee.com.br"],
  Magalu: ["www.magazineluiza.com.br", "magazineluiza.com.br", "www.magazinevoce.com.br", "m.magazinevoce.com.br"],
};
const MAX_PRODUCTS = 12;
const MAX_SUGGESTIONS = 6;
const verifiedVariantPhotos = new Map([
  ["poco-x8-pro-8gb-256gb-preto", "https://a-static.mlcdn.com.br/470x352/poco-x8-pro-8gb-256gb-preto-versao-global-5g-nfc-lancamento-xiaomi-poco-x8-pro/pointmixeletro/x8pro-8-256-001/0bb26146d8107846a29ec9d81cecb28c.jpeg"],
]);

function webUrl(value, hosts) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && !url.port && hosts.includes(url.hostname)) return url;
  } catch {
    return null;
  }
  return null;
}

function asin(url) {
  return url?.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1]?.toUpperCase();
}

export function affiliateDestination(marketplace, source, target, storefront) {
  if (marketplace === "Mercado Livre") {
    const product = webUrl(source, MARKET_HOSTS[marketplace]);
    const url = webUrl(target, ["meli.la"]);
    return product && /(?:\/(?:p|up)\/MLB[U]?\d+(?:\/|$)|^\/MLB-\d+)/i.test(product.pathname) &&
      url && /^\/[a-z0-9]+$/i.test(url.pathname) ? url.href : null;
  }
  if (marketplace === "Shopee") {
    const product = webUrl(source, MARKET_HOSTS.Shopee);
    const url = webUrl(target, ["s.shopee.com.br", "shope.ee"]);
    return product && /(?:\/product\/\d+\/\d+|i\.\d+\.\d+)\/?$/i.test(product.pathname) &&
      url && /^\/[a-z0-9]+$/i.test(url.pathname) ? url.href : null;
  }
  if (marketplace === "Amazon") {
    const url = webUrl(target, MARKET_HOSTS.Amazon);
    const tag = webUrl(storefront, MARKET_HOSTS.Amazon)?.searchParams.get("tag");
    const product = asin(webUrl(source, MARKET_HOSTS.Amazon));
    return url && tag && product && asin(url) === product && url.searchParams.getAll("tag").length === 1 &&
      url.searchParams.get("tag") === tag ? url.href : null;
  }
  const hosts = ["www.magazinevoce.com.br", "m.magazinevoce.com.br"];
  const url = webUrl(target, hosts);
  const slug = webUrl(storefront, hosts)?.pathname.split("/")[1];
  const product = webUrl(source, MARKET_HOSTS.Magalu);
  const id = product?.pathname.match(/\/p\/([a-z0-9]+)\//i)?.[1];
  const seller = product?.searchParams.get("seller_id");
  return url && slug && id && url.pathname.split("/")[1] === slug &&
    url.pathname.match(/\/p\/([a-z0-9]+)\//i)?.[1] === id &&
    (!seller || url.searchParams.get("seller_id") === seller) ? url.href : null;
}

async function marketplaceState(db) {
  const { results } = await db.prepare(`
    SELECT p.marketplace, p.approval_status, s.enabled, f.affiliate_url
    FROM affiliate_programs p
    LEFT JOIN marketplace_sources s ON s.marketplace = p.marketplace
    LEFT JOIN partner_storefronts f ON f.marketplace = p.marketplace AND f.status = 'active'
  `).all();
  return new Map(results.map(row => [row.marketplace, {
    approved: row.approval_status === "approved",
    active: row.approval_status === "approved" && row.enabled === 1,
    storefront: row.affiliate_url,
  }]));
}

async function findProducts(db, patterns, query, limit) {
  const where = patterns.map(() => "instr(search_text, ?) > 0").join(" AND ");
  const { results } = await db.prepare(`
    SELECT cp.id, cp.title, cp.variant, cp.gtin,
      (SELECT pi.image_url FROM comparison_offers co
       JOIN offers o ON o.id=co.catalog_offer_id AND o.status='approved'
       JOIN product_images pi ON pi.offer_id=o.id
       WHERE co.product_id=cp.id ORDER BY co.observed_ms DESC,pi.sort_order,pi.id LIMIT 1) AS catalog_image_url
    FROM comparison_products cp
    WHERE ${where}
    ORDER BY CASE WHEN gtin = ? THEN 0 WHEN instr(search_text, ?) > 0 THEN 1 ELSE 2 END,
      title COLLATE NOCASE, variant COLLATE NOCASE, id
    LIMIT ?
  `).bind(...patterns, query.barcode, query.phrase, limit + 1).all();
  return { products: results.slice(0, limit).map(product => {
    const image_url = verifiedVariantPhotos.get(product.id) ?? safeProductImageUrl(product.catalog_image_url);
    const { catalog_image_url, ...details } = product;
    return image_url ? { ...details, image_url } : details;
  }), more: results.length > limit };
}

export async function compareProducts(db, params) {
  const query = params.get("q");
  const id = params.get("product");
  const requestedPayment = params.get("payment");
  let payment = requestedPayment ?? "cash";
  const suggest = params.get("suggest") === "1";
  if (!PAYMENTS.includes(payment) || (query === null) === (id === null) ||
      (id !== null && (suggest || !ID.test(id))) || (query !== null && query.length > 120)) {
    return { status: 400, data: { error: "Informe um produto ou código de barras válido." } };
  }

  let product;
  if (id !== null) {
    product = await db.prepare("SELECT id, title, variant, gtin FROM comparison_products WHERE id = ?").bind(id).first();
  } else {
    const terms = productSearchTerms(query);
    if (!terms) {
      if (suggest) return { data: { products: [], more: false } };
      return { status: 400, data: { error: "Digite o nome, o modelo ou o código de barras do produto." } };
    }
    if (suggest) return { data: await findProducts(db, terms.prefixes, terms, MAX_SUGGESTIONS) };
    const exact = await findProducts(db, terms.exact, terms, MAX_PRODUCTS);
    if (exact.products.length > 1) return { data: exact };
    [product] = exact.products;
    if (!product) {
      const prefix = await findProducts(db, terms.prefixes, terms, MAX_PRODUCTS);
      if (prefix.products.length) return { data: prefix };
    }
  }

  const markets = await marketplaceState(db);
  const stores = MARKETS.map(marketplace => ({
    marketplace,
    status: markets.get(marketplace)?.active ? "no_match" : "unavailable",
  }));
  if (!product) return { data: { products: [], stores } };

  const now = Date.now();
  const { results } = await db.prepare(`
    SELECT marketplace, listing_id, price_cents, previous_price_cents, used_price_cents, source_url, affiliate_url,
      image_url, observed_ms, payment, catalog_offer_id
    FROM public_comparison_offers o
    WHERE o.product_id = ? AND o.available = 1
      AND (o.payment = ? OR (? = 1 AND o.catalog_offer_id IS NOT NULL AND o.payment = 'pix'))
      AND o.observed_ms <= ? AND o.expires_ms > ?
      AND NOT EXISTS (
        SELECT 1 FROM comparison_offers other
        WHERE other.marketplace = o.marketplace AND other.listing_id = o.listing_id
          AND other.available = 0 AND other.observed_ms >= o.observed_ms
      )
    ORDER BY price_cents, observed_ms DESC, marketplace, listing_id
  `).bind(product.id, payment, Number(requestedPayment === null), now, now).all();

  const candidates = [];
  for (const row of results) {
    const market = markets.get(row.marketplace);
    if (row.catalog_offer_id === null ? !market?.active : !market?.approved) continue;
    const url = affiliateDestination(row.marketplace, row.source_url, row.affiliate_url, market.storefront);
    const photo = safeProductImageUrl(row.image_url);
    if (url) candidates.push({ row, url, photo });
  }
  if (requestedPayment === null && candidates.length && candidates.every(({ row }) => row.payment === "pix")) payment = "pix";
  const selectedQuotes = candidates.filter(({ row }) => row.payment === payment);
  const coupons = selectedQuotes.length ? await couponsForVariant(db, product.id, payment) : new Map();
  const bestByStore = new Map();
  const effectivePrice = offer => offer.coupon?.estimated_price_cents ?? offer.price_cents;
  for (const { row, url, photo } of selectedQuotes) {
    const store = stores.find(entry => entry.marketplace === row.marketplace);
    if (!store) continue;
    const coupon = bestCouponForOffer(coupons, row);
    const offer = { marketplace: row.marketplace, price_cents: row.price_cents,
      previous_price_cents: row.previous_price_cents, used_price_cents: row.used_price_cents,
      checked_at: new Date(row.observed_ms).toISOString(),
      image_url: photo, affiliate_url: url, catalog_reference: row.catalog_offer_id !== null, ...(coupon ? { coupon } : {}) };
    const current = bestByStore.get(row.marketplace);
    if (!current || effectivePrice(offer) < effectivePrice(current)) bestByStore.set(row.marketplace, offer);
    store.status = "available";
  }
  const offers = [...bestByStore.values()].sort((a, b) => effectivePrice(a) - effectivePrice(b) || a.price_cents - b.price_cents);
  // Expired catalog quotes may still provide a verified product-specific affiliate link.
  // Never expose their historical price as a current quote.
  const historic = await db.prepare(`
    SELECT co.marketplace, co.source_url, co.affiliate_url, co.observed_ms
    FROM comparison_offers co
    JOIN offers o ON o.id = co.catalog_offer_id AND o.status = 'approved'
    WHERE co.product_id = ? AND co.available = 1 AND co.expires_ms <= ?
    ORDER BY co.observed_ms DESC
  `).bind(product.id, now).all();
  for (const old of historic.results) {
    const store = stores.find(s => s.marketplace === old.marketplace);
    if (!store || store.status === "available" || store.catalog_link) continue;
    const market = markets.get(old.marketplace);
    if (!market?.approved) continue;
    const link = affiliateDestination(old.marketplace, old.source_url, old.affiliate_url, market.storefront);
    if (link) {
      store.catalog_link = link;
      store.status = "price_expired";
      store.last_checked_at = new Date(old.observed_ms).toISOString();
    }
  }

  let image = product.image_url ?? verifiedVariantPhotos.get(product.id) ?? offers[0]?.image_url;
  if (!image) {
    const photo = await db.prepare("SELECT pi.image_url FROM comparison_offers co JOIN offers o ON o.id=co.catalog_offer_id AND o.status='approved' JOIN product_images pi ON pi.offer_id=o.id WHERE co.product_id=? ORDER BY co.observed_ms DESC,pi.sort_order,pi.id LIMIT 1").bind(product.id).first();
    image = safeProductImageUrl(photo?.image_url);
  }
  if (image) product = { ...product, image_url: image };
  return { data: { product, offers, stores, payment } };
}

function checkedGtin(gtin) {
  if (typeof gtin !== "string" || !/^(?:\d{8}|\d{12,14})$/.test(gtin)) return false;
  const sum = [...gtin].reverse().reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return sum % 10 === 0;
}

function boundedText(value, max) {
  return typeof value === "string" && value.trim() && value.length <= max ? value.trim() : null;
}

function validPrice(value) {
  return Number.isInteger(value) && value > 0 && value <= 1000000000;
}

function validateQuote(row, marketplace, storefront, now) {
  const product = row?.product;
  const title = boundedText(product?.title, 160);
  const variant = boundedText(product?.variant, 100);
  const aliases = boundedText(product?.aliases, 250) ?? "";
  const gtin = product?.gtin ?? null;
  const listing = boundedText(row?.listing_id, 150);
  const evidence = boundedText(row?.affiliate_reference, 240);
  const source = webUrl(row?.source_url, MARKET_HOSTS[marketplace]);
  const target = source && affiliateDestination(marketplace, source.href, row.affiliate_url, storefront);
  const image = safeProductImageUrl(row?.image_url);
  const observed = typeof row?.observed_at === "string" ? Date.parse(row.observed_at) : NaN;
  const lifetime = marketplace === "Amazon" ? DAY - HOUR : DAY;
  const expires = row?.expires_at === undefined ? observed + lifetime : Date.parse(row.expires_at);
  const previous = row?.previous_price_cents ?? null;
  const used = row?.used_price_cents ?? null;
  if (!product || typeof product.id !== "string" || !ID.test(product.id) || !normalizeProductSearch(title ?? "") || !variant ||
      (gtin !== null && !checkedGtin(gtin)) || !listing || !evidence || !source || !target || !image ||
      row.currency !== "BRL" || !PAYMENTS.includes(row.payment) || !validPrice(row.price_cents) ||
      (previous !== null && (!validPrice(previous) || previous < row.price_cents)) ||
      (used !== null && (marketplace !== "Amazon" || !validPrice(used))) ||
      typeof row.available !== "boolean" || row.condition !== "new" ||
      !(observed <= now && expires > now && expires > observed && expires <= observed + lifetime)) return null;

  return { id: product.id, title, variant, gtin,
    search: ` ${normalizeProductSearch([title, variant, gtin, aliases].filter(Boolean).join(" "))} `,
    listing, evidence, source: source.href, target, image, observed, expires, previous, used, row };
}

// The authenticated importer supplies offers from a partner's authorized API or feed.
// A retailer listing ID identifies a specific variant and seller within that marketplace.
export async function recordComparisonQuotes(db, body) {
  const { marketplace, quotes } = body;
  if (!MARKETS.includes(marketplace) || !Array.isArray(quotes) || !quotes.length || quotes.length > 40) {
    return { status: 400, data: { error: "Informe a loja e de 1 a 40 ofertas verificadas." } };
  }
  const market = (await marketplaceState(db)).get(marketplace);
  if (!market?.active) return { status: 409, data: { error: "A fonte autorizada dessa loja está pendente." } };
  const now = Date.now();
  const rows = quotes.map(row => validateQuote(row, marketplace, market.storefront, now));
  const invalid = rows.findIndex(row => row === null);
  if (invalid !== -1) return { status: 422, data: { error: "Confira a variante, o preço, a validade e os links da oferta.", row: invalid + 1 } };

  const statements = rows.flatMap(offer => [
    db.prepare(`
      INSERT INTO comparison_products (id, title, variant, gtin, search_text)
      SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (
        SELECT 1 FROM comparison_products WHERE gtin = ? AND id <> ?
      )
      ON CONFLICT(id) DO UPDATE SET search_text = excluded.search_text
      WHERE comparison_products.title = excluded.title
        AND comparison_products.variant = excluded.variant AND comparison_products.gtin IS excluded.gtin
    `).bind(offer.id, offer.title, offer.variant, offer.gtin, offer.search, offer.gtin, offer.id),
    db.prepare(`
      INSERT INTO comparison_offers (marketplace, listing_id, product_id, price_cents, previous_price_cents, used_price_cents,
        payment, available, source_url, affiliate_url, affiliate_reference, image_url, observed_ms, expires_ms)
      SELECT ?, ?, id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM comparison_products
      WHERE id = ? AND title = ? AND variant = ? AND gtin IS ?
        AND NOT EXISTS (
          SELECT 1 FROM comparison_offers existing
          WHERE existing.marketplace = ? AND existing.listing_id = ? AND existing.product_id <> comparison_products.id
        )
      ON CONFLICT(marketplace, listing_id, payment) DO UPDATE SET
        price_cents = excluded.price_cents, previous_price_cents = excluded.previous_price_cents,
        used_price_cents = excluded.used_price_cents,
        available = excluded.available, source_url = excluded.source_url,
        affiliate_url = excluded.affiliate_url, affiliate_reference = excluded.affiliate_reference, catalog_offer_id = NULL,
        image_url = excluded.image_url, observed_ms = excluded.observed_ms, expires_ms = excluded.expires_ms
      WHERE comparison_offers.product_id = excluded.product_id AND excluded.observed_ms > comparison_offers.observed_ms
    `).bind(marketplace, offer.listing, offer.row.price_cents, offer.previous, offer.used, offer.row.payment, Number(offer.row.available),
      offer.source, offer.target, offer.evidence, offer.image, offer.observed, offer.expires, offer.id,
      offer.title, offer.variant, offer.gtin, marketplace, offer.listing),
  ]);
  const results = await db.batch(statements);
  const updated = results.filter((result, index) => index % 2 === 1 && result.meta.changes > 0).length;
  return { data: { received: rows.length, updated, unchanged: rows.length - updated } };
}

export function dropExpiredComparisonQuotes(db, now) {
  return db.prepare("DELETE FROM comparison_offers WHERE expires_ms <= ?").bind(now);
}
