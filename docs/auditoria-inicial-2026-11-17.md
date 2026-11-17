# Auditoria inicial — 17/11/2026

## Evidências confirmadas
- Cloudflare Workers: `vitrine-radar` (produção) e `vitrine-radar-filter-staging` (homologação).
- Recuperação via API Cloudflare: 14 módulos JavaScript e 1 arquivo JPG em cada ambiente.
- Comparação textual dos módulos: **14 de 14 idênticos** entre produção e homologação.
- O arquivo JPG difere entre os ambientes (comparação textual do conteúdo multipart; requer validação binária antes de concluir diferença visual).
- Ambos os Workers usam binding `DB` para bancos D1 distintos.
- Produção possui binding de segredo `ADMIN_PASSWORD`. O valor do segredo não foi acessado.
- Deploy mais recente de produção observado: 2026-11-17T09:41:57Z.
- Deploy mais recente de homologação observado: 2026-11-17T09:38:32Z.

## Limitações e cuidados
- A recuperação foi feita na API da Cloudflare; os arquivos-fonte ainda **não foram importados** ao GitHub.
- Nenhum deploy novo foi executado nesta auditoria.
- Verificação preliminar de padrões de credenciais não substitui auditoria completa antes de publicar código em repositório público.
- O ambiente de homologação não apresenta diferenças de código em relação à produção, portanto não é evidência de correções concluídas.

## Plano de ação
1. Auditar os arquivos para dados sensíveis, segredos e links pessoais.
2. Preparar importação segura do código versionável ao GitHub.
3. Corrigir seleção de filtro, preços por loja, fotos, links, caracteres e responsividade em homologação.
4. Validar testes de regressão e somente então publicar em produção.
