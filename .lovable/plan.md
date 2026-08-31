# Lançamento retroativo de 23 vendas — Uxe Joias

Registrar as vendas de agosto/2026 na conta uxejoias@gmail.com, com item pelo preço de catálogo + desconto, frete cobrado do cliente somando ao total, e correção de estoque nas vendas até 17/08.

## Regras aplicadas

- Preço do item = preço de catálogo; diferença vira desconto da venda.
- Frete informado = frete do cliente (soma ao total).
- Vendas com data **até 17/08/2026**: antes da venda, entra 1 unidade no lote de cada produto vendido (lote "AJUSTE-AGO-2026"), para o estoque não ficar negativo. Em kits, a entrada vai nos componentes.
- Vendas **após 17/08/2026**: apenas a venda (o estoque atual absorve a baixa).
- Contatos: usar lead existente quando houver (José Saldanha, Nilson); criar lead novo para os demais, com telefone. Venda sem nome fica como consumidor final com o telefone no lead.
- Pagamentos: pix / dinheiro / cartao_debito / cartao_credito (com nº de parcelas quando informado).

## Mapeamento venda → catálogo

| Cliente | Data | Itens (catálogo) | Preço cat. | Desc. | Frete | Total |
|---|---|---|---|---|---|---|
| Colombiano | 03/08 | Kit Corrente Piastrine 50cm + Pingente; Conjunto Cadeado 4mm 70cm + Pingente + Pulseira | 150 + 300 | 75 | — | 375 |
| Thiago Marinho | 04/08 | Pulseira Cadeado 4mm - 19cm | 90 | -9,90* | 15 | 114,90 |
| Adão Costa | 05/08 | Kit Piastrine 3,6mm - 60cm + Pingente | 199,90 | 2,90 | 15 | 212 |
| Heverton Silva | 05/08 | Corrente Meia Cana 5mm - 70cm (novo) | 300 | — | — | 300 |
| Jorge Luiz | 07/08 | Pulseira Piastrine 2mm - 19cm - Fecho Tradicional | 50 | — | — | 50 |
| Philipe | 07/08 | Kit Corrente Piastrine 3,6mm - 70cm + Pingente | 199,90 | 42,90 | 10 | 167 |
| Cainã Silva | 08/08 | Conjunto Piastrine 3,6mm - 70cm (novo kit) | 197 | — | 10 | 207 |
| Wogran | 08/08 | Corrente Cadeado 2mm - 60cm | 130 | 20 | 15 | 125 |
| Victor Ferreira | 08/08 | Corrente Cadeado Duplo 2,8mm - 70cm | 180 | 33 | — | 147 |
| Ivan de França | 08/08 | Kit Cadeado duplo 2,8mm - 70cm + Pingente | 210 | 30 | — | 180 |
| Wando | 12/08 | Kit Cadeado 4mm - 70cm + Pingente | 250 | 50 | 10 | 210 |
| Carlos André | 12/08 | Pulseira Cubinho - 19cm | 100 | 35 | — | 65 |
| Thyago Ygma | 13/08 | Escapulário Sagrado Coração e N. S. do Carmo 70cm; Pulseira Cubinho 19cm | 149,90 + 100 | 74,90 | — | 175 |
| Joselito Paiva | 15/08 | Kit Cadeado 4mm - 60cm + Pingente | 250 | 50 | — | 200 |
| LN | 17/08 | Kit Cadeado 2mm - 70cm + Pingente | 160 | 30,10 | — | 129,90 |
| José Saldanha | 19/08 | Pingente Ferradura M | 45 | 5 | 20 | 60 |
| João Paulo | 19/08 | Pulseira Piastrine 2mm - 21cm - Fecho Gaveta | 70 | 5 | 15 | 80 |
| Leandro Lima | 20/08 | Kit Cadeado 4mm - 70cm + Pingente | 250 | — | — | 250 |
| Sem nome (83998356504) | 21/08 | Kit Cadeado 2mm - 70cm + Pingente | 160 | 10 | — | 150 |
| Juliana Souza | 26/08 | Kit Cadeado 4mm - 70cm + Pingente | 250 | 50 | — | 200 |
| Nilson | 27/08 | Colar Riviera Zircônia Branca 45cm | 139,90 | 9,90 | — | 130 |
| Kalyanny | 27/08 | Corrente Piastrine 3,6mm - 60cm; Pingente Nossa Senhora P | 170 + 30 | — | — | 200 |
| Paulo Xavier | 27/08 | Conjunto Colar Borboleta + Brinco c/ Pedras | 180 | 20,10 | — | 159,90 |

\* Thiago Marinho: o valor vendido (99,90) é maior que o catálogo (90). Nesse caso o item entra por 99,90 (preço praticado), sem desconto.

## Produtos a cadastrar

- **Corrente Meia Cana 5mm - 70cm** — categoria Correntes, tipo simples, preço 300, custo a definir depois.
- **Conjunto Piastrine 3,6mm - 70cm** — kit equivalente ao de 60cm já existente, preço 197 (custo/composição a confirmar). Se preferir usar o kit "Kit Corrente Piastrine 3,6mm - 70cm + Piastrine" (199,90) em vez de criar um novo, é só avisar.

## Detalhes técnicos

- Inserções via SQL de dados (leads, sales, sale_items, sale_payments, product_batches), com `created_at` na data informada.
- Kits (`type='bundle'`) baixam estoque pelos componentes; para as vendas até 17/08 a entrada de lote é feita em cada componente do kit.
- Valores arredondados a 2 casas; `subtotal`, `discount_value`, `client_freight`, `total_paid` preenchidos coerentemente e `status='completed'`.
- Também será criada a transação de entrada no Financeiro para cada venda, na data da venda, mantendo Receita e Dashboard corretos.
