import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('a imagem de capa importada pelo Worker existe e mantém assinatura JPEG', () => {
  const source = readFileSync(new URL('../src/worker.mjs', import.meta.url), 'utf8');
  assert.match(source, /import shareCover from ["']\.\/vitrine-radar-capa\.jpg["']/);
  const image = readFileSync(new URL('../src/vitrine-radar-capa.jpg', import.meta.url));
  assert.ok(image.length > 1024, 'A capa não deve estar vazia');
  assert.equal(image.subarray(0, 3).toString('hex'), 'ffd8ff', 'Assinatura JPEG inválida');
  assert.equal(image.subarray(-2).toString('hex'), 'ffd9', 'Final JPEG inválido');
});
