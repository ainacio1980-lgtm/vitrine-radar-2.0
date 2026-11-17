# Homologação do filtro — 17/11/2026

## Alteração aplicada
No arquivo `pages.mjs` do Worker `vitrine-radar-filter-staging`, foi removido o listener customizado `keydown` dos botões de sugestões de produtos. Os botões já utilizam a ativação nativa por Enter e Espaço, além do listener de `click` que seleciona a oferta.

## Evidência de deploy
- Cloudflare API `PUT /accounts/{account_id}/workers/scripts/vitrine-radar-filter-staging`: sucesso.
- Deploy confirmado pela API: `2026-11-17T19:22:20.122693Z`.
- Releitura do código: o listener removido não aparece em homologação, e o comentário substituto está presente.
- Produção `vitrine-radar`: listener original permanece; último deploy observado `2026-11-17T09:41:57.120501Z`.
- Foram reenviados os 15 arquivos do pacote existente; binding D1 de homologação preservado.

## Validações pendentes
- Teste real no navegador de seleção por toque, mouse, Enter e Espaço.
- Verificar correspondência entre sugestão, identificador e resultado.
- Confirmar comportamento em dispositivos móveis e acessibilidade.
- Não promover para produção antes dos testes.

> Esta alteração elimina um potencial acionamento duplicado de teclado; não comprova a correção do problema de seleção por clique relatado.
