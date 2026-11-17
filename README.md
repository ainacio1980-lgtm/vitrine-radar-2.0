# Vitrine Radar 2.0

Plataforma brasileira de descoberta de ofertas e comparação de preços por lojas parceiras.

## Ambientes existentes
- Produção Cloudflare Worker: `vitrine-radar`
- Homologação Cloudflare Worker: `vitrine-radar-filter-staging`
- Banco de dados: Cloudflare D1 (bindings separados por ambiente)

## Diretrizes
- Preservar a produção até validar alterações em homologação.
- Usar exclusivamente recursos gratuitos.
- Não armazenar senhas, tokens, dados pessoais ou segredos neste repositório.
- Validar fotos, preços, identificação das lojas, links de afiliados, filtro por clique, responsividade e caracteres antes de publicar.
- Registrar evidências de testes e deploys; não declarar publicação sem confirmação.

## Próximos passos
1. Recuperar e revisar o código-fonte dos Workers existentes.
2. Separar configurações e credenciais do código versionado.
3. Implementar correções em branch de trabalho e homologação.
4. Executar testes de regressão e aprovar deploy de produção.

> Este repositório foi inicializado com documentação. O código de produção ainda não foi importado.
