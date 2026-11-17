import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/pages.mjs', import.meta.url), 'utf8');
const start = source.indexOf('const list = products.filter(product =>');
const end = source.indexOf('\n  );', start);
assert.ok(start >= 0 && end > start, 'Filtro real não encontrado');
const expression = source.slice(start + 'const list = products.filter(product =>'.length, end);
const offers = [
  {id: 101, title: 'Celular 256 GB', category: 'Celulares', merchant: 'Magalu', price_cents: 90000, image_url: 'https://example.org/a.jpg'},
  {id: 102, title: 'Celular 256 GB', category: 'Celulares', merchant: 'Amazon', price_cents: 92000, image_url: 'https://example.org/b.jpg'},
  {id: 103, title: 'Fone', category: 'Áudio', merchant: 'Shopee', price_cents: 10000, image_url: ''},
];

function runFilter(selectedOfferId, overrides = {}) {
  const elements = {
    q: {value: ''}, cat: {value: ''}, merchant: {value: ''},
    minPrice: {value: ''}, maxPrice: {value: ''},
    completeOnly: {checked: false},
    ...overrides,
  };
  const context = {
    products: offers, selectedOfferId, elements,
    query: elements.q.value.trim(), terms: null,
    category: elements.cat.value, merchant: elements.merchant.value,
    minimum: elements.minPrice.value === '' ? null : Number(elements.minPrice.value) * 100,
    maximum: elements.maxPrice.value === '' ? null : Number(elements.maxPrice.value) * 100,
    matchesSearch: () => false,
  };
  return vm.runInNewContext('products.filter(product =>' + expression + ')', context).map(p => p.id);
}

test('selecionar sugestão usa ID exato mesmo quando títulos coincidem', () => {
  assert.deepEqual(runFilter('102'), [102]);
  assert.deepEqual(runFilter(101), [101]);
});

test('sem seleção o filtro preserva todos os produtos', () => {
  assert.deepEqual(runFilter(null), [101, 102, 103]);
});

test('filtro por loja e preço opera no código real', () => {
  assert.deepEqual(runFilter(null, {merchant: {value:'Amazon'}}), [102]);
  assert.deepEqual(runFilter(null, {minPrice: {value:'500'}}), [101, 102]);
});

test('filtro de ofertas completas exclui itens sem imagem', () => {
  assert.deepEqual(runFilter(null, {completeOnly: {checked:true}}), [101, 102]);
});
