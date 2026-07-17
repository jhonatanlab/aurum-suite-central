
## Objetivo
Otimizar o Dashboard para celular (≤768px), com foco em compactar a barra de filtros e ajustar espaçamentos, tipografia e cartões para caberem confortavelmente na tela pequena.

## Escopo
Apenas mudanças visuais/layout. Nenhuma alteração de lógica de dados, queries ou hooks.

Arquivos afetados:
- `src/components/dashboard/DashboardFilters.tsx`
- `src/pages/Dashboard.tsx`

## 1. Barra de filtros (`DashboardFilters.tsx`) — colapsável no mobile

No mobile a barra hoje ocupa muito espaço vertical (5 selects/datas empilhados). Solução:

- No mobile (`< md`): mostrar apenas um botão compacto "Filtros" com badge do número de filtros ativos + chip do período atual (ex: "01/07 – 17/07"). Ao tocar, abrir um `Sheet` (bottom sheet do shadcn) com os controles em stack vertical (Origem, De, Até, Produto, Vendedor, botão Limpar, botão Aplicar/Fechar).
- No desktop (`md+`): manter a barra horizontal atual sem mudanças.
- Reduzir padding do container no mobile (`p-3` em vez de `p-4`) e usar `rounded-lg`.
- Datas: dentro do Sheet, usar largura total (`w-full`) em cada Popover trigger.
- Sem alterar a `interface DashboardFilters` nem `getDefaultFilters`.

## 2. Página Dashboard (`Dashboard.tsx`) — ajustes mobile

- Grid de KPIs: manter `grid-cols-2` no mobile (já está), mas reduzir gap para `gap-3` e padding dos cards no mobile. Tornar `text-xl` responsivo: `text-lg sm:text-xl` para valores; ícones `h-8 w-8` no mobile.
- Título dos KPIs: quebrar em 2 linhas quando necessário sem estourar (garantir `leading-tight`).
- Charts:
  - Gráfico de Receita: altura `h-[220px]` no mobile, `h-[280px]` md+.
  - Pie de Origens: reduzir `outerRadius`/`innerRadius` responsivos (via prop fixa ok; manter, apenas reduzir container height mobile para `h-[240px]` total).
- Espaçamentos entre seções: `mb-4` no mobile em vez de `mb-6`.
- Tabelas "Últimas Vendas" e "Top Produtos": reduzir padding lateral do CardContent no mobile (`px-2`).
- Adicionar `overflow-x-hidden` no wrapper para prevenir scroll horizontal residual.

## 3. Fora de escopo
- Não mexer em `AppLayout` nem `Header`.
- Não alterar hooks (`useDashboardData`, filtros default).
- Não mudar cores/tokens do design system.

## Validação
- Build passa.
- Preview mobile (391px): filtros ocupam 1 linha compacta; KPIs em 2 colunas legíveis; gráficos sem overflow; sem scroll horizontal.
- Desktop inalterado.
