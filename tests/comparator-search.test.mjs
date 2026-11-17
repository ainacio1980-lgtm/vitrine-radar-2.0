import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductSearch, productSearchTerms } from '../src/comparator_search.mjs';

test('normalização não depende de maiúsculas e acentos', () => {
  assert.equal(normalizeProductSearch('Câmera'), normalizeProductSearch('CAMERA'));
});
test('normalização é determinística', () => {
  const query = 'Poco 8 GB 256 GB';
  assert.equal(normalizeProductSearch(query), normalizeProductSearch(query));
});

function matchesTitle(title, query) {
  const terms = productSearchTerms(query);
  return Boolean(terms && terms.prefixes.every(prefix =>
    (' ' + normalizeProductSearch(title) + ' ').includes(prefix)));
}

test('modelo, cor, memória e armazenamento devem corresponder exatamente', () => {
  const requested = 'Poco X8 Pro 8 GB/256 GB preto';
  assert.equal(matchesTitle('POCO X8 PRO preto 8GB 256GB', requested), true);
  for (const candidate of [
    'POCO X80 Pro 8GB 256GB preto',
    'Poco X8 Pro 12GB 256GB preto',
    'Poco X8 Pro 8GB 128GB preto',
    'Poco X8 Pro 8GB 256GB branco',
  ]) {
    assert.equal(matchesTitle(candidate, requested), false, candidate);
  }
});

test('prefixo parcial de nome continua permitindo digitação progressiva', () => {
  assert.equal(matchesTitle('Poco X8 Pro 8GB 256GB Preto', 'poc x8 8gb'), true);
});

test('entrada vazia ou nula não gera exceção', () => {
  assert.equal(normalizeProductSearch(null), '');
  assert.equal(productSearchTerms(''), null);
});
