import { affiliateDestination } from "./comparator.mjs";
import { primaryProductImage, safeProductImageUrl } from "./product_images.mjs";

export async function dailyCuration(db) {
  const { results } = await db.prepare(`
    SELECT o.id, o.title, o.category, o.merchant, o.price_cents, o.price_terms, o.url,
      c.affiliate_url AS storefront, ${primaryProductImage},
      (SELECT source_url FROM offer_sources WHERE offer_id = o.id ORDER BY id DESC LIMIT 1) AS source_url,
      (SELECT strftime('%Y-%m-%dT%H:%M:%SZ', max(julianday(h.recorded_at)))
       FROM offer_price_history h WHERE h.offer_id = o.id AND h.price_cents = o.price_cents
         AND julianday(h.recorded_at) BETWEEN julianday('now','-1 day') AND julianday('now')) AS recorded_at
    FROM offers o JOIN partner_storefronts c ON c.marketplace = o.merchant AND c.status = 'active'
    WHERE o.status = 'approved' AND o.price_cents > 0 AND length(trim(o.price_terms)) > 0
      AND NOT EXISTS (SELECT 1 FROM offer_link_meta m WHERE m.offer_id = o.id AND m.kind = 'retailer_direct')
      AND coalesce((SELECT available FROM offer_availability_checks a
        WHERE a.offer_id = o.id ORDER BY a.checked_at DESC, a.id DESC LIMIT 1), 1) = 1
    ORDER BY recorded_at DESC, o.id DESC LIMIT 80
  `).all();

  const seen = new Set();
  const picks = [];
  for (const row of results) {
    if (!row.recorded_at) break;
    if (seen.has(row.category)) continue;
    const image = safeProductImageUrl(row.image_url);
    const link = affiliateDestination(row.merchant, row.source_url, row.url, row.storefront);
    if (!image || !link) continue;
    seen.add(row.category);
    picks.push({
      id: row.id, title: row.title, category: row.category, marketplace: row.merchant,
      image_url: image, price_cents: row.price_cents, price_terms: row.price_terms,
      checked_at: row.recorded_at,
      offer_url: "/go/" + row.id,
      reason: /^no Pix\b/i.test(row.price_terms)
        ? "Referência recente com preço no Pix"
        : "Referência recente com condições da oferta",
    });
    if (picks.length === 4) break;
  }
  return { picks };
}
