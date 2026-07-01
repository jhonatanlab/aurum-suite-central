## Problema

O sidebar do Felipe volta com todos os módulos travados (🔒) mesmo depois do "Desbloquear" no Admin SaaS. Motivo: o unlock manual só atualiza o banco (`companies.status` e `subscriptions.status`), mas quem decide os limites do plano é a Edge Function `check-plan-limits`, que **consulta o Stripe diretamente** (`stripe.subscriptions.list({status:"active"})`). Como a assinatura no Stripe permanece cancelada, ela devolve `currentPlan = "none"` → `blocked_modules` cobre tudo → sidebar mostra todo mundo bloqueado.

## Correção

Tornar o banco local a fonte de verdade primária em `check-plan-limits`, com Stripe apenas como fallback.

### `supabase/functions/check-plan-limits/index.ts`

1. Antes de chamar Stripe, buscar a assinatura mais recente da empresa em `public.subscriptions` (via `adminClient`, ordenada por `created_at desc`).
2. Se existir um registro com `status` em `('active','trialing','canceling')`, resolver o plano a partir do próprio campo `plan` (já é `starter | profissional | growth`) e **pular a chamada ao Stripe**.
   - Se `plan` estiver vazio, mapear `price_id`/`stripe_subscription_id` conforme necessário; fallback: `starter`.
3. Só cair no bloco atual do Stripe quando não houver nenhuma subscription local válida.
4. Manter o atalho de superadmin como está.

Isso faz o "Desbloquear" do painel admin ter efeito imediato: ao marcar `subscriptions.status='active'`, a função passa a devolver o plano correto e o sidebar libera os módulos.

### Nada mais muda

- Frontend (`usePlanUsage`, `useSubscription`, sidebar) continua igual.
- Webhooks do Stripe seguem atualizando `subscriptions` normalmente, então clientes reais não são afetados.
- Nenhuma migration necessária.

## Verificação

Após o deploy, abrir o dashboard do Felipe e conferir que CRM, Vendas, Produtos, WhatsApp, Financeiro e Garantias ficam desbloqueados (Starter ainda mantém Revendedores travado, que é o comportamento correto do plano).