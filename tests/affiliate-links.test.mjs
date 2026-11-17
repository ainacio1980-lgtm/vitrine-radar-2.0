import test from 'node:test';
import assert from 'node:assert/strict';
import { affiliateDestinationForMarketplace, changeOfferStatus } from '../src/catalog.mjs';

const good = [
  ['Magalu','https://www.magazinevoce.com.br/magazinevitrineradar/secador-taiff/p/108512000/pf/psec/'],
  ['Mercado Livre','https://meli.la/1E9h7AZ'],
  ['Amazon','https://www.amazon.com.br/dp/B0CLDRS18S/ref=nosim?tag=exemplo-20'],
  ['Shopee','https://s.shopee.com.br/3B8yO1QDhZ'],
];

test('reconhece formatos oficiais de afiliados, sem alegar comissao comprovada', () => {
  for(const [merchant,url] of good) {
    assert.equal(affiliateDestinationForMarketplace(merchant,url).href,url,merchant);
  }
});

test('rejeita links comuns sem identificador de afiliado e dominios imitados', () => {
  const invalid=[
    ['Magalu','https://www.magazineluiza.com.br/item/p/123456700/'],
    ['Magalu','https://www.magazinevoce.com.br/magazineoutrapessoa/produto/p/123456700/'],
    ['Magalu','https://www.magazinevoce.com.br.evil.example/magazinevitrineradar/item/p/123456700/'],
    ['Mercado Livre','https://www.mercadolivre.com.br/produto/MLB12345'],
    ['Mercado Livre','https://meli.la.evil.example/1E9h7AZ'],
    ['Amazon','https://www.amazon.com.br/dp/B0CLDRS18S'],
    ['Amazon','https://www.amazon.com.br/dp/B0CLDRS18S?tag='],
    ['Shopee','https://shopee.com.br/produto-123'],
    ['Shopee','https://s.shopee.com.br.evil.example/3B8yO1QDhZ'],
    ['Shopee','http://s.shopee.com.br/3B8yO1QDhZ'],
    ['Magalu','https://www.magazinevoce.com.br:8443/magazinevitrineradar/x/p/123456700/pf/'],
  ];
  for (const [merchant,url] of invalid) {
    assert.throws(()=>affiliateDestinationForMarketplace(merchant,url),undefined,merchant+': '+url);
  }
});

test('a mesma URL nao pode ser aceita como afiliada de loja diferente', () => {
  for(const [merchant,url] of good) {
    for(const other of ['Magalu','Mercado Livre','Amazon','Shopee'].filter(x=>x!==merchant)) {
      assert.throws(()=>affiliateDestinationForMarketplace(other,url),undefined,other);
    }
  }
});

test('recusa aprovacao de oferta com link nao afiliado antes de alterar D1', async () => {
  let written=false;
  const db={
    prepare(sql) {
      return {bind(){return {async first(){
        if(sql.includes('FROM offers'))return {status:'pending',url:'https://shopee.com.br/produto',merchant:'Shopee',price_cents:14990};
        throw new Error('A consulta de imagem nao deveria ocorrer');
      }};}};
    },
    async batch(){written=true;return [];},
  };
  const result=await changeOfferStatus(db,'admin@example.org',1,{status:'approved',previous_status:'pending'});
  assert.equal(result.status,422);
  assert.match(result.error,/link oficial de afiliado/);
  assert.equal(written,false);
});
