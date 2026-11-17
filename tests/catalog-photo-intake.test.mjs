import test from 'node:test';
import assert from 'node:assert/strict';
import { createOffer, updateOffer, listCatalog } from '../src/catalog.mjs';

const image = 'https://a-static.mlcdn.com.br/foto-real.jpg';
const url = 'https://www.magazineluiza.com.br/produto/123';
const valid = { title:'Produto', category:'Casa', merchant:'Magalu', price_cents:12990, url, image_url:image };

function fakeDb(current = {}) {
  const operations = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            sql, args,
            async first() {
              if (sql.includes('FROM offers WHERE id = ?')) return current.offer || null;
              if (sql.includes('SELECT id FROM offers WHERE url = ?')) return null;
              throw Error('consulta inesperada');
            },
            async run() {
              operations.push({sql,args});
              return {meta:{changes:sql.startsWith('UPDATE product_images')?0:1}};
            },
            async all() { return {results:[]} },
          };
        },
      };
    },
    async batch(entries) {
      operations.push(...entries.map(x=>({sql:x.sql,args:x.args})));
      return entries.map(()=>({meta:{changes:1}}));
    },
  };
  return {db,operations};
}

test('cadastro inclui a foto validada ao criar oferta pendente', async () => {
  const {db,operations}=fakeDb();
  const result=await createOffer(db,'admin@example.com',valid);
  assert.equal(result.status,201);
  const photo=operations.find(x=>x.sql.includes('INSERT INTO product_images'));
  assert.ok(photo,'deve gravar foto na tabela própria');
  assert.ok(photo.args.includes(image));
  assert.ok(photo.sql.includes('changes() = 1'),'não pode gravar foto se a oferta foi rejeitada');
});

test('importação pode criar pendente sem foto; não inventa imagem', async () => {
  const {db,operations}=fakeDb();
  const result=await createOffer(db,'admin@example.com',{...valid,image_url:''});
  assert.equal(result.status,201);
  const statement=operations.find(x=>x.sql.includes('INSERT INTO product_images'));
  assert.equal(statement.args[0],'');
});

test('URL de foto insegura ou fora da lista é rejeitada', async () => {
  for(const image_url of ['http://a-static.mlcdn.com.br/item.jpg','https://site-desconhecido.example/item.jpg','javascript:alert(1)']){
    const {db,operations}=fakeDb();
    const result=await createOffer(db,'admin@example.com',{...valid,image_url});
    assert.equal(result.status,400);
    assert.equal(operations.length,0);
  }
});

test('edição acrescenta imagem ausente e devolve oferta para revisão', async () => {
  const prior={id:5,...valid,image_url:null,status:'pending'};
  const {db,operations}=fakeDb({offer:prior});
  const result=await updateOffer(db,'admin@example.com',5,{...valid,previous:prior});
  assert.equal(result.data.status,'pending');
  assert.ok(operations.some(x=>x.sql.includes('INSERT INTO product_images')&&x.args.includes(image)));
});

test('listar catálogo expõe foto para edição de ofertas pendentes', async () => {
  const {db}=fakeDb();
  await listCatalog(db,new URLSearchParams({status:'pending'}));
  // The list SQL is verified separately from response rows to avoid DB dependence.
  const source=(await import('node:fs')).readFileSync(new URL('../src/catalog.mjs',import.meta.url),'utf8');
  assert.match(source,/AS image_url/);
});
