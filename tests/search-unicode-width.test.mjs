import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductSearch, productSearchTerms } from '../src/comparator_search.mjs';

test('busca reconhece caracteres full-width e separadores unicode', () => {
  assert.equal(
    normalizeProductSearch('ＰＯＣＯ Ｘ８ Ｐｒｏ　８ＧＢ／２５６ＧＢ　ＰＲＥＴＯ'),
    'poco x8 pro 8gb 256gb preto'
  );
  assert.equal(normalizeProductSearch('Ｓａｍｓｕｎｇ Ａ０７ １２８ＧＢ'), 'samsung a07 128gb');
});

test('normalizacao de modelo e cor continua identica nas consultas comuns', () => {
  assert.equal(normalizeProductSearch('Poco X8 Pro 8GB/256GB preta'),
    'poco x8 pro 8gb 256gb preto');
  const terms=productSearchTerms('ＰＯＣＯ Ｘ８ ８ＧＢ');
  assert.ok(terms);
  assert.ok(terms.exact.includes(' 8gb '));
});
