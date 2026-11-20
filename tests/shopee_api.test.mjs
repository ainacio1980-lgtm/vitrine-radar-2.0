import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { shopeeAuthorization, shopeeGraphql, generateShopeeAffiliateLink } from "../src/shopee_api.mjs";

test("authorization assina exatamente o corpo enviado", async () => {
  const body = JSON.stringify({ query: "{ test }", variables: {} });
  const auth = await shopeeAuthorization({ appId: "123", secret: "secret", body, timestamp: 1700000000 });
  const signature = createHash("sha256").update("1231700000000" + body + "secret").digest("hex");
  assert.equal(auth, `SHA256 Credential=123, Timestamp=1700000000, Signature=${signature}`);
});
test("graphql não perde dados e não expõe segredo no payload", async () => {
  const result = await shopeeGraphql({
    appId: "123", secret: "private", query: "{ test }", timestamp: 1700000000,
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://open-api.affiliate.shopee.com.br/graphql");
      assert.equal(init.method, "POST");
      assert.equal(JSON.parse(init.body).query, "{ test }");
      assert.ok(!init.body.includes("private"));
      return { ok: true, json: async () => ({ data: { test: true } }) };
    },
  });
  assert.deepEqual(result, { test: true });
});
test("GraphQL rejeita erros sem publicar", async () => {
  await assert.rejects(shopeeGraphql({
    appId: "123", secret: "private", query: "{ test }",
    fetchImpl: async () => ({ ok: true, json: async () => ({ errors: [{ extensions: { code: 10035 } }] }) }),
  }), /10035/);
});
test("rejeita URL de outro domínio", async () => {
  await assert.rejects(generateShopeeAffiliateLink({ appId: "123", secret: "private" }, "https://fake-shopee.example/"), /Shopee Brasil/);
});
test("link aprovado pela API permanece pendente de revisão", async () => {
  const result = await generateShopeeAffiliateLink({
    appId: "123", secret: "private",
    fetchImpl: async () => ({ ok: true, json: async () => ({ data: { generateShortLink: { shortLink: "https://s.shopee.com.br/example" } } }) }),
  }, "https://shopee.com.br/product/1/2");
  assert.deepEqual(result, { url: "https://s.shopee.com.br/example", status: "pending_review" });
});
