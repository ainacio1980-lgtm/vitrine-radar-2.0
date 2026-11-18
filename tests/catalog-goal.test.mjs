import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogGoal, updateIssueBody, START, END } from '../scripts/catalog-goal.mjs';

const offer=id=>({
  id,title:'Produto '+id,merchant:'Magalu',price_cents:14990,
  image_url:'https://a-static.mlcdn.com.br/teste-'+id+'.jpg',
  url:'https://www.magazinevoce.com.br/magazinevitrineradar/item/p/'+id+'/ab/cd/'
});
const provider=async()=>({ok:true,json:async()=>({offers:[offer(1),offer(2)],count:2,next_offset:null})});

test('meta usa somente ofertas aprovadas visiveis no catalogo',async()=>{
  const m=await catalogGoal('https://example.org',provider);
  assert.deepEqual(m,{published:2,target:500,remaining:498,percent:0.4});
});
test('atualiza issue apenas quando numero de publicados muda',()=>{
  const m={published:80,target:500,remaining:420,percent:16};
  const original='## Meta 500 ofertas\n\n- [ ] Recuperar fotos';
  const first=updateIssueBody(original,m);
  assert.ok(first.includes(START));
  assert.ok(first.includes(END));
  assert.match(first,/80 \/ 500/);
  assert.equal(updateIssueBody(first,m),first);
  assert.match(updateIssueBody(first,{published:81,target:500,remaining:419,percent:16.2}),/81 \/ 500/);
  assert.match(updateIssueBody(first,{published:81,target:500,remaining:419,percent:16.2}),/Recuperar fotos/);
});
test('nao publica resultados incoerentes nem sobrescreve marcadores',()=>{
  assert.throws(()=>updateIssueBody('ok',{published:500,target:500,remaining:10,percent:100}),/inconsistente/);
  assert.throws(()=>updateIssueBody('hello '+START,{published:80,target:500,remaining:420,percent:16}),/Marcadores/);
});
