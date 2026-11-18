import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductSearch, productSearchTerms } from '../src/comparator_search.mjs';

test('cores grey e gray correspondem a cinza nos produtos brasileiros', () => {
  assert.equal(normalizeProductSearch('Poco X8 256GB Grey'), 'poco x8 256gb cinza');
  assert.equal(normalizeProductSearch('Poco X8 256GB Gray'), 'poco x8 256gb cinza');
  assert.equal(normalizeProductSearch('Poco X8 256GB Cinza'), 'poco x8 256gb cinza');
});
test('silver, gold e golden preservam equivalencias claras de cor', () => {
  assert.equal(normalizeProductSearch('Smartwatch Silver'), 'smartwatch prata');
  assert.equal(normalizeProductSearch('Fone Gold'), 'fone dourado');
  assert.equal(normalizeProductSearch('Fone Golden'), 'fone dourado');
});
test('nao confunde GB, modelo, cores ja suportadas ou match de capacidade', () => {
  assert.equal(normalizeProductSearch('Poco X8 Pro 8GB/256GB Preto'), 'poco x8 pro 8gb 256gb preto');
  const terms=productSearchTerms('Poco X8 8GB Grey');
  assert.deepEqual(terms.exact, [' poco ', ' x8 ', ' 8gb ', ' cinza ']);
  assert.equal(normalizeProductSearch('Silverado'), 'silverado');
});
