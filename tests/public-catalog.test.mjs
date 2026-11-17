import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCatalog } from '../scripts/check-public-catalog.mjs';

const offer = (id, changes = {}) => ({
  id, title: 'Produto exemplo ' + id, category: 'Eletronicos',
  merchant: 'Magalu', price_cents: 12345,
  image_url: 'https://a-static.mlcdn.com.br/a.jpg',
  url: 'https://www.magazineluiza.com.br/p/123',
  ...changes,
});
const responder = pages => async url => {
  const offset = Number(new URL(url).searchParams.get('offset') || 0);
  const payload = pages[offset];
  return payload
    ? { ok: true, json: async () => payload }
    : { ok: false, status: 404 };
};

test('valida paginas sequenciais, imagem, preco, loja e link HTTPS', async () => {
  const pages = {
    0: { offers: [offer(1)], count: 1, next_offset: 1 },
    1: { offers: [offer(2)], count: 1, next_offset: null },
  };
  const report = await checkCatalog('https://vitrine.example', responder(pages));
  assert.equal(report.offers, 2);
  assert.equal(report.pages, 2);
});

test('rejeita cadastro publicado incompleto', async () => {
  for (const bad of [
    { image_url: null }, { price_cents: 0 }, { merchant: '' },
    { url: 'http://loja.example/item' }, { title: 'Produto \uFFFD ruim' },
  ]) {
    const pages = { 0: { offers: [offer(1, bad)], count: 1, next_offset: null } };
    await assert.rejects(checkCatalog('https://vitrine.example', responder(pages)));
  }
});

test('rejeita ofertas duplicadas e paginação inconsistente', async () => {
  const pages = {
    0: { offers: [offer(1)], count: 1, next_offset: 1 },
    1: { offers: [offer(1)], count: 1, next_offset: null },
  };
  await assert.rejects(checkCatalog('https://vitrine.example', responder(pages)), /duplicado/);
  await assert.rejects(checkCatalog('https://vitrine.example',
    responder({ 0: { offers: [offer(1)], count: 1, next_offset: 9 } })), /Paginacao/);
});
