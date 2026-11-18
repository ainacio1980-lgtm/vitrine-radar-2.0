import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recoveryAudit } from '../src/catalog.mjs';

const magalu='https://www.magazinevoce.com.br/magazinevitrineradar/produto/p/123456700/aa/bb/';
const image='https://a-static.mlcdn.com.br/foto-verdadeira.jpg';
function readonlyDb(rows) {
  const called=[];
  return {
    called,
    prepare(sql) {
      called.push(sql);
      assert.match(sql,/^SELECT\s/);
      return { async all() { return {results:rows}; } };
    },
  };
}

test('classifica bloqueios e candidatos a revisao sem aprovar ofertas',async()=>{
  const rows=[
    {id:1,title:'Produto Magalu',merchant:'Magalu',status:'paused',price_cents:19990,url:magalu,image_url:image},
    {id:2,title:'Sem foto',merchant:'Magalu',status:'pending',price_cents:12990,url:magalu,image_url:null},
    {id:3,title:'Sem preco',merchant:'Amazon',status:'paused',price_cents:0,url:'https://www.amazon.com.br/dp/B0CLDRS18S?tag=exemplo-20',image_url:'https://m.media-amazon.com/images/I/valid.jpg'},
    {id:4,title:'Link comum',merchant:'Shopee',status:'paused',price_cents:3000,url:'https://shopee.com.br/loja',image_url:'https://down-br.img.susercontent.com/file/teste'},
  ];
  const db=readonlyDb(rows);
  const result=await recoveryAudit(db);
  assert.deepEqual(result.summary,{
    total:4,ready_for_review:1,missing_photo:1,missing_price:1,invalid_affiliate_link:1,
  });
  assert.deepEqual(result.offers[1].blockers,['foto_ausente']);
  assert.deepEqual(result.offers[2].blockers,['preco_ausente']);
  assert.deepEqual(result.offers[3].blockers,['link_afiliado_nao_reconhecido']);
  assert.equal(result.offers[0].ready_for_review,true);
  assert.match(result.notice,/comissao/);
  assert.equal(db.called.length,1);
});

test('nenhum produto so com HTTPS comum vira candidato a revisao',async()=>{
  const db=readonlyDb([{id:8,title:'Sem afiliacao',merchant:'Mercado Livre',status:'paused',price_cents:2590,url:'https://www.mercadolivre.com.br/produto',image_url:image}]);
  const r=await recoveryAudit(db);
  assert.equal(r.summary.ready_for_review,0);
  assert.equal(r.summary.invalid_affiliate_link,1);
});

test('auditoria e CSV ficam atras da rota autenticada, sem publicar dados',()=>{
  const worker=readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
  const admin=readFileSync(new URL('../src/admin.mjs',import.meta.url),'utf8');
  assert.match(worker,/\/api\/admin\/recovery\.csv/);
  assert.match(worker,/\/api\/admin\/recovery/);
  assert.match(worker,/if \(!session\)/);
  assert.match(worker,/ready_for_review \? "sim"/);
  assert.match(admin,/id="recovery-ready"/);
  assert.match(admin,/id="recovery-link"/);
  assert.match(admin,/api\/admin\/recovery\.csv/);
});

test('painel prioriza candidatas autenticadas sem divulgar estoque ou publicar automaticamente',()=>{
  const worker=readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
  const admin=readFileSync(new URL('../src/admin.mjs',import.meta.url),'utf8');
  assert.match(worker, /url\.searchParams\.get\("ready"\) === "1"/);
  assert.match(worker, /audit\.offers\.filter\(o => o\.ready_for_review\)\.slice\(0, 30\)/);
  assert.match(worker, /if \(path === "\/api\/admin\/recovery"\)/);
  assert.match(admin, /id="recovery-rows"/);
  assert.match(admin, /api\/admin\/recovery\?ready=1/);
  assert.match(admin, /row\.insertCell\(\)\.textContent = offer\.title/);
  assert.match(admin, /link\.rel = 'noopener noreferrer'/);
  assert.match(admin, /Os preços abaixo são os registrados no sistema/);
});
