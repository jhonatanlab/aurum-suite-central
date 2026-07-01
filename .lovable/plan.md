## Objetivo
Fazer o Admin SaaS > Empresas refletir o status real da empresa e permitir desbloqueio manual (override do admin).

## Alterações

### 1. `src/pages/admin/AdminEmpresas.tsx`
- Ajustar `getStatusBadge` para exibir corretamente os status reais possíveis: `active`, `trial`, `suspended`, `canceled`, `past_due`, `blocked`. Hoje, qualquer valor desconhecido cai no fallback verde "Ativa" — por isso `felipejoiasss@gmail.com` (status = canceled/blocked) aparece como Ativa.
  - `canceled` → badge vermelho "Cancelada"
  - `past_due` → badge âmbar "Inadimplente"
  - `blocked` → badge vermelho "Bloqueada"
  - Fallback deixa de assumir "Ativa"; mostra o valor cru capitalizado com badge neutro.
- Adicionar coluna/botão **Desbloquear** na tabela (visível apenas quando `status !== 'active'`):
  - Botão com ícone `Unlock`, cor primária (gold).
  - Ao clicar → confirma via `AlertDialog` ("Isso libera o acesso da empresa manualmente, mesmo sem assinatura ativa. Continuar?").
  - Executa `UPDATE companies SET status = 'active' WHERE id = ...` via `supabase.from('companies').update(...)`.
  - Toast de sucesso + refetch da lista.
- Mesmo botão replicado no `CompanyDetailPanel` para desbloqueio a partir do painel de detalhes.

### 2. `src/components/admin/CompanyDetailPanel.tsx`
- Atualizar `getStatusBadge` com os mesmos status novos (consistência).
- Adicionar botão "Desbloquear empresa" no topo do painel quando status ≠ `active`, com o mesmo fluxo de confirmação e update.
- Aceitar prop `onStatusChange` para o pai re-fazer o fetch.

### 3. Impacto no bloqueio (`useSubscription` / `ProtectedRoute`)
- O hook `useSubscription` lê da tabela `subscriptions`, não de `companies.status`. Como a decisão foi **override manual do admin**, precisamos garantir que o override realmente libere o acesso.
- Solução: no clique em "Desbloquear", além de `companies.status = 'active'`, também fazer `UPDATE subscriptions SET status = 'active' WHERE company_id = ... ORDER BY created_at DESC LIMIT 1` (via RPC ou update direto). Isso faz `useSubscription` devolver `isAllowed = true` e o `ProtectedRoute` para de redirecionar para `/billing`.
- Se não houver linha em `subscriptions`, `useSubscription` já retorna `active/free` (isAllowed = true), então basta o update em `companies`.

### Detalhes técnicos
- Sem migration necessária — só usa colunas existentes (`companies.status`, `subscriptions.status`).
- Update de `subscriptions` feito com `.eq('company_id', id).order('created_at', {ascending:false}).limit(1)` — como PostgREST não aceita `order/limit` em update, faremos um `select` para pegar o `id` da última subscription e depois `update` por id.
- Toast via `use-toast`.
- `AlertDialog` do shadcn já disponível.

### Fora de escopo
- Não altera nada no Stripe (não reativa assinatura remota). O override é puramente local; se o Stripe emitir novo evento, ele sobrescreve. Isso será deixado claro no texto do dialog de confirmação.
