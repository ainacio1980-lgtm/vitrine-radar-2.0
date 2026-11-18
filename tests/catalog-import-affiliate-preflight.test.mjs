import test from 'node:test';
import assert from 'node:assert/strict';
import { importOffers } from '../src/catalog.mjs';

const valid = {
  title: 'Produto da loja', category: 'Casa', merchant: 'Magalu',
  price_cents: 19990,
  url: 'https://www.magazinevoce.com.br/magazinevitrineradar/exemplo/p/123456700/aa/bb/',
  image_url: 'https://a-static.mlcdn.com.br/foto-oficial.jpg',
};
function fakeDb() {
  const records = { offerInserts: [], importRows: [], batches: [], events: [] };
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            sql, args,
            async run() {
              if (sql.includes('INSERT INTO offer_import_batches')) return { meta: { last_row_id: 9, changes: 1 } };
              if (sql.includes('INSERT INTO offer_import_rows')) {
                records.importRows.push(args);
                return { meta: { changes: 1 } };
              }
              throw new Error('Escrita individual inesperada: ' + sql);
            },
          };
        },
      };
    },
    async batch(commands) {
      for (const cmd of commands) {
        const sql = cmd.sql || '';
        if (sql.includes('INSERT INTO offers')) records.offerInserts.push(cmd.args);
        else if (sql.includes('UPDATE offer_import_batches')) records.batches.push(cmd.args);
        else if (sql.includes('admin_events')) records.events.push(sql);
      }
      return [{ meta: { changes: 1 } }];
    },
  };
  return { db, records };
}
test('CSV cria somente pendentes com URLs no formato de afiliado da propria loja', async () => {
  const { db, records } = fakeDb();
  const rows = [
    valid,
    { ...valid, title: 'Link comum', url: 'https://www.magazineluiza.com.br/produto/12345' },
    { ...valid, title: 'Loja errada', merchant: 'Shopee' },
    { ...valid, title: 'Falso afiliado', url: 'https://www.magazinevoce.com.br.evil.test/magazinevitrineradar/item/p/12345/aa/bb/' },
  ];
  const response = await importOffers(db, 'admin@example.org', { rows });
  assert.equal(response.data.imported, 1);
  assert.equal(response.data.rejected, 3);
  assert.deepEqual(response.data.errors.map(e => e.line), [3, 4, 5]);
  assert.equal(records.offerInserts.length, 1);
  assert.equal(records.importRows.length, 4);
  assert.deepEqual(records.importRows.map(a => a[6]), ['valid', 'invalid', 'invalid', 'invalid']);
});
test('CSV aceita formatos previstos para cada marketplace sem atestar comissao', async () => {
  const { db, records } = fakeDb();
  const rows = [
    { ...valid, merchant: 'Mercado Livre', url: 'https://meli.la/1E9h7AZ' },
    { ...valid, merchant: 'Shopee', url: 'https://s.shopee.com.br/3B8yO1QDhZ' },
    { ...valid, merchant: 'Amazon', url: 'https://www.amazon.com.br/dp/B0CLDRS18S?tag=exemplo-20' },
  ];
  const response = await importOffers(db, 'admin@example.org', { rows });
  assert.equal(response.data.imported, 3);
  assert.equal(response.data.rejected, 0);
  assert.equal(records.offerInserts.length, 3);
  assert.ok(records.offerInserts.every(values => values.includes(valid.price_cents)));
});
test('CSV recusa URLs nao afiliadas sem inserir ofertas e registra o motivo', async () => {
  const { db, records } = fakeDb();
  const response = await importOffers(db, 'admin@example.org', { rows: [
    { ...valid, merchant: 'Mercado Livre', url: 'https://www.mercadolivre.com.br/item' },
    { ...valid, merchant: 'Shopee', url: 'https://shopee.com.br/item' },
  ] });
  assert.equal(response.data.imported, 0);
  assert.equal(response.data.rejected, 2);
  assert.equal(records.offerInserts.length, 0);
  assert.match(response.data.errors[0].error, /formato de afiliado/);
  assert.deepEqual(records.importRows.map(a => a[6]), ['invalid', 'invalid']);
});
