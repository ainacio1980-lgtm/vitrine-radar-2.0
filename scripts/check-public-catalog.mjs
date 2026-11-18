// Read-only public catalog audit. Never tests retailer URLs or changes offers.
import { affiliateDestinationForMarketplace } from '../src/catalog.mjs';
import { safeProductImageUrl } from '../src/product_images.mjs';
export async function checkCatalog(origin, fetcher = fetch) {
  const base = new URL(origin);
  if (base.protocol !== 'https:') throw new Error('Catalogo requer HTTPS');
  const seen = new Set();
  const seenUrls = new Set();
  let offset = 0;
  let pages = 0;
  for (; pages < 100; pages++) {
    const endpoint = new URL('/api/offers', base);
    if (offset) endpoint.searchParams.set('offset', String(offset));
    const response = await fetcher(endpoint.href, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Catalogo indisponivel: HTTP ' + response.status);
    const json = await response.json();
    if (!json || !Array.isArray(json.offers) || json.count !== json.offers.length) {
      throw new Error('Resposta invalida no catalogo');
    }
    for (const offer of json.offers) {
      const id = offer?.id;
      if (!Number.isSafeInteger(Number(id)) || seen.has(String(id))) {
        throw new Error('ID invalido ou duplicado: ' + String(id).slice(0, 30));
      }
      seen.add(String(id));
      if (typeof offer.title !== 'string' || !offer.title.trim() || offer.title.includes('\uFFFD')) {
        throw new Error('Titulo ausente ou texto corrompido: ' + id);
      }
      if (!['Magalu', 'Amazon', 'Mercado Livre', 'Shopee'].includes(offer.merchant)) {
        throw new Error('Loja ausente/desconhecida: ' + id);
      }
      if (!Number.isSafeInteger(offer.price_cents) || offer.price_cents <= 0) {
        throw new Error('Preco ausente: ' + id);
      }
      if (!safeProductImageUrl(offer.image_url)) {
        throw new Error('Foto fora de dominio HTTPS autorizado: ' + id);
      }
      let affiliate;
      try {
        affiliate = affiliateDestinationForMarketplace(offer.merchant, offer.url);
      } catch {
        throw new Error('Link de afiliado invalido para a loja: ' + id);
      }
      if (seenUrls.has(affiliate.href)) throw new Error('Link afiliado duplicado: ' + id);
      seenUrls.add(affiliate.href);
    }
    if (json.next_offset === null) {
      if (!seen.size) throw new Error('Catalogo publico vazio');
      return { offers: seen.size, pages: pages + 1, host: base.host };
    }
    if (!Number.isSafeInteger(json.next_offset) || json.next_offset <= offset ||
        json.next_offset !== offset + json.offers.length) {
      throw new Error('Paginacao inconsistente');
    }
    offset = json.next_offset;
  }
  throw new Error('Catalogo excedeu limite de paginas');
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const urls = process.argv.slice(2);
  if (!urls.length) throw new Error('Informe URL de producao e homologacao');
  try {
    for (const url of urls) {
      const result = await checkCatalog(url);
      console.log(result.host + ': ' + result.offers + ' ofertas validadas em ' + result.pages + ' paginas');
    }
  } catch (error) {
    console.error('Auditoria publica falhou: ' + error.message);
    process.exitCode = 1;
  }
}
