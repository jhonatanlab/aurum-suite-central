## Causa do problema

O produto "Kit Corrente Piastrine 2mm - 60cm + Pingente" tem no banco:
- `price = 190`
- `promo_price = 0` (zero, não nulo)

Em `src/pages/Vendas.tsx` (linha 174) a função usa coalescência com `??`:

```ts
const getEffectivePrice = (product) => product.promo_price ?? product.price;
```

Como `0` **não** é `null`/`undefined`, o operador `??` retorna `0` como "preço promocional válido", fazendo o carrinho calcular R$ 0,00. O card do produto na grade não usa essa função (renderiza `price` direto quando não há promo truthy), por isso ele mostra R$ 190 corretamente.

O mesmo bug afeta o subtotal, o total final, o valor enviado ao finalizar a venda (linha 281 `price: Number(getEffectivePrice(...))`) e o `product_value` atualizado no lead.

## Correção

Ajustar `getEffectivePrice` para tratar `promo_price` apenas quando for um número maior que zero:

```ts
const getEffectivePrice = (product: Product) =>
  product.promo_price && product.promo_price > 0
    ? product.promo_price
    : product.price;
```

Nenhuma outra alteração necessária — todos os cálculos (subtotal, acréscimo, total efetivo, payload da venda) já derivam dessa função.

## Observação opcional (não incluída na correção)

A coluna `promo_price` está armazenando `0` em vez de `NULL` quando não há promoção. Poderíamos, em um passo separado, normalizar isso na tela de cadastro de produto (salvar `null` quando o usuário deixar o campo vazio/zero). Posso fazer isso depois se quiser — para esta correção, basta o ajuste acima, que já blinda o PDV contra dados existentes.