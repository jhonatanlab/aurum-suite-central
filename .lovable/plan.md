## Objetivo
Adicionar um novo card de KPI ao Dashboard exibindo a quantidade de produtos em estoque, posicionado ao lado da Taxa de Conversão, e reduzir o tamanho dos cards em 25% na visualização mobile.

## Escopo
Apenas alterações visuais e de dados de dashboard. Nenhuma mudança em hooks de filtro, layout global ou design system.

Arquivos afetados:
- `src/hooks/useDashboardData.ts`
- `src/pages/Dashboard.tsx`

## 1. Dados de estoque (`useDashboardData.ts`)

Adicionar ao `DashboardKPIs` uma nova propriedade `stockQuantity` representando a quantidade total de unidades em estoque de produtos ativos da empresa.

- Criar nova query que some o campo `stock` da tabela `products` para registros onde `company_id = ?`, `status = 'active'` e `stock > 0`.
- Retornar o total no objeto de KPIs.
- Garantir que o loading do KPI acompanhe `kpisLoading`.

## 2. Novo card de KPI (`Dashboard.tsx`)

- Incluir novo item no array `kpiCards`, após "Taxa de Conversão":
  - Título: "Estoque"
  - Valor: `kpis.stockQuantity.toString()`
  - Ícone: `Package`
- Ajustar grid de KPIs para acomodar 6 cards:
  - Mobile: `grid-cols-2` (6 cards = 3 linhas)
  - `md`: `grid-cols-3`
  - `lg`: `grid-cols-6`

## 3. Redução de 25% no mobile

Aplicar classes responsivas para diminuir os cards abaixo de `sm`:

- `CardHeader`: `p-4 sm:p-6` → `p-3 sm:p-6`
- Ícone container: `h-8 w-8 sm:h-9 sm:w-9` → `h-6 w-6 sm:h-9 sm:w-9`
- Ícone: `h-4 w-4` → `h-3.5 w-3.5 sm:h-4 sm:w-4`
- Título: `text-[10px] sm:text-xs` → `text-[9px] sm:text-xs`
- Valor: `text-lg sm:text-xl` → `text-base sm:text-xl`
- `CardContent`: `p-4 pt-0 sm:p-6 sm:pt-0` → `p-3 pt-0 sm:p-6 sm:pt-0`

Isso mantém o desktop inalterado e reduz proporcionalmente o espaçamento e tipografia no mobile.

## 4. Fora de escopo
- Não alterar `DashboardFilters.tsx`, `AppLayout`, `Header`.
- Não modificar cores, tokens ou animações dos cards.
- Não alterar regras de negócio de vendas, leads ou estoque baixo.

## Validação
- Build passa sem erros.
- Preview mobile: 6 cards visíveis em 2 colunas, 3 linhas, com tamanho reduzido.
- Preview desktop: 6 cards em linha única (`grid-cols-6`), tamanho atual preservado.
- Valor de estoque reflete a soma real de unidades dos produtos ativos.