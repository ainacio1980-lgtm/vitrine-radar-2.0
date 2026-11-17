import { safeProductImageUrl } from "./product_images.mjs";

const pageSize = 50;
const statuses = ["pending", "approved", "paused"];
const transitions = { pending: "approved", approved: "paused", paused: "approved" };

export function offerDestination(value) {
  const destination = new URL(value);
  if (destination.protocol !== "https:" || destination.username || destination.password || !destination.hostname.includes(".")) {
    throw new Error("Destino inválido");
  }
  return destination;
}

// Confere a estrutura de um link de afiliado; não comprova comissão nem preço.
export function affiliateDestinationForMarketplace(merchant, value) {
  const url = offerDestination(value);
  if (url.port || url.hash) throw new Error("Destino de afiliado inválido");
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  let valid = false;
  switch (merchant) {
    case "Magalu":
      valid = host === "www.magazinevoce.com.br" &&
        /^\/magazinevitrineradar\/[^/]+\/p\/[a-z0-9]+\//i.test(path);
      break;
    case "Mercado Livre":
      valid = host === "meli.la" && /^\/[A-Za-z0-9]{5,20}\/?$/.test(path);
      break;
    case "Amazon":
      valid = (host === "www.amazon.com.br" || host === "amazon.com.br") &&
        Boolean(url.searchParams.get("tag")?.trim()) &&
        (/^\/dp\/[A-Za-z0-9]{10}/.test(path) || /^\/gp\/product\/[A-Za-z0-9]{10}/.test(path));
      break;
    case "Shopee":
      valid = host === "s.shopee.com.br" && /^\/[A-Za-z0-9]+\/?$/.test(path);
      break;
    default:
      valid = false;
  }
  if (!valid) throw new Error("Link não corresponde ao formato de afiliado da loja");
  return url;
}

export async function listCatalog(db, query) {
  const filter = query.get("status");
  const page = Number(query.get("page") ?? 1);
  if ((filter && !statuses.includes(filter)) || !Number.isSafeInteger(page) || page < 1 || page > 100000) {
    return { error: "Filtro ou página inválida.", status: 400 };
  }

  const offset = (page - 1) * pageSize;
  const fields = "id, title, category, merchant, price_cents, status, url, updated_at, (SELECT image_url FROM product_images WHERE offer_id = offers.id ORDER BY sort_order, id LIMIT 1) AS image_url";
  const order = "ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?";
  const statement = filter
    ? db.prepare(`SELECT ${fields} FROM offers WHERE status = ? ${order}`).bind(filter, pageSize + 1, offset)
    : db.prepare(`SELECT ${fields} FROM offers ${order}`).bind(pageSize + 1, offset);
  const { results } = await statement.all();
  return { data: { offers: results.slice(0, pageSize), page, has_more: results.length > pageSize, read_only: false } };
}

export async function createOffer(db, actor, input) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const merchant = typeof input.merchant === "string" ? input.merchant.trim() : "";
  if (!title || title.length > 160 || !category || category.length > 80 || !merchant || merchant.length > 80) {
    return { error: "Preencha o produto, a categoria e a loja dentro dos limites do formulário.", status: 400 };
  }
  if (!Number.isSafeInteger(input.price_cents) || input.price_cents < 0) {
    return { error: "Informe um preço válido em reais.", status: 400 };
  }

  const providedImage = typeof input.image_url === "string" ? input.image_url.trim() : "";
  const imageUrl = providedImage ? safeProductImageUrl(providedImage) : null;
  if (providedImage && !imageUrl) {
    return { error: "Informe uma foto HTTPS de uma fonte confiável.", status: 400 };
  }

  let link;
  try {
    if (typeof input.url !== "string" || input.url.length > 2048) throw new Error("Link inválido");
    link = offerDestination(input.url.trim()).href;
    if (link.length > 2048) throw new Error("Link inválido");
  } catch {
    return { error: "Informe um link HTTPS válido para a oferta.", status: 400 };
  }

  const [result] = await db.batch([
    db.prepare(`
      INSERT INTO offers (title, category, merchant, price_cents, url, status)
      SELECT ?, ?, ?, ?, ?, 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM offers WHERE url = ?)
    `).bind(title, category, merchant, input.price_cents, link, link),
    db.prepare(`
      INSERT INTO admin_events (actor_email, event_type, offer_id, details)
      SELECT ?, 'offer_created', last_insert_rowid(), 'pending' WHERE changes() = 1
    `).bind(actor),
    db.prepare(`
      INSERT INTO product_images (offer_id, image_url, sort_order)
      SELECT o.id, ?, 0 FROM offers o
      WHERE o.url = ? AND ? <> '' AND changes() = 1
    `).bind(imageUrl || "", link, imageUrl || ""),
  ]);
  if (result.meta.changes === 0) {
    return { error: "Já existe uma oferta com esse link. Confira o catálogo.", status: 409 };
  }
  return { data: { status: "pending" }, status: 201 };
}



export async function importOffers(db, actor, input) {
  if (!Array.isArray(input.rows) || input.rows.length < 1 || input.rows.length > 50) {
    return { error: "Envie de 1 a 50 ofertas por importação.", status: 400 };
  }
  if (!input.rows.every(row => row && typeof row === "object" && !Array.isArray(row))) {
    return { error: "Há linhas inválidas na importação.", status: 400 };
  }
  const created = await db.prepare(
    "INSERT INTO offer_import_batches (source, status, total_rows) VALUES ('csv_manual', 'pending', ?)"
  ).bind(input.rows.length).run();
  const batchId = created.meta.last_row_id;
  let valid = 0;
  let rejected = 0;
  const errors = [];
  for (let index = 0; index < input.rows.length; index++) {
    const row = input.rows[index];
    const outcome = await createOffer(db, actor, row);
    const accepted = !outcome.error;
    if (accepted) valid++;
    else {
      rejected++;
      errors.push({ line: index + 2, error: outcome.error });
    }
    const safe = (value, max) => (typeof value === "string" ? value : "").slice(0, max);
    await db.prepare("INSERT INTO offer_import_rows (batch_id, title, category, merchant, price_cents, url, validation_status, validation_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(batchId, safe(row.title, 160), safe(row.category, 80), safe(row.merchant, 80),
            Number.isSafeInteger(row.price_cents) && row.price_cents >= 0 ? row.price_cents : 0,
            safe(row.url, 2048), accepted ? "valid" : "invalid", accepted ? null : outcome.error).run();
  }
  await db.batch([
    db.prepare("UPDATE offer_import_batches SET status = 'applied', valid_rows = ?, rejected_rows = ? WHERE id = ?")
      .bind(valid, rejected, batchId),
    db.prepare("INSERT INTO admin_events (actor_email, event_type, details) VALUES (?, 'offer_bulk_import', ?)")
      .bind(actor, JSON.stringify({ batch_id: batchId, total: input.rows.length, imported: valid, rejected }))
  ]);
  return { data: { batch_id: batchId, total: input.rows.length, imported: valid, rejected, errors } };
}

export async function updateOffer(db, actor, id, input) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const merchant = typeof input.merchant === "string" ? input.merchant.trim() : "";
  if (!title || title.length > 160 || !category || category.length > 80 || !merchant || merchant.length > 80) {
    return { error: "Preencha produto, categoria e loja dentro dos limites.", status: 400 };
  }
  if (!Number.isSafeInteger(input.price_cents) || input.price_cents < 0) {
    return { error: "Informe um preço válido em reais.", status: 400 };
  }
  const providedImage = typeof input.image_url === "string" ? input.image_url.trim() : "";
  const imageUrl = providedImage ? safeProductImageUrl(providedImage) : null;
  if (providedImage && !imageUrl) {
    return { error: "Informe uma foto HTTPS de uma fonte confiável.", status: 400 };
  }

  let link;
  try {
    if (typeof input.url !== "string" || input.url.length > 2048) throw Error();
    link = offerDestination(input.url.trim()).href;
    if (link.length > 2048) throw Error();
  } catch {
    return { error: "Informe um link HTTPS válido para a oferta.", status: 400 };
  }
  const keys = ["title", "category", "merchant", "price_cents", "url", "status", "image_url"];
  const prior = input.previous;
  if (!prior || typeof prior !== "object" || Array.isArray(prior)) {
    return { error: "Recarregue o catálogo antes de editar.", status: 400 };
  }
  const current = await db.prepare("SELECT id, title, category, merchant, price_cents, url, status, (SELECT image_url FROM product_images WHERE offer_id = offers.id ORDER BY sort_order, id LIMIT 1) AS image_url FROM offers WHERE id = ?").bind(id).first();
  if (!current) return { error: "Oferta não encontrada.", status: 404 };
  if (keys.some(key => current[key] !== prior[key])) {
    return { error: "A oferta foi alterada. Atualize o catálogo e tente novamente.", status: 409 };
  }
  const changedImage = imageUrl !== null && imageUrl !== current.image_url;
  if (title === current.title && category === current.category && merchant === current.merchant &&
      input.price_cents === current.price_cents && link === current.url && !changedImage) {
    return { data: { status: current.status, unchanged: true } };
  }
  const duplicate = await db.prepare("SELECT id FROM offers WHERE url = ? AND id <> ?").bind(link, id).first();
  if (duplicate) return { error: "Esse link já está cadastrado em outra oferta.", status: 409 };

  const changedFields = ["title", "category", "merchant", "price_cents", "url"].filter(key =>
    ({title, category, merchant, price_cents: input.price_cents, url: link})[key] !== current[key]
  );
  const [result] = await db.batch([
    db.prepare("UPDATE offers SET title = ?, category = ?, merchant = ?, price_cents = ?, url = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND title = ? AND category = ? AND merchant = ? AND price_cents = ? AND url = ? AND status = ?")
      .bind(title, category, merchant, input.price_cents, link, id, current.title, current.category, current.merchant, current.price_cents, current.url, current.status),
    db.prepare("INSERT INTO admin_events (actor_email, event_type, offer_id, details) SELECT ?, 'offer_updated', ?, ? WHERE changes() = 1")
      .bind(actor, id, JSON.stringify({ changed_fields: changedFields, from_status: current.status, to_status: "pending" }))
  ]);
  if (result.meta.changes !== 1) {
    return { error: "A oferta mudou durante a edição. Atualize o catálogo.", status: 409 };
  }
  if (current.price_cents !== input.price_cents) {
    await db.prepare("INSERT INTO offer_price_history (offer_id, price_cents) VALUES (?, ?)").bind(id, input.price_cents).run();
  }
  if (changedImage) {
    const imageUpdate = await db.prepare(
      "UPDATE product_images SET image_url = ? WHERE id = (SELECT id FROM product_images WHERE offer_id = ? ORDER BY sort_order, id LIMIT 1)"
    ).bind(imageUrl, id).run();
    if (imageUpdate.meta.changes === 0) {
      await db.prepare("INSERT INTO product_images (offer_id, image_url, sort_order) VALUES (?, ?, 0)")
        .bind(id, imageUrl).run();
    }
  }
  return { data: { status: "pending", updated: true } };
}

export async function changeOfferStatus(db, actor, id, input) {
  const previous = input.previous_status;
  const next = input.status;
  if (!statuses.includes(previous) || transitions[previous] !== next) {
    return { error: "Essa alteração de status não é permitida.", status: 400 };
  }

  const offer = await db.prepare("SELECT url, status, price_cents, merchant FROM offers WHERE id = ?").bind(id).first();
  if (!offer) return { error: "Oferta não encontrada.", status: 404 };
  if (offer.status !== previous) return { error: "O status mudou. Confira o catálogo e tente novamente.", status: 409 };
  if (next === "approved") {
    try {
      affiliateDestinationForMarketplace(offer.merchant, offer.url);
    } catch {
      return { error: "A oferta precisa do link oficial de afiliado da loja antes da publicação.", status: 422 };
    }
    if (!Number.isSafeInteger(offer.price_cents) || offer.price_cents <= 0) {
      return { error: "Cadastre um preço válido antes de publicar a oferta.", status: 422 };
    }
    if (!["Magalu", "Amazon", "Mercado Livre", "Shopee"].includes(offer.merchant)) {
      return { error: "Informe uma loja parceira válida antes de publicar.", status: 422 };
    }
    const picture = await db.prepare(
      "SELECT image_url FROM product_images WHERE offer_id = ? ORDER BY sort_order, id LIMIT 1"
    ).bind(id).first();
    if (!picture || !safeProductImageUrl(picture.image_url)) {
      return { error: "Cadastre uma foto HTTPS válida antes de publicar a oferta.", status: 422 };
    }
  }

  const [result] = await db.batch([
    db.prepare(`
      UPDATE offers SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = ? AND url = ?
    `).bind(next, id, previous, offer.url),
    db.prepare(`
      INSERT INTO admin_events (actor_email, event_type, offer_id, details)
      SELECT ?, 'offer_status_changed', ?, ? WHERE changes() = 1
    `).bind(actor, id, JSON.stringify({ from: previous, to: next })),
  ]);
  if (result.meta.changes === 0) {
    return { error: "A oferta mudou. Confira o catálogo e tente novamente.", status: 409 };
  }
  return { data: { status: next } };
}

const PRODUCT_TARGET = 500;

// Counts read from D1; a missing-image count never implies links or prices are verified.
export async function catalogSummary(db) {
  const [{ results }, missing] = await Promise.all([
    db.prepare("SELECT status, COUNT(*) AS total FROM offers GROUP BY status").all(),
    db.prepare(
      "SELECT COUNT(*) AS total FROM offers o WHERE o.status = 'pending' AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.offer_id = o.id)"
    ).first(),
  ]);
  const totals = { pending: 0, approved: 0, paused: 0 };
  for (const row of results) {
    if (Object.hasOwn(totals, row.status)) totals[row.status] = Number(row.total) || 0;
  }
  return {
    total: totals.pending + totals.approved + totals.paused,
    ...totals,
    target: PRODUCT_TARGET,
    remaining: Math.max(0, PRODUCT_TARGET - totals.approved),
    pending_without_photo: Number(missing?.total) || 0,
  };
}
