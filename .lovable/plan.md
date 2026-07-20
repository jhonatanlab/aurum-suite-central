# Barra de navegação inferior no mobile

Substituir o botão hambúrguer no header (apenas mobile) por uma **bottom bar flutuante** com 4 atalhos principais. O menu completo continua acessível pelo botão "Menu".

## Escopo

Somente mobile (`useIsMobile()`). Desktop permanece igual (sidebar fixa/colapsável).

## Componentes

**Novo:** `src/components/layout/MobileBottomNav.tsx`
- Barra fixa em `bottom-0`, flutuante (com margem, `rounded-2xl`, `glass` + borda gold sutil, sombra), z-index alto (acima do conteúdo, abaixo do overlay do sidebar).
- 4 itens, cada um com ícone (lucide) + label pequena:
  1. **Dashboard** → `/` (`LayoutDashboard`)
  2. **Vendas** → `/vendas` (`ShoppingCart`)
  3. **Clientes** → `/crm?tab=contatos` (`Users`)
  4. **Menu** → abre o sidebar mobile (`Menu`)
- Item ativo destacado em `hsl(var(--gold))` (ícone + label + indicador superior).
- Respeita `VENDEDOR_ALLOWED_PATHS` (vendedor vê os 4 igualmente, todos permitidos).
- Respeita `blockedPaths` do `usePlanUsage` (item bloqueado abre `/billing` ou mostra tooltip — seguir mesmo padrão do sidebar: cadeado + opacidade reduzida).

**Alterado:** `src/components/layout/AppLayout.tsx`
- Renderiza `<MobileBottomNav onMenuClick={() => setMobileSidebarOpen(true)} />` só quando `isMobile`.
- Adiciona `pb-24` (ou `pb-28`) ao `<main>` no mobile para não cobrir conteúdo.

**Alterado:** `src/components/layout/Header.tsx`
- No mobile, esconder o botão hambúrguer (Menu) — a função vai para a bottom bar. Manter título/breadcrumb.

**Alterado:** `src/pages/CRM.tsx` (leve)
- Ler `?tab=contatos` da URL na montagem e ativar a aba de Contatos. Sem mudar comportamento padrão quando o parâmetro não vier.

## Detalhes técnicos

- Ativo por rota: `useLocation().pathname` — considerar "Clientes" ativo quando `pathname === "/crm"`.
- Item "Menu" abre o `Sheet`/overlay do sidebar mobile já existente (via prop `onMenuClick`).
- Usar tokens do design system (`--gold`, `glass`, `--sidebar-border`); nenhum hex hardcoded.
- Safe-area: `pb-[env(safe-area-inset-bottom)]` no wrapper da barra.
- Sem novas dependências.

## Fora de escopo

- Alterações desktop.
- Mudar a estrutura do sidebar/menu existente (continua sendo o mesmo drawer, só muda o gatilho).
- Backend/RLS/queries.