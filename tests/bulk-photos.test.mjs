import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importPendingPhotos } from '../src/catalog.mjs';

const photo='https://a-static.mlcdn.com.br/produto-verdadeiro.jpg';
function makeDb(ids=[101,102]) {
  const pending=new Set(ids),saved=new Set(),queries=[];
  return {
    queries, saved,
    prepare(sql) {
      return {bind(...values) {
        return {async run() {
          queries.push({sql,values});
          if(sql.startsWith('INSERT INTO product_images')) {
            const id=values[1];
            if(!pending.has(id)||saved.has(id))return {meta:{changes:0}};
            saved.add(id);return {meta:{changes:1}};
          }
          if(sql.startsWith('INSERT INTO admin_events'))return {meta:{changes:1}};
          throw Error('Escrita inesperada: '+sql);
        }};
      }};
    },
  };
}

test('completa fotos somente de ofertas pendentes sem alterar status ou preço',async()=>{
  const db=makeDb([101,102]);
  const response=await importPendingPhotos(db,'admin@exemplo.org',{rows:[
    {id:101,image_url:photo},{id:102,image_url:photo},
  ]});
  assert.equal(response.data.added,2);
  assert.equal(response.data.skipped,0);
  assert.equal(db.queries.filter(q=>q.sql.startsWith('INSERT INTO admin_events')).length,2);
  assert.ok(db.queries.every(q=>!/(UPDATE offers|DELETE|status\s*=|price_cents\s*=)/i.test(q.sql)));
  assert.deepEqual([...db.saved],[101,102]);
});

test('recusa lote invalido inteiro antes de qualquer escrita',async()=>{
  for(const rows of [
    [{id:101,image_url:photo},{id:101,image_url:photo}],
    [{id:101,image_url:photo},{id:102,image_url:'http://a-static.mlcdn.com.br/foto.jpg'}],
    [{id:101,image_url:photo},{id:102,image_url:'https://exemplo-invalido.org/foto.jpg'}],
    [{id:0,image_url:photo}],
    [],
    Array.from({length:51},(_,i)=>({id:i+1,image_url:photo})),
  ]) {
    const db=makeDb();
    const result=await importPendingPhotos(db,'admin@exemplo.org',{rows});
    assert.equal(result.status,400);
    assert.equal(db.queries.length,0);
  }
});

test('oferta ja ilustrada ou pausada nunca recebe imagem em lote',async()=>{
  const db=makeDb([101]);
  await importPendingPhotos(db,'admin@exemplo.org',{rows:[{id:101,image_url:photo}]});
  const repeat=await importPendingPhotos(db,'admin@exemplo.org',{rows:[
    {id:101,image_url:photo},{id:102,image_url:photo},
  ]});
  assert.equal(repeat.data.added,0);
  assert.equal(repeat.data.skipped,2);
  assert.deepEqual(db.saved,new Set([101]));
});

test('rotas de download e importacao exigem sessao e CSRF administrativos',()=>{
  const worker=readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
  const admin=readFileSync(new URL('../src/admin.mjs',import.meta.url),'utf8');
  assert.match(worker,/\/api\/admin\/photos\/missing\.csv/);
  assert.match(worker,/\/api\/admin\/photos\/import/);
  assert.match(worker,/request\.headers\.get\("x-csrf-token"\)/);
  assert.match(worker,/importPendingPhotos\(db, session\.email, body\)/);
  assert.match(admin,/id="photo-import-form"/);
  assert.match(admin,/api\/admin\/photos\/missing\.csv/);
  assert.match(admin,/offset \+= 50/);
  assert.match(admin,/parsePhotoCsv\(/);
});
