import test from 'node:test';
import assert from 'node:assert/strict';
import { changeOfferStatus } from '../src/catalog.mjs';

const complete = {
  url: 'https://www.magazinevoce.com.br/magazinevitrineradar/produto-exemplo/p/123456700/ed/item/',
  status: 'pending', price_cents: 19990, merchant: 'Magalu',
};
function makeDb(offer = complete, image = 'https://a-static.mlcdn.com.br/item.jpg') {
  const calls = { batch: 0, image: 0 };
  const db = {
    prepare(sql) {
      return {
        bind() {
          return {
            async first() {
              if (sql.includes('FROM product_images')) {
                calls.image++;
                return image === null ? null : { image_url: image };
              }
              if (sql.includes('FROM offers')) return offer;
              throw new Error('Consulta inesperada: ' + sql);
            },
          };
        },
      };
    },
    async batch() {
      calls.batch++;
      return [{ meta: { changes: 1 } }];
    },
  };
  return { db, calls };
}
const request = { previous_status: 'pending', status: 'approved' };

test('aprovacao completa exige e aceita foto, preco e loja validos', async () => {
  const { db, calls } = makeDb();
  const result = await changeOfferStatus(db, 'admin@example.org', 42, request);
  assert.equal(result.data.status, 'approved');
  assert.equal(calls.batch, 1);
  assert.equal(calls.image, 1);
});

test('nao aprova oferta sem imagem ou com foto fora dos dominios confiaveis', async () => {
  for (const image of [null, 'http://a-static.mlcdn.com.br/imagem.jpg', 'https://example.org/foto.jpg']) {
    const { db, calls } = makeDb(complete, image);
    const result = await changeOfferStatus(db, 'admin@example.org', 42, request);
    assert.equal(result.status, 422);
    assert.match(result.error, /foto HTTPS/);
    assert.equal(calls.batch, 0);
  }
});

test('nao aprova preco inexistente ou loja nao parceira', async () => {
  for (const changes of [{ price_cents: 0 }, { price_cents: -1 }, { merchant: 'Loja desconhecida' }]) {
    const { db, calls } = makeDb({ ...complete, ...changes });
    const result = await changeOfferStatus(db, 'admin@example.org', 42, request);
    assert.equal(result.status, 422);
    assert.equal(calls.batch, 0);
    assert.equal(calls.image, 0);
  }
});

test('continua rejeitando URLs inseguras e alteracoes obsoletas', async () => {
  const unsafe = makeDb({ ...complete, url: 'http://example.org/item' });
  assert.equal((await changeOfferStatus(unsafe.db, 'admin@example.org', 42, request)).status, 422);
  const stale = makeDb({ ...complete, status: 'paused' });
  assert.equal((await changeOfferStatus(stale.db, 'admin@example.org', 42, request)).status, 409);
});

test('pausar oferta aprovada nao depende de imagens', async () => {
  const { db, calls } = makeDb({ ...complete, status: 'approved' }, null);
  const result = await changeOfferStatus(db, 'admin@example.org', 42, {
    previous_status: 'approved', status: 'paused',
  });
  assert.equal(result.data.status, 'paused');
  assert.equal(calls.image, 0);
  assert.equal(calls.batch, 1);
});
