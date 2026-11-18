# Importacao offline de exportacoes oficiais de afiliados

## Objetivo e limite atual

Preparar um CSV de candidatos a revisao, **sem publicar automaticamente** e **sem alterar Cloudflare D1**.
Esta ferramenta nao extrai dados de paginas, nao acessa APIs de terceiros, nao gera links de afiliado,
nao verifica comissao, nao demonstra permissao de reutilizacao comercial de fotos e nao ativa nenhum feed.

Os quatro `marketplace_sources` seguem desativados ate haver integracao oficial autorizada.
A prioridade e obter feed/licenca e credenciais de cada parceiro; colocar essas credenciais somente em
Secrets do servidor, nunca no GitHub publico, na planilha ou em arquivos versionados.

## Como obter os dados autorizados

- **Shopee:** entrar no Portal de Afiliados, verificar Oferta de Produto e geracao de link
  por produto, pedir acesso ao feed/API oficial se disponivel para a conta. Referencia:
  https://help.shopee.com.br/portal/10/article/128461-Como-gerar-seus-links-de-Afiliado-ou-ID-de-produto-para-compartilhar
- **Mercado Livre:** entrar no Programa de Afiliados e solicitar acesso permitido a
  dados de produtos, disponibilidade, fotos, precos e geracao de links em escala.
  Sem credenciais e autorizacao escrita, nao presumir API de afiliados habilitada.
- **Magalu:** usar links extraidos da loja propria `magazinevitrineradar` e verificar
  se ha exportacao ou canal oficial para influenciador. A API de Magalu Empresas para
  e-commerce e **diferente** do programa Influenciador Magalu.
- **Amazon:** a Creators API exige aprovacao final da conta e credenciais proprias.
  Referencia: https://associados.amazon.com.br/creatorsapi/docs/en-us/onboarding/register-for-creators-api
  Nao reutilizar credenciais antigas da PA-API e confirmar termos/licenca para comparacao.

## Contrato de entrada local

Arquivo JSON privado de **um marketplace por vez**, gerado por adaptador autorizado depois
de receber dados oficiais; nao colocar exportacoes privadas neste repositorio publico:

```json
{
  "merchant": "Shopee",
  "source_type": "official_partner_export",
  "source_reference": "https://affiliate.shopee.com.br/",
  "items": [
    {
      "title": "TITULO EXATO OBTIDO NO PORTAL",
      "category": "CATEGORIA DO ITEM",
      "partner_sku": "SKU_VERIFICADO_NO_PORTAL",
      "price_cents": 12345,
      "affiliate_url": "URL_INDIVIDUAL_GERADA_NA_PROPRIA_CONTA",
      "image_url": "URL_HTTPS_DA_FOTO_OFICIAL_DO_ITEM",
      "available": true,
      "checked_at": "ISO_8601_DA_VERIFICACAO"
    }
  ]
}
```

**Este bloco e apenas estrutura ilustrativa, NAO contem ofertas nem links utilizaveis.**
`source_type` e `source_reference` sao declaracoes do operador, nao prova automatica
de autorizacao ou autenticidade. Exigir evidencias reais por produto antes da aprovacao.

No computador, apos receber uma exportacao oficial e montar esse JSON:

```sh
node scripts/prepare-partner-feed.mjs exportacao-oficial.json candidatos.csv
# Opcional: um JSON privado contendo array de URLs ja presentes no catalogo
node scripts/prepare-partner-feed.mjs exportacao-oficial.json candidatos.csv urls-existentes.json
npm run verify
```

O programa grava `candidatos.csv` e `candidatos.report.json`. Aceita no maximo
500 linhas de um parceiro por arquivo, verifica formato do link afiliado, imagem de
dominio permitido, preco positivo, estoque declarado, SKU, duplicatas e timestamp
de ate 24 horas. Rejeita todas as linhas sem esses campos. **Nao testa a URL no
destino remoto, nao atesta origem ou comissao**. Carregar CSV no painel
administrativo **Importar ofertas por CSV**; a API recebe lotes de 50 e salva como
`pending`. Somente revisar e promover individualmente apos prova externa de SKU,
foto realmente acessivel, preco vigente, estoque e atribuicao afiliada.

## Estado inicial verificado em producao (17/11/2026)

80 aprovadas, 55 pendentes e 82 pausadas; meta 500 aprovadas; faltam 420.
`marketplace_sources.enabled = 0` para as quatro lojas. 3 links anteriormente
fornecidos pelo proprietario foram encontrados fora de `offers` e inseridos
**somente em `affiliate_link_inbox` com status `pending`** (IDs 26, 27, 28).
Eles **nao** representam novos produtos cadastrados nem publicados, e ainda
dependem de identificacao de SKU e validacao de preco, foto e destino.

## Guardrails permanentes

- Nao gerar precos ou SKUs, nao reutilizar mesmo link de produto para 500 ofertas.
- Sem scraping, CAPTCHA ou bypass de autenticacao.
- Nunca publicar, alterar estoque, status ou imagens de ofertas ja aprovadas por esta ferramenta.
- Nao assumir que formato `meli.la`, `s.shopee.com.br` ou tag Amazon assegura comissao.
- Nao ativar qualquer feed sem credenciais e licencas oficiais, monitoramento e homologacao.
