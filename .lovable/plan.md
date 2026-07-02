## Problema

No carrinho do PDV, ao digitar **Desconto (R$) = 20,00** sobre subtotal de R$ 170,00, o sistema:

1. Preenche automaticamente **Desconto (%) = 11,76** (20 / 170 × 100, arredondado).
2. No cálculo do total, o `useMemo` `calculatedDiscount` prioriza o percentual (11,76%) e recalcula: `170 × 11,76% = 19,99`.
3. Resultado: `170 − 19,99 + 15 = 165,01` em vez dos R$ 165,00 esperados.

A raiz é que `calculatedDiscount` (em `src/pages/Vendas.tsx`, linhas 180-187) sempre prefere o percentual quando ele existe, mesmo quando o valor em R$ foi a entrada original do usuário.

## Correção

Em `src/pages/Vendas.tsx`:

- Ajustar `calculatedDiscount` para usar **sempre o valor em R$** (`discountValue`) como fonte da verdade, já que os handlers mantêm os dois campos sincronizados. O percentual passa a ser apenas exibição/entrada auxiliar.
  - Novo comportamento: se `discountValue > 0`, usa ele diretamente; senão, calcula a partir do percentual.
- Nenhuma mudança na UI, nos inputs ou nos handlers `handleDiscountPercentChange` / `handleDiscountValueChange` — eles continuam preenchendo o outro campo automaticamente.

## Resultado esperado

- Digitando R$ 20,00 de desconto: total = 170 − 20 + 15 = **R$ 165,00** ✅
- Digitando 10% de desconto sobre R$ 170: `discountValue` é preenchido como `17.00` pelo handler → total = 170 − 17 + 15 = **R$ 168,00** ✅ (mesmo comportamento de hoje, sem regressão).

## Escopo

- Apenas `src/pages/Vendas.tsx`, bloco do `useMemo calculatedDiscount`.
- Sem alterações em migrations, hooks ou edge functions.
