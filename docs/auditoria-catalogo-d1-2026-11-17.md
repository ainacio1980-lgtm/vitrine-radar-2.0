# Auditoria D1 — 17/11/2026

Consulta somente leitura aos bancos Cloudflare D1. Os números são um retrato do momento da consulta; não comprovam links ativos, imagens carregáveis ou preços atuais.

## Produção

| Status | Total | Preço positivo | Imagem cadastrada |
|---|---:|---:|---:|
| approved | 80 | 80 | 80 |
| paused | 82 | 53 | 74 |
| pending | 55 | 55 | 0 |
| **Total** | **217** | **188** | **154** |

Ofertas aprovadas: Magalu 69, Mercado Livre 10, Amazon 1, Shopee 0.

**Bloqueios:** 55 pendentes sem imagem; 29 pausadas sem preço positivo. Não promover esses registros sem validação de URL, imagem, preço e afiliação.

## Homologação

12 ofertas approved: Magalu 11, Amazon 1. Todas têm preço positivo e imagem cadastrada. Base de homologação não representa a cobertura da produção.

## Critérios antes de publicar

1. Testar clique na sugestão e confirmação do produto filtrado com IDs numéricos e textuais.
2. Confirmar resposta HTTP e destino final dos links de afiliados, sem alterar códigos de rastreamento.
3. Verificar carregamento efetivo das imagens, e não apenas existência da URL.
4. Confirmar preço por loja, correspondência exata do produto e atualização.
5. Manter ofertas incompletas como pendentes/pausadas.
6. Só publicar em produção após validação funcional; preservar o Worker e D1 de produção.

Consultas SQL (somente leitura):

```sql
SELECT status, COUNT(*) AS n,
 SUM(CASE WHEN price_cents > 0 THEN 1 ELSE 0 END) AS priced,
 SUM(CASE WHEN EXISTS (
  SELECT 1 FROM product_images i
  WHERE i.offer_id = offers.id AND trim(i.image_url) <> ''
 ) THEN 1 ELSE 0 END) AS imaged
FROM offers GROUP BY status ORDER BY status;
```
