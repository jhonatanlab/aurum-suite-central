
## Problemas observados

1. **Salva ao clicar em "Avançar" para a Matriz de Variação.** Hoje o mesmo slot do rodapé alterna entre "Avançar" (type=button) e "Salvar" (type=submit). Quando o passo 3 monta, `canSubmit` já é `true` (para `variable`, `isBatchValid` é forçado como `true`), então qualquer Enter/duplo clique/relayout dispara o submit do form imediatamente.
2. **Perdemos a entrada de Lote (rastreabilidade).** Em produto "Com variações" a seção "Lote de Entrada" foi escondida e a Matriz não tem campos de lote, fornecedor, custo do lote, código, validade. As variações são criadas com batch mínimo (só quantidade inicial em `createMutation` da `Produtos.tsx`), sem código de lote/fornecedor.

## O que fazer

Escopo cirúrgico em 3 arquivos, sem migration.

### 1) `src/components/products/ProductModal.tsx` — travar submit no wizard

- Adicionar um 4º passo ao wizard: `1 Dados → 2 Atributos → 3 Matriz → 4 Lote`. `wizardStep` passa a ser `1 | 2 | 3 | 4`.
- Enquanto `isVariable && !isEditing && wizardStep < 4`, o rodapé **só** renderiza botões `type="button"` (Voltar / Avançar). O botão `type="submit"` (Salvar) só existe no passo 4. Isso elimina o risco do submit "vazar" no clique de Avançar.
- Blindar o `<form onSubmit>`: `if (isVariable && !isEditing && wizardStep !== 4) return;` no início do `handleSubmit`, para cobrir Enter em inputs.
- Validação por passo antes de avançar:
  - passo 1 → nome obrigatório;
  - passo 2 → ≥ 1 atributo com valores;
  - passo 3 → toda variação com `price > 0`;
  - passo 4 → `batch_code` obrigatório (regra igual à do produto simples).

### 2) `src/components/products/ProductModal.tsx` — passo 4 "Lote de Entrada"

- Renderizar, quando `isVariable && !isEditing && wizardStep === 4`, o mesmo bloco de Lote já usado por produto simples: `batch_code`, `supplier_id`, `cost_price` do lote, `expiration_date`, observações. Sem campo de quantidade nesse passo — a quantidade por variação já vem da Matriz (passo 3).
- Manter `formData.batch` como fonte única desses metadados (compartilhado entre todas as variações desse cadastro inicial).

### 3) `src/pages/Produtos.tsx` — persistir lote com rastreabilidade

Na `createMutation`, ramo `isVariable`:
- Após inserir as variações, para cada variação com `stock > 0` criar um `product_batches` usando `formData.batch` como base:
  - `batch_code`: `formData.batch.batch_code` (ou `${batch_code}-${sufixo da combo}` para manter unicidade se o schema exigir; se não, reutilizar puro);
  - `supplier_id`, `cost_price`, `expiration_date`, `notes` vindos de `formData.batch`;
  - `quantity` / `remaining_quantity` = estoque da linha da Matriz;
  - `product_id` = id da variação recém-criada;
  - `company_id` = empresa atual.
- Remover o insert atual "mínimo" de batch (sem código) para variações. Trigger de estoque já sincroniza `products.stock`.

### 4) Rodapé — layout dos botões

```text
[ Cancelar ] [ Voltar ]                          [ Avançar → ]     ← passos 1-3
[ Cancelar ] [ Voltar ]                          [ Salvar ]        ← passo 4 (único type=submit)
```

## Fora de escopo

- Nenhuma mudança de schema, RLS ou edge function.
- Fluxo de edição de produto variável continua como está (usa `VariationsSection`).
- Produto simples e kit não são tocados.
