export const productImageHosts = [
  "a-static.mlcdn.com.br",
  "http2.mlstatic.com",
  "down-br.img.susercontent.com",
  "m.media-amazon.com",
  "assets.tramontina.com.br",
  "cdn.awsli.com.br",
  "images.tcdn.com.br",
  "img.travessa.com.br",
  "sextante.com.br",
  "uk.amazfit.com",
  "images.kabum.com.br",
  "images1.kabum.com.br",
  "legobrasil.vtexassets.com",
  "www.stanley1913.com.br",
  "lojawap.vteximg.com.br",
  "assets.nintendo.com",
  "itblue-midia.inflexaodigital.com.br",
  "cdn.querolivro.com.br",
  "resources.sears.com.mx",
  "cdn.27.ua"
];

const allowedHosts = new Set(productImageHosts);

export const primaryProductImage = `(
  SELECT image_url FROM product_images
  WHERE offer_id = o.id
  ORDER BY sort_order, id
  LIMIT 1
) AS image_url`;

export function safeProductImageUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && !url.port &&
        allowedHosts.has(url.hostname)) {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}
