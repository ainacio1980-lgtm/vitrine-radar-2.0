# Revisão prioritária de ofertas pausadas — 17/11/2026

Fonte: consulta somente leitura ao D1 de produção. **Nenhuma oferta foi reativada.** Preços abaixo são valores armazenados, não preços atuais verificados.

## Primeiro par candidato à comparação entre lojas

| ID | Loja | Título armazenado | Preço armazenado | Status |
|---|---|---|---:|---|
| 32 | Mercado Livre | Tapete higiênico Chalesco para cães 60 × 55 cm — 30 unidades | R$ 69,90 | paused |
| 36 | Shopee | Tapete higiênico Chalesco para cães — 30 unidades | R$ 84,55 | paused |

**Importante:** ainda não está comprovado que são o mesmo produto. O anúncio Shopee não informa dimensões no título. Conferir fabricante, dimensões, unidades, SKU/EAN, disponibilidade, URL afiliada e preço atual antes de comparar ou ativar. A diferença de R$ 14,65 é apenas entre preços armazenados, não economia real.

## Candidatos de revisão por loja

- Magalu: 21 pausados com preço positivo e imagem cadastrada (IDs 1,3,4,5,6,7,8,25,26,27,28,50–59).
- Mercado Livre: 10 (IDs 9,14,31,32,62,64,84,85,111,160).
- Shopee: 18 (IDs 17,18,19,33,34,36,37,38,70–79).

## Sequência segura

1. Validar a URL original e a afiliação; não substituir por link genérico.
2. Verificar a imagem de fato carregada e correspondente ao produto.
3. Validar preço atual, estoque, voltagem, capacidade, quantidade e modelo.
4. Só então propor aprovação, com evidências. Não alterar status em massa.
5. Comparação entre marketplaces somente com equivalência demonstrada.

A homologação contém alguns IDs que também existem pausados em produção; bancos são independentes. Nunca inferir status de produção a partir da homologação.

## Resultado da inspeção dos links e das validações armazenadas

Consulta D1 de produção dos IDs 32 (Mercado Livre) e 36 (Shopee):

- `offer_link_meta.kind = retailer_direct` nos dois anúncios; a última revisão registrada é de 14/11/2026. **Não há confirmação de afiliação**.
- Validação `merchant_link_format_db_20261117`: **reprovada** para o ID 32; **aprovada** para o ID 36. Isso verifica formato, não comissão.
- Validações de domínio da loja, URL HTTPS, imagem HTTPS, imagem presente e preço positivo foram aprovadas no banco para ambos, mas não comprovam que o recurso remoto carregue atualmente.
- `offer_quality_checks`: nenhuma linha encontrada para esses dois IDs.
- URL do ID 32 aponta diretamente para `www.mercadolivre.com.br`; URL do ID 36 aponta diretamente para `shopee.com.br`. Nenhuma das duas foi demonstrada como link rastreado de afiliado.

**Decisão:** manter ambos pausados. Solicitar ou recuperar URLs de afiliado comprovadas e confirmar dimensões do produto Shopee, preços e estoque antes de eventual comparação/publicação. Não inventar links nem inferir comissão.
