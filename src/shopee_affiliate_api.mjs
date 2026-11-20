// Shopee Affiliate Open API adapter. No database writes, no product publication.
// Credentials must be injected as Cloudflare Worker secrets, never stored in Git.
export const SHOPEE_AFFILIATE_API_URL = "https://open-api.affiliate.shopee.com.br/graphql";

const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");

function requiredCredentials({ appId, secret } = {}) {
  if (typeof appId !== "string" || !/^[A-Za-z0-9_-]{3,80}$/.test(appId) ||
      typeof secret !== "string" || !secret.trim() || secret.length > 2048) {
    throw new Error("Credenciais da API Shopee nao configuradas.");
  }
}

function validShopeeProductUrl(value) {
  if (typeof value !== "string" || value.length > 2048) throw new Error("URL Shopee invalida.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash ||
      !["shopee.com.br", "www.shopee.com.br"].includes(url.hostname.toLowerCase()) ||
      url.pathname === "/") throw new Error("URL de produto Shopee invalida.");
  return url.href;
}

function validTrackingIds(value) {
  if (!Array.isArray(value) || value.length > 5 ||
      !value.every(id => typeof id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(id))) {
    throw new Error("SubIds invalidos.");
  }
  return value;
}

export async function shopeeGraphql(credentials, query, options = {}) {
  requiredCredentials(credentials);
  if (typeof query !== "string" || !query.trim() || query.length > 12000) {
    throw new Error("Consulta GraphQL invalida.");
  }
  const timestamp = Math.floor((options.now ? options.now() : Date.now()) / 1000);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new Error("Relogio invalido.");
  const payload = JSON.stringify({ query });
  const content = credentials.appId + timestamp + payload + credentials.secret;
  const hash = await (options.cryptoImpl || crypto).subtle.digest("SHA-256", encoder.encode(content));
  const signature = hex(new Uint8Array(hash));
  const request = options.fetchImpl || fetch;
  const response = await request(SHOPEE_AFFILIATE_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "SHA256 Credential=" + credentials.appId +
        ", Timestamp=" + timestamp + ", Signature=" + signature,
    },
    body: payload,
  });
  // Do not propagate raw upstream error messages or request headers into UI/logs.
  if (!response.ok) throw new Error("Falha HTTP na API Shopee (" + response.status + ").");
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Resposta JSON invalida da API Shopee.");
  }
  if (!result || typeof result !== "object" || (Array.isArray(result.errors) && result.errors.length)) {
    throw new Error("Consulta rejeitada pela API Shopee; verificar permissao, assinatura e parametros.");
  }
  if (!result.data || typeof result.data !== "object") throw new Error("API Shopee nao retornou dados.");
  return result.data;
}

export async function previewShopeeProducts(credentials, params = {}, options = {}) {
  const keyword = typeof params.keyword === "string" ? params.keyword.trim() : "";
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  if (!keyword || keyword.length > 80 || !Number.isSafeInteger(page) || page < 1 || page > 3 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("Informe uma busca de ate 80 caracteres; paginas 1-3 e limite 1-20.");
  }
  const query = "{ productOfferV2(keyword: " + JSON.stringify(keyword) +
    ", page: " + page + ", limit: " + limit +
    ") { nodes { itemId shopId productName productLink offerLink imageUrl priceMin priceMax shopName } " +
    "pageInfo { page limit hasNextPage } } }";
  const data = await shopeeGraphql(credentials, query, options);
  const offers = data.productOfferV2;
  if (!offers || !Array.isArray(offers.nodes)) throw new Error("Formato de ofertas Shopee inesperado.");
  return {
    merchant: "Shopee",
    source_type: "shopee_open_api_preview",
    query: keyword,
    page,
    has_next_page: offers.pageInfo?.hasNextPage === true,
    candidates: offers.nodes.slice(0, limit).map(node => ({
      partner_sku: node?.shopId != null && node?.itemId != null
        ? String(node.shopId) + ":" + String(node.itemId) : null,
      title: typeof node?.productName === "string" ? node.productName : null,
      image_url: typeof node?.imageUrl === "string" ? node.imageUrl : null,
      product_url: typeof node?.productLink === "string" ? node.productLink : null,
      offered_affiliate_url: typeof node?.offerLink === "string" ? node.offerLink : null,
      price_min_raw: node?.priceMin ?? null,
      price_max_raw: node?.priceMax ?? null,
      shop_name: typeof node?.shopName === "string" ? node.shopName : null,
      requires_price_stock_image_and_link_validation: true,
      status: "review_only",
    })),
    published: 0,
    note: "Somente consulta. Confirmar preco em BRL, SKU, estoque, foto e atribuicao antes de importar ou aprovar.",
  };
}

export async function generateShopeeShortLink(credentials, productUrl, subIds = [], options = {}) {
  const originUrl = validShopeeProductUrl(productUrl);
  const ids = validTrackingIds(subIds);
  const query = "mutation { generateShortLink(input: { originUrl: " + JSON.stringify(originUrl) +
    ", subIds: " + JSON.stringify(ids) + " }) { shortLink } }";
  const data = await shopeeGraphql(credentials, query, options);
  const link = data.generateShortLink?.shortLink;
  if (typeof link !== "string") throw new Error("API Shopee nao retornou link.");
  const parsed = new URL(link);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || parsed.hash ||
      !["s.shopee.com.br", "shope.ee"].includes(parsed.hostname.toLowerCase())) {
    throw new Error("API Shopee retornou link de dominio nao autorizado.");
  }
  return parsed.href;
}
