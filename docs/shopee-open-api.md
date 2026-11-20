# Shopee Open API — fase inicial

O cliente server-side está em `src/shopee_api.mjs`, com testes isolados em `tests/shopee_api.test.mjs`.
Ele **não** cria produtos nem altera D1 ou a produção. O método `generateShopeeAffiliateLink`
somente retorna o link como `pending_review`. Validar o formato exato da mutation com o
Explorer oficial antes de executar com credenciais reais.

Fonte técnica: https://www.affiliateshopee.com.br/documentacao
Endpoint: https://open-api.affiliate.shopee.com.br/graphql

## Credenciais — nunca no chat ou no GitHub

1. Entrar em https://affiliate.shopee.com.br/open_api e verificar autorização de API.
2. No Cloudflare, abrir Workers & Pages > o Worker Vitrine Radar > Settings > Variables and Secrets.
3. Adicionar `SHOPEE_APP_ID` e `SHOPEE_APP_SECRET` como **Secret** (não texto simples).
4. Não ativar chamadas em produção antes de validar o schema da conta, respostas,
   limites, licenciamento de imagens/dados, monitoramento e homologação de comissão.

Não incluir URLs de produto não verificadas, preços inventados, foto fictícia nem credenciais em arquivos versionados.
Executar `npm run verify` para validar o código localmente.
