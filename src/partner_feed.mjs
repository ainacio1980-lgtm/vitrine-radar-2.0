import { affiliateDestinationForMarketplace } from "./catalog.mjs";
import { safeProductImageUrl } from "./product_images.mjs";

// Imported partner data is *only* a private review candidate. Even valid shape
// never proves license, live price, stock, correct SKU or affiliate commission.
export const PARTNER_EXPORT_LIMIT = 500;
export const PARTNER_EXPORT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const supportedMerchants = new Set(["Magalu", "Mercado Livre", "Shopee", "Amazon"]);
const partnerSourceHosts = {
  Magalu: ["www.magazinevoce.com.br", "magazinevoce.com.br"],
  "Mercado Livre": ["www.mercadolivre.com.br", "mercadolivre.com.br"],
  Shopee: ["affiliate.shopee.com.br", "shopee.com.br", "www.shopee.com.br"],
  Amazon: ["associados.amazon.com.br"],
};
function validSourceReference(merchant, value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      partnerSourceHosts[merchant]?.includes(url.hostname);
  } catch {
    return false;
  }
}
const clean = (value, max) => typeof value === "string"
  ? value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
  : "";

const quoteCsv = value => {
  const text = String(value ?? "");
  return /[;"\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
};

export function preparePartnerExport(document, options = {}) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("Exportacao de parceiro deve ser um objeto JSON.");
  }
  const { merchant, source_type, source_reference, items } = document;
  if (!supportedMerchants.has(merchant) || source_type !== "official_partner_export" ||
      !validSourceReference(merchant, source_reference)) {
    throw new Error("Informe parceiro, origem oficial declarada e referencia HTTPS.");
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > PARTNER_EXPORT_LIMIT) {
    throw new Error("O arquivo deve conter de 1 a 500 ofertas reais.");
  }
  const now = Number(options.now ?? Date.now());
  if (!Number.isFinite(now)) throw new Error("Horario invalido.");
  const existing = new Set();
  for (const link of options.existingUrls ?? []) {
    if (typeof link === "string") existing.add(link.trim());
  }

  const accepted = [];
  const rejected = [];
  const duplicates = [];
  const seen = new Set();
  const seenSkus = new Set();

  for (let index = 0; index < items.length; index++) {
    const offer = items[index];
    const line = index + 1;
    const fail = reason => rejected.push({ line, reason });
    if (!offer || typeof offer !== "object" || Array.isArray(offer)) {
      fail("Produto invalido."); continue;
    }
    const title = clean(offer.title, 160);
    const category = clean(offer.category, 80);
    const sku = clean(offer.partner_sku, 120);
    if (!title || !category || !sku) {
      fail("Exige titulo, categoria e SKU ou identificador do parceiro."); continue;
    }
    if (typeof offer.title !== "string" || offer.title.trim().length > 160 ||
        typeof offer.category !== "string" || offer.category.trim().length > 80 ||
        typeof offer.partner_sku !== "string" || offer.partner_sku.trim().length > 120) {
      fail("Titulo, categoria ou SKU excede limite."); continue;
    }
    if (!Number.isSafeInteger(offer.price_cents) || offer.price_cents <= 0) {
      fail("Preco positivo em centavos obrigatorio."); continue;
    }
    if (offer.available !== true) {
      fail("Disponibilidade do SKU nao confirmada."); continue;
    }
    const checked = typeof offer.checked_at === "string" ? Date.parse(offer.checked_at) : NaN;
    if (!Number.isFinite(checked) || checked > now + 5 * 60 * 1000 ||
        now - checked > PARTNER_EXPORT_MAX_AGE_MS) {
      fail("Verificacao de preco e disponibilidade ausente ou antiga."); continue;
    }
    const image = safeProductImageUrl(offer.image_url);
    if (!image) {
      fail("Foto HTTPS de dominio de imagens permitido obrigatoria."); continue;
    }
    let affiliate;
    try {
      affiliate = affiliateDestinationForMarketplace(merchant, offer.affiliate_url).href;
    } catch {
      fail("Formato de afiliado nao corresponde ao marketplace."); continue;
    }
    if (seen.has(affiliate) || existing.has(affiliate) || seenSkus.has(sku)) {
      duplicates.push({ line, reason: "Link duplicado no arquivo ou no catalogo existente." });
      continue;
    }
    seen.add(affiliate);
    seenSkus.add(sku);
    accepted.push({
      title, category, merchant, price_cents: offer.price_cents,
      url: affiliate, image_url: image,
      partner_sku: sku, checked_at: new Date(checked).toISOString(),
    });
  }

  // The existing admin CSV importer always stores 'pending'; it does not approve.
  const columns = ["titulo", "categoria", "loja", "preco", "url", "foto"];
  const csv = [
    columns.join(";"),
    ...accepted.map(item => [
      item.title, item.category, item.merchant,
      (item.price_cents / 100).toFixed(2).replace(".", ","),
      item.url, item.image_url,
    ].map(quoteCsv).join(";")),
  ].join("\r\n") + "\r\n";

  return {
    csv,
    accepted,
    report: {
      merchant, source_type, source_reference: clean(source_reference, 2048),
      received: items.length, accepted: accepted.length, rejected: rejected.length,
      duplicates: duplicates.length, rejected_rows: rejected, duplicate_rows: duplicates,
      accepted_candidates: accepted.map(({ partner_sku, checked_at, url }) => ({ partner_sku, checked_at, url })),
      safe_to_publish_automatically: false,
      note: "CSV para importacao administrativa PENDENTE. Confirmar fonte autorizada, SKU, imagem acessivel, preco, estoque e atribuicao da comissao antes de aprovar.",
    },
  };
}
