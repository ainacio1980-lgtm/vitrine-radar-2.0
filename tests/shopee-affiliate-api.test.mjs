import test from "node:test";
import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { shopeeGraphql, previewShopeeProducts, generateShopeeShortLink, SHOPEE_AFFILIATE_API_URL } from "../src/shopee_affiliate_api.mjs";

const credentials = { appId: "123456789", secret: "test-secret-do-not-use" };
const now = () => Date.parse("2026-11-18T12:00:00.000Z");
const options = (fetchImpl) => ({ fetchImpl, now, cryptoImpl: webcrypto });

test("assina o corpo exato com SHA256 sem enviar senha no corpo ou no header", async () => {
  const query = "{ productOfferV2 { pageInfo { page } } }";
  let called = 0;
  const data = await shopeeGraphql(credentials, query, options(async (endpoint, init) => {
    called++;
    assert.equal(endpoint, SHOPEE_AFFILIATE_API_URL);
    assert.equal(init.method, "POST");
    assert.equal(init.headers["content-type"], "application/json");
    const body = JSON.stringify({ query });
    assert.equal(init.body, body);
    const ts = Math.floor(now() / 1000);
    const digest = createHash("sha256").update(credentials.appId + ts + body + credentials.secret).digest("hex");
    assert.equal(init.headers.authorization, "SHA256 Credential=" + credentials.appId +
      ", Timestamp=" + ts + ", Signature=" + digest);
    assert.ok(!JSON.stringify(init).includes(credentials.secret));
    return { ok: true, json: async () => ({ data: { valid: true } }) };
  }));
  assert.equal(called, 1);
  assert.deepEqual(data, { valid: true });
});

test("bloqueia credenciais ausentes antes da consulta", async () => {
  let fetched = false;
  await assert.rejects(shopeeGraphql({}, "{ x }", options(async () => { fetched = true; })), /Credenciais/);
  assert.equal(fetched, false);
});

test("pre-visualizacao retorna apenas candidatos sem preco inventado ou publicacao", async () => {
  const response = await previewShopeeProducts(credentials, { keyword: "celular", page: 1, limit: 2 },
    options(async (_, init) => {
      assert.match(init.body, /productOfferV2/);
      assert.match(init.body, /celular/);
      return { ok: true, json: async () => ({ data: { productOfferV2: {
        nodes: [{ itemId: "987", shopId: "321", productName: "Produto de teste",
          priceMin: "99.90", priceMax: "119.90",
          imageUrl: "https://down-br.img.susercontent.com/file/exemplo",
          productLink: "https://shopee.com.br/item-i.321.987",
          offerLink: "https://s.shopee.com.br/example", shopName: "Loja" }],
        pageInfo: { page: 1, limit: 2, hasNextPage: false },
      } } }) };
    }));
  assert.equal(response.published, 0);
  assert.equal(response.candidates.length, 1);
  assert.equal(response.candidates[0].partner_sku, "321:987");
  assert.equal(response.candidates[0].price_min_raw, "99.90");
  assert.equal(response.candidates[0].requires_price_stock_image_and_link_validation, true);
  assert.equal(response.candidates[0].status, "review_only");
  assert.equal(Object.hasOwn(response.candidates[0], "price_cents"), false);
});

test("consulta rejeita parametros perigosos ou volumes exagerados", async () => {
  await assert.rejects(previewShopeeProducts(credentials, { keyword: "", limit: 10 }, options(() => {})), /busca/);
  await assert.rejects(previewShopeeProducts(credentials, { keyword: "x", limit: 501 }, options(() => {})), /limite/);
  await assert.rejects(previewShopeeProducts(credentials, { keyword: "x", page: 100 }, options(() => {})), /paginas/);
});

test("gera link de afiliado com dominio permitido, subIds e sem alterar catalogo", async () => {
  const url = await generateShopeeShortLink(credentials, "https://shopee.com.br/item-i.321.987",
    ["site", "vitrine_radar"], options(async (_, init) => {
      assert.match(init.body, /generateShortLink/);
      assert.match(init.body, /vitrine_radar/);
      return { ok: true, json: async () => ({ data: {
        generateShortLink: { shortLink: "https://s.shopee.com.br/3B8yO1QDhZ" },
      } }) };
    }));
  assert.equal(url, "https://s.shopee.com.br/3B8yO1QDhZ");
  await assert.rejects(generateShopeeShortLink(credentials, "https://evil.example/", [],
    options(() => {})), /URL de produto Shopee/);
  await assert.rejects(generateShopeeShortLink(credentials, "https://shopee.com.br/x", ["space id"],
    options(() => {})), /SubIds/);
});

test("rejeita link externo e erro GraphQL sem reproduzir mensagem remota", async () => {
  await assert.rejects(generateShopeeShortLink(credentials, "https://shopee.com.br/x", [],
    options(async () => ({ ok: true, json: async () => ({ data: {
      generateShortLink: { shortLink: "https://evil.example/" },
    } }) }))), /dominio nao autorizado/);
  await assert.rejects(shopeeGraphql(credentials, "{ x }",
    options(async () => ({ ok: true, json: async () => ({ errors: [{ message: "sensitive-remote-message" }] }) }))),
  error => !error.message.includes("sensitive-remote-message") && /rejeitada/.test(error.message));
});
