
# Novo fluxo de variações — Wizard em etapas

Substituir o toggle + "salve primeiro" por um **wizard integrado** no modal de novo produto, que permite definir tudo (pai + variações) antes de salvar. Nenhuma migration nova — a estrutura de banco (`parent_id`, `type='variation'`) já existe.

## Fluxo do usuário

```text
[Etapa 1: Tipo]         [Etapa 2: Dados do pai]     [Etapa 3: Atributos]      [Etapa 4: Matriz]
Simples                 Nome, categoria,             Cor:  Dourado, Prata     Tabela gerada:
Kit                     ficha técnica,               Tam:  P, M, G            Dourado/P  R$ ... SKU ... estoque ...
Com variações  ←        imagens                                               Dourado/M  ...
                        (sem preço/estoque)                                   Prata/P    ...
                                                                              [Salvar tudo]
```

- Escolhe "Com variações" na etapa 1 (volta a ser card no seletor — sem toggle escondido).
- Etapas 2 e 3 podem ser navegadas com Voltar/Avançar. Etapa 4 gera todas as combinações automaticamente e permite editar preço, custo, estoque, SKU, código de barras por linha (com opção de aplicar em massa).
- Para produtos **Simples** e **Kit**, o modal se comporta como hoje (sem etapas), mudando só o seletor inicial.
- Botão final "Salvar produto" cria o pai + todas as variações filhas numa única ação transacional no frontend (insert pai → insert filhos com `parent_id`).

## Mudanças de código

**`src/components/products/ProductModal.tsx`**
- Remover o toggle "Este produto tem variações" (fonte da dor atual).
- Voltar o seletor de tipo para 3 cards: Simples / Kit / Com variações (grid-cols-3).
- Quando `type === "variable"`:
  - Renderizar em modo **wizard** com um stepper no topo (Etapas 1–4) e footer com Voltar/Avançar/Salvar.
  - Etapa 2 (Dados) reaproveita os campos existentes de nome/categoria/ficha técnica; oculta preço, custo e estoque.
  - Etapa 3 (Atributos): input dinâmico "Adicionar atributo" (nome + lista de valores tipo chips). Mínimo 1 atributo com 1 valor.
  - Etapa 4 (Matriz): tabela com uma linha por combinação cartesiana. Colunas: combinação (readonly), preço, custo, estoque inicial, SKU (autogerado sugerido), código de barras. Botão "Aplicar a todas" para preço/custo/estoque.
- Validação de SKU duplicado já implementada continua ativa por linha da matriz.
- Em edição de produto variable existente: pula direto para uma visão que reaproveita `VariationsSection` (comportamento atual mantido para produtos já criados).

**`src/pages/Produtos.tsx`**
- Ajustar `createMutation` para aceitar payload com `variations: []` quando `type === "variable"`:
  1. Insere o produto pai (preço/estoque zerados).
  2. Insere as variações em lote (`.insert([...])`) com `parent_id`, `type: 'variation'`, herdando ficha técnica do pai.
  3. Insere `product_batches` iniciais para cada variação com estoque > 0.
- Se qualquer passo falhar, faz rollback manual (deletar pai) e mostra erro.
- Pular validação de lote na etapa do pai (já está pulado para `variable`).

**Componentes auxiliares (novos, pequenos)**
- `src/components/products/VariationWizardSteps.tsx` — stepper visual (1-2-3-4).
- `src/components/products/AttributeBuilder.tsx` — UI de atributos + valores (chips).
- `src/components/products/VariationMatrix.tsx` — tabela editável da matriz + geração cartesiana + ações em massa.

**Remover/depreciar**
- `VariationModal.tsx` deixa de ser usado na criação (continua disponível para adicionar variações avulsas em produtos já salvos, via `VariationsSection` na edição).

## Detalhes técnicos

- Geração da matriz: produto cartesiano dos valores de cada atributo, chave estável baseada na concatenação dos valores para evitar recriar linhas ao voltar entre etapas.
- SKU autogerado sugerido: `{sku_pai || slug(nome)}-{valores-abreviados}` — editável.
- Estado do wizard fica no próprio `ProductModal` (`useState`), sem persistir rascunhos.
- Nenhuma alteração em POS, hooks de venda, FIFO, edge functions, RLS ou schema.
- Sem novas dependências.

## Fora de escopo

- Imagens por variação (fica para depois, se pedir).
- Edição da matriz completa para produtos já existentes (mantém `VariationsSection` atual).
- Importação em massa via CSV.
