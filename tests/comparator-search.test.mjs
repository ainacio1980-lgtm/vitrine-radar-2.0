import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductSearch } from '../src/comparator_search.mjs';

test('normalização não depende de maiúsculas e acentos', () => {
  assert.equal(normalizeProductSearch('Câmera'), normalizeProductSearch('CAMERA'));
});
test('normalização é determinística', () => {
  const query = 'Poco 8 GB 256 GB';
  assert.equal(normalizeProductSearch(query), normalizeProductSearch(query));
});
