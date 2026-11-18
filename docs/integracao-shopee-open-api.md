# Shopee Affiliate Open API — integração inicial

Implementação em branch de revisão. Não ativar em produção sem homologação.

## Implementado

- Cliente GraphQL com assinatura SHA-256: AppID + timestamp Unix em segundos + corpo JSON exato + API Secret.
- Consulta somente leitura via productOfferV2; no máximo 20 candidatos por chamada, páginas de 1 a 3.
- Método interno generateShortLink, com SubIDs e validação de domínio na origem e no retorno.
- Endpoint administrativo protegido por login:
  GET /api/admin/shopee-api/preview?keyword=celular&page=1&limit=10
- Sem gravações D1, importação, alteração de catálogo ou publicação.
- Valores de preço retornam como brutos da API; não são convertidos automaticamente para centavos.
- Todo produto retornado necessita validação de foto, preço, estoque, identidade e comissão.

## Credenciais Shopee (não compartilhar no ChatGPT)

Entrar na página oficial https://affiliate.shopee.com.br/open_api
Verificar que a conta possui AppID e Senha da API de afiliados. Senha da API NÃO é a senha de login na Shopee.

No Cloudflare, selecionar inicialmente o Worker de homologação
vitrine-radar-filter-staging > Settings > Variables and Secrets.

Adicionar duas variáveis com tipo Secret:
- SHOPEE_APP_ID = AppID da Open API Shopee
- SHOPEE_API_SECRET = Senha/Secret da Open API Shopee

Nunca colocar os valores no GitHub público, prints, comentários, chat, issues ou workflows.
Inserir secrets não publica automaticamente o novo código no Worker.

## Homologação antes do deploy

1. Executar npm run verify e analisar o PR.
2. Publicar esta versão em staging preservando todos os bindings, especialmente DB.
3. Logar no painel administrativo de staging e consultar o endpoint GET acima.
4. Verificar que a resposta contém candidatos com status review_only e published=0.
5. Conferir manualmente URLs e informações de produtos; preços brutos não são provas de estoque.
6. Validar credenciais, erros HTTP, formatos e segurança; não enviar erros brutos a clientes.
7. Preparar futuro importador para pendentes, somente após validar origem, SKU, foto, preços e links.
8. Implantação em produção depende de aprovação e testes; não ativar sincronização automaticamente.

## Restrições permanentes

Sem scraping, sem geração fictícia de SKUs ou preços, sem coleta de senhas de login
e sem promessa de comissão a partir de link não validado.
A consulta oficial não significa autorização irrestrita de reutilização de imagens
ou divulgação de preços. Conferir termos da Shopee.

Referência oficial: https://help.shopee.com.br/portal/10/article/128461-Passo-a-Passo-para-Gerar-Seus-Links-de-Afiliado
