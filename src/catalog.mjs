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

export async function listCatalog(db, query) {
  const filter = query.get("status");
  const page = Number(query.get("page") ?? 1);
  if ((filter && !statuses.includes(filter)) || !Number.isSafeInteger(page) || page < 1 || page > 100000) {
    return { error: "Filtro ou página inválida.", status: 400 };
  }

  const offset = (page - 1) * pageSize;
  const fields = "id, title, category, merchant, price_cents, status, url, updated_at";
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
  let link;
  try {
    if (typeof input.url !== "string" || input.url.length > 2048) throw Error();
    link = offerDestination(input.url.trim()).href;
    if (link.length > 2048) throw Error();
  } catch {
    return { error: "Informe um link HTTPS válido para a oferta.", status: 400 };
  }
  const keys = ["title", "category", "merchant", "price_cents", "url", "status"];
  const prior = input.previous;
  if (!prior || typeof prior !== "object" || Array.isArray(prior)) {
    return { error: "Recarregue o catálogo antes de editar.", status: 400 };
  }
  const current = await db.prepare("SELECT id, title, category, merchant, price_cents, url, status FROM offers WHERE id = ?").bind(id).first();
  if (!current) return { error: "Oferta não encontrada.", status: 404 };
  if (keys.some(key => current[key] !== prior[key])) {
    return { error: "A oferta foi alterada. Atualize o catálogo e tente novamente.", status: 409 };
  }
  if (title === current.title && category === current.category && merchant === current.merchant &&
      input.price_cents === current.price_cents && link === current.url) {
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
  return { data: { status: "pending", updated: true } };
}

export async function changeOfferStatus(db, actor, id, input) {
  const previous = input.previous_status;
  const next = input.status;
  if (!statuses.includes(previous) || transitions[previous] !== next) {
    return { error: "Essa alteração de status não é permitida.", status: 400 };
  }

  const offer = await db.prepare("SELECT url, status FROM offers WHERE id = ?").bind(id).first();
  if (!offer) return { error: "Oferta não encontrada.", status: 404 };
  if (offer.status !== previous) return { error: "O status mudou. Confira o catálogo e tente novamente.", status: 409 };
  if (next === "approved") {
    try {
      offerDestination(offer.url);
    } catch {
      return { error: "A oferta precisa de um link HTTPS válido para ser aprovada.", status: 422 };
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
