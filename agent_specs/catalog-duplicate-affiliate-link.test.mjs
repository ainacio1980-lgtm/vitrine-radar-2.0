import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCatalog } from '../scripts/check-public-catalog.mjs';

const offer=(id,url)=>({
  id,title:'Produto completo '+id,category:'Casa',merchant:'Magalu',price_cents:9900,
  image_url:'https://a-static.mlcdn.com.br/foto-'+id+'.jpg',url,
});
const affiliate='https://www.magazinevoce.com.br/magazinevitrineradar/um-produto/p/123456700/ab/cd/';
function fetchPages(pages){
  return async href=>{
    const offset=Number(new URL(href).searchParams.get('offset')||0);
    const payload=pages[offset];
    return payload?{ok:true,json:async()=>payload}:{ok:false,status:404};
  };
}
test('catalogo rejeita URL afiliada duplicada em outra pagina e outro ID',async()=>{
  const pages={
    0:{offers:[offer(1,affiliate)],count:1,next_offset:1},
    1:{offers:[offer(2,affiliate)],count:1,next_offset:null},
  };
  await assert.rejects(checkCatalog('https://vitrine.example',fetchPages(pages)), /duplicad/i);
});
test('ofertas com URLs diferentes sao aceitas',async()=>{
  const pages={0:{offers:[offer(1,affiliate),offer(2,affiliate.replace('123456700','123456701'))],count:2,next_offset:null}};
  const result=await checkCatalog('https://vitrine.example',fetchPages(pages));
  assert.equal(result.offers,2);
});
