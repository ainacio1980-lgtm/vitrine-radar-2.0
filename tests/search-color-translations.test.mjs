import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductSearch, productSearchTerms } from '../src/comparator_search.mjs';

test('cores inglesas basicas equivalem as cores portuguesas', () => {
  for (const [english, portuguese] of [
    ['Blue', 'azul'], ['Green', 'verde'], ['Red', 'vermelho'], ['Pink', 'rosa']
  ]) {
    assert.equal(normalizeProductSearch('Fone ' + english), 'fone ' + portuguese);
    assert.equal(normalizeProductSearch('Fone ' + portuguese), 'fone ' + portuguese);
  }
});

test('preserva nomes de modelos e correspondencia exata de memoria/cor', () => {
  assert.equal(normalizeProductSearch('Redmi Note 13 Pro 8 GB/256GB Red'), 'redmi note 13 pro 8gb 256gb vermelho');
  assert.equal(normalizeProductSearch('Bluebird 256GB'), 'bluebird 256gb');
  assert.equal(normalizeProductSearch('Greenhouse Pro 16GB'), 'greenhouse pro 16gb');
  const terms = productSearchTerms('Redmi Note 13 Pro 8GB/256GB Red');
  assert.ok(terms.exact.includes(' 8gb '));
  assert.ok(terms.exact.includes(' 256gb '));
  assert.ok(terms.exact.includes(' vermelho '));
  assert.ok(terms.prefixes.includes(' vermelho '));
});
