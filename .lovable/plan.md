## Diagnóstico

O erro `duplicate key value violates unique constraint "products_company_sku_unique"` acontece porque já existe um produto cadastrado na mesma empresa com o **SKU 457**.

Confirmação no banco:
- Empresa: **Uxe Joias**
- Produto existente: **Teste de Variação**
- SKU: **457**
- Status: **inativo**

A tabela `products` possui um índice único parcial:
```sql
CREATE UNIQUE INDEX products_company_sku_unique
ON public.products (company_id, sku)
WHERE (sku IS NOT NULL AND sku <> '');
```

Ou seja, dentro da mesma empresa, o SKU não pode se repetir, mesmo que o produto anterior esteja inativo. O mesmo vale para o código de barras (`products_company_barcode_unique`).

## Plano de correção

### 1. Validação preemptiva no frontend
No `ProductModal.tsx`, antes de chamar `onSave`, verificar se o SKU e o código de barras preenchidos já existem em outro produto da mesma empresa. Usar a lista `allProducts` já carregada no modal.

- Se houver duplicidade de SKU: exibir `toast.error("SKU já cadastrado em outro produto")` e bloquear o submit.
- Se houver duplicidade de código de barras: exibir mensagem similar.
- Ignorar o próprio produto quando estiver editando.

### 2. UX no campo de SKU
- Adicionar mensagem abaixo do input quando o SKU estiver duplicado.
- Destacar o campo com borda vermelha.

### 3. Consideração sobre reativação (opcional)
Como o produto com SKU 457 já existe e está inativo, o usuário pode querer reativá-lo/editá-lo em vez de criar um novo. Podemos adicionar uma dica no toast: "Já existe um produto inativo com esse SKU. Deseja reativá-lo?" — mas isso pode aumentar o escopo. A validação básica já resolve o erro.

## Arquivos alterados
- `src/components/products/ProductModal.tsx`

## O que não será alterado
- Nenhuma migration.
- Nenhuma regra de negócio de variações, POS ou estoque.
- Não será removida a constraint do banco (ela é correta).