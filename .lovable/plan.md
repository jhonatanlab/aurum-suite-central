# Liberar acesso Starter para PH Joias (phjoias02@gmail.com)

## O que está acontecendo

Verifiquei a conta: o e-mail phjoias02@gmail.com é o proprietário da empresa **PH Joias**, que está marcada como **starter** e ativa no cadastro. Porém a empresa **não tem nenhuma assinatura registrada** no sistema de cobrança. Como a liberação de módulos hoje só olha para a assinatura (e, na falta dela, consulta a Stripe pelo e-mail), o sistema trata a conta como "sem plano" e bloqueia tudo — sobrando apenas Dashboard e Meu Negócio.

## O que vou fazer

1. **Liberar a conta agora**: registrar para a PH Joias um plano Starter ativo de cortesia (concedido pelo Admin), sem cobrança, para que os módulos do Starter voltem imediatamente.
2. **Evitar que isso se repita**: quando uma empresa não tiver assinatura registrada mas tiver um plano definido no cadastro pelo Admin (e estiver ativa), o sistema passa a respeitar esse plano em vez de bloquear tudo.

Resultado para o usuário: acesso a Dashboard, CRM, Vendas (PDV), Produtos, WhatsApp, Campanhas, Financeiro, Garantias e Meu Negócio. Revendedores continua bloqueado, pois não faz parte do Starter.

## Detalhes técnicos

- Migração de dados: `INSERT` em `public.subscriptions` para `company_id = 43e1ec3f-e891-4839-9735-f07928c22a3d` com `plan = 'starter'`, `status = 'active'`, `stripe_subscription_id = 'manual_comp_<company_id>'` (marcador de concessão manual, sem Stripe), `current_period_end` nulo.
- `supabase/functions/check-plan-limits/index.ts`: antes do fallback para a Stripe, ler `companies.plan` e `companies.status`; se `status = 'active'` e `plan` ∈ {starter, profissional, growth}, usar esse plano (log `Plan resolved from companies.plan`). O fallback Stripe permanece como última opção.
- Redeploy da função `check-plan-limits`.
- Nenhuma alteração de UI é necessária; `usePlanUsage` e `ProtectedRoute` já derivam os bloqueios do retorno dessa função.
