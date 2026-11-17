import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages.mjs', import.meta.url), 'utf8');

test('suggestion click selects offer and refreshes results', () => {
  assert.match(source, /item\.addEventListener\('click',selectOffer\)/);
  assert.match(source, /selectedOfferId=offer\.id;elements\.q\.value=offer\.title/);
  assert.match(source, /hideSuggestions\(\);render\(\)/);
});
test('suggestion selection resets conflicting filters', () => {
  for (const fragment of [
    "elements.cat.value=''",
    "elements.merchant.value=''",
    "elements.minPrice.value=''",
    "elements.maxPrice.value=''",
    "elements.completeOnly.checked=false"
  ]) assert.ok(source.includes(fragment), 'Missing reset: ' + fragment);
});
test('native suggestion button does not have duplicate keydown activation', () => {
  assert.match(source, /item\.type='button'/);
  assert.doesNotMatch(source, /item\.addEventListener\('keydown'/);
});
