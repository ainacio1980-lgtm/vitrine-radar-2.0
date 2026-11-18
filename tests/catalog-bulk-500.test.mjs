import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../src/admin.mjs', import.meta.url), 'utf8');
function parser() {
  const begin = html.indexOf('  function splitCsvLine(line)');
  const end = html.indexOf("  byId('import-form').addEventListener", begin);
  assert.ok(begin > 0 && end > begin, 'funcoes de CSV disponiveis');
  const code = html.slice(begin, end);
  return runInNewContext(code + '\nparseCsv', {
    priceInCents: value => Math.round(Number(value.replace(',', '.')) * 100),
    Error,
    Set,
  });
}
const header = 'titulo;categoria;loja;preco;url;foto';
const csvRow = id => ['Produto ' + id, 'Casa', 'Magalu', '99,90',
  'https://www.magazinevoce.com.br/magazinevitrineradar/item/p/' + id + '/ab/cd/',
  'https://a-static.mlcdn.com.br/item-' + id + '.jpg'].join(';');
const csv = size => [header, ...Array.from({ length: size }, (_, n) => csvRow(n + 1))].join('\n');

test('planilha de 500 produtos e aceita sem publicar imediatamente', () => {
  const rows = parser()(csv(500));
  assert.equal(rows.length, 500);
  assert.equal(rows[0].price_cents, 9990);
  assert.equal(rows[499].title, 'Produto 500');
  assert.match(html, /for \(let offset = 0; offset < rows.length; offset \+= 50\)/);
  assert.match(html, /rows\.slice\(offset, offset \+ 50\)/);
  assert.match(html, /Nenhuma foi publicada/);
});

test('bloqueia 501 produtos e links duplicados antes de enviar lotes', () => {
  assert.throws(() => parser()(csv(501)), /Limite de 500/);
  const duplicate = [header, csvRow(1), csvRow(1)].join('\n');
  assert.throws(() => parser()(duplicate), /URLs repetidas/);
});

test('rejeita linhas com colunas erradas ou URL vazia', () => {
  assert.throws(() => parser()([header, 'A;B;Magalu;30,00;'].join('\n')), /colunas incorreta/);
  assert.throws(() => parser()([header, 'A;B;Magalu;30,00;;'].join('\n')), /precisam de URL/);
});

test('trata retomada de importacao parcial e limites de API', () => {
  assert.match(html, /Importação parcial:/);
  assert.match(html, /Revise o catálogo antes de reenviar/);
  assert.match(html, /selected\.size > 512 \* 1024/);
  assert.match(html, /await api\('\/api\/admin\/import', 'POST'/);
  const catalog=readFileSync(new URL('../src/catalog.mjs', import.meta.url), 'utf8');
  assert.match(catalog, /input\.rows\.length > 50/);
  assert.match(catalog, /status\)\s*\n\s*SELECT \?, \?, \?, \?, \?, 'pending'/);
});
