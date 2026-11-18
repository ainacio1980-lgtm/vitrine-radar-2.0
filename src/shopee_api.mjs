// Shopee Affiliate Open API client. Run only server-side; never expose credentials to browsers.
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";
const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");

export async function shopeeAuthorization({ appId, secret, body, timestamp = Math.floor(Date.now() / 1000) }) {
  if (!appId || !secret || !body || !Number.isSafeInteger(timestamp)) {
    throw new Error("Credenciais, payload e timestamp válidos são obrigatórios.");
  }
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(appId) + timestamp + body + secret));
  return `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${hex(digest)}`;
}

export async function shopeeGraphql({ appId, secret, query, variables = {}, fetchImpl = fetch, timestamp }) {
  if (typeof query !== "string" || !query.trim()) throw new Error("Query GraphQL obrigatória.");
  const body = JSON.stringify({ query, variables });
  const authorization = await shopeeAuthorization({ appId, secret, body, timestamp });
  const response = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", authorization },
    body,
  });
  if (!response.ok) throw new Error(`Shopee HTTP ${response.status}`);
  const json = await response.json();
  if (!json || typeof json !== "object" || json.errors?.length || !json.data) {
    const code = json?.errors?.[0]?.extensions?.code;
    throw new Error(`Shopee GraphQL falhou${code == null ? "" : ` (código ${code})`}`);
  }
  return json.data;
}

// Requires official account authorization. Returns link for private review,
// not an instruction to publish automatically.
export async function generateShopeeAffiliateLink(options, originUrl) {
  const url = new URL(originUrl);
  if (url.protocol !== "https:" || !["shopee.com.br", "www.shopee.com.br"].includes(url.hostname) ||
      url.username || url.password || url.port) {
    throw new Error("Origem deve ser uma URL HTTPS válida de produto Shopee Brasil.");
  }
  const query = "mutation GenerateShortLink($originUrl: String!) { generateShortLink(input: { originUrl: $originUrl }) { shortLink } }";
  const data = await shopeeGraphql({ ...options, query, variables: { originUrl: url.href } });
  const shortLink = data.generateShortLink?.shortLink;
  if (typeof shortLink !== "string" || !/^https:\/\/s\.shopee\.com\.br\//.test(shortLink)) {
    throw new Error("Resposta sem link de afiliado Shopee esperado.");
  }
  return { url: shortLink, status: "pending_review" };
}
