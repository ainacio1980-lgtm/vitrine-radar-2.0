import test from "node:test";
import assert from "node:assert/strict";
import { preparePartnerExport, PARTNER_EXPORT_LIMIT } from "../src/partner_feed.mjs";

const now = Date.parse("2026-11-17T20:00:00.000Z");
const base = {
  merchant: "Magalu",
  source_type: "official_partner_export",
  source_reference: "https://www.magazinevoce.com.br/",
  items: [{
    title: "Cafeteira 220V; com jarra", category: "Eletroportateis",
    partner_sku: "123456789", price_cents: 18990,
    affiliate_url: "https://www.magazinevoce.com.br/magazinevitrineradar/cafeteira/p/123456700/ed/cafe/",
    image_url: "https://a-static.mlcdn.com.br/cafeteira.jpg",
    available: true, checked_at: "2026-11-17T19:30:00.000Z",
  }],
};
const opts = { now };

test("exportacao oficial declarada gera somente CSV para pendentes, com foto, preco e URL valida", () => {
  const result = preparePartnerExport(base, opts);
  assert.equal(result.report.accepted, 1);
  assert.equal(result.report.safe_to_publish_automatically, false);
  assert.equal(result.accepted[0].partner_sku, "123456789");
  assert.match(result.csv, /^titulo;categoria;loja;preco;url;foto\r\n/);
  assert.match(result.csv, /"Cafeteira 220V; com jarra";Eletroportateis;Magalu;189,90;/);
  assert.doesNotMatch(result.csv, /approved/);
});

test("rejeita link comum, loja incorreta, foto ausente, preco sem validade, SKU inexistente", () => {
  const input = { ...base, items: [
    { ...base.items[0], affiliate_url: "https://www.magazineluiza.com.br/cafeteira" },
    { ...base.items[0], image_url: "https://evil.example/foto.jpg" },
    { ...base.items[0], price_cents: 0 },
    { ...base.items[0], available: false },
    { ...base.items[0], checked_at: "2026-11-14T12:00:00.000Z" },
    { ...base.items[0], partner_sku: "" },
  ] };
  const result = preparePartnerExport(input, opts);
  assert.equal(result.report.accepted, 0);
  assert.equal(result.report.rejected, 6);
  assert.deepEqual(result.csv, "titulo;categoria;loja;preco;url;foto\r\n");
});

test("deduplica links existentes e repetidos sem cadastrar produto ficticio", () => {
  const item = base.items[0];
  const r = preparePartnerExport({ ...base, items: [item, item] }, opts);
  assert.equal(r.report.accepted, 1);
  assert.equal(r.report.duplicates, 1);
  const existing = preparePartnerExport(base, {
    ...opts, existingUrls: [item.affiliate_url],
  });
  assert.equal(existing.report.accepted, 0);
  assert.equal(existing.report.duplicates, 1);
});

test("formatos declarados de Shopee e Mercado Livre geram arquivos separados", () => {
  const items = [
    ["Shopee", "https://s.shopee.com.br/3B8yO1QDhZ"],
    ["Mercado Livre", "https://meli.la/1E9h7AZ"],
  ];
  for (const [merchant, affiliate_url] of items) {
    const input = { ...base, merchant, items: [{ ...base.items[0], affiliate_url }] };
    const result = preparePartnerExport(input, opts);
    assert.equal(result.report.accepted, 1, merchant);
    assert.equal(result.accepted[0].merchant, merchant);
  }
});

test("limita 500 registros e exige origem oficial declarada sem autorizar publicacao", () => {
  assert.equal(PARTNER_EXPORT_LIMIT, 500);
  assert.throws(() => preparePartnerExport({ ...base, items: Array(501).fill(base.items[0]) }, opts), /500/);
  assert.throws(() => preparePartnerExport({ ...base, source_type: "scraped_html" }, opts), /origem oficial/);
  assert.throws(() => preparePartnerExport({ ...base, source_reference: "http://example.com" }, opts), /referencia HTTPS/);
  assert.throws(() => preparePartnerExport({ ...base, items: [] }, opts), /1 a 500/);
});
