import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogSummary } from '../src/catalog.mjs';

const makeDb = (statusRows, withoutPhoto) => {
  const queries = [];
  return {
    queries,
    prepare(sql) {
      queries.push(sql);
      if (sql.includes('GROUP BY status')) return { all: async () => ({ results: statusRows }) };
      if (sql.includes('NOT EXISTS')) return { first: async () => ({ total: withoutPhoto }) };
      throw new Error('Consulta inesperada: ' + sql);
    },
  };
};

test('mostra progresso real, sem confundir total de registros com produtos publicados', async () => {
  const db = makeDb([
    { status: 'approved', total: 80 },
    { status: 'pending', total: 55 },
    { status: 'paused', total: 82 },
  ], 55);
  const status = await catalogSummary(db);
  assert.deepEqual(status, {
    total: 217, approved: 80, pending: 55, paused: 82,
    target: 500, remaining: 420, pending_without_photo: 55,
  });
  assert.equal(db.queries.length, 2);
  assert.ok(db.queries.every(sql => /^SELECT\s/.test(sql)), 'Sem alterar o banco');
});

test('meta concluida nunca mostra valor negativo', async () => {
  const status = await catalogSummary(makeDb([{status:'approved',total:510}],0));
  assert.equal(status.remaining, 0);
  assert.equal(status.target, 500);
});

test('sem ofertas ainda responde com zero e a meta definida', async () => {
  const status = await catalogSummary(makeDb([],0));
  assert.equal(status.total,0);
  assert.equal(status.remaining,500);
  assert.equal(status.pending_without_photo,0);
});

test('API administrativa e UI exibem o progresso calculado pela base', () => {
  const worker=readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
  const admin=readFileSync(new URL('../src/admin.mjs',import.meta.url),'utf8');
  assert.match(worker, /authJson\(await catalogSummary\(db\)\)/);
  assert.match(admin, /id="goal-progress"/);
  assert.match(admin, /id="pending-without-photo"/);
  assert.match(admin, /id="remaining"/);
  assert.match(admin, /data\.pending_without_photo/);
});
