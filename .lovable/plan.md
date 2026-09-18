# Mostrar o plano real na lista de empresas

## O problema (confirmado)

Duas causas somadas:

1. Os selos de plano só reconhecem nomes antigos ("pro", "business", "enterprise"). Os planos atuais — Starter, Profissional e Growth — caem no caso padrão e aparecem como "Free".
2. O plano é lido apenas do cadastro da empresa, que às vezes está vazio. A felipe joias, por exemplo, tem assinatura ativa no Starter, mas o campo de plano da empresa está em branco.

Conferido no banco: felipe joias (empresa sem plano, assinatura ativa Starter), PH Joias (empresa Starter, sem assinatura registrada), Uxe Joias (empresa Profissional, com assinaturas antigas duplicadas).

## O que muda

- A lista de empresas e o painel lateral passam a exibir o plano real: **Starter**, **Profissional** ou **Growth**, e **Sem plano** quando não houver nenhum.
- O plano exibido considera primeiro a assinatura mais recente da empresa; se não houver assinatura, usa o plano cadastrado na empresa.
- Os limites mostrados em "Uso do Plano" passam a corresponder aos planos atuais (usuários, produtos e revendedores), em vez dos limites antigos.

## Detalhes técnicos

- `src/pages/admin/AdminEmpresas.tsx`: incluir `plan` no select de `subscriptions` (hoje traz só `company_id, status, created_at`); criar `getEffectivePlan(company)` que usa `subscriptions` (mais recente por `created_at`, já ordenado desc) com fallback para `companies.plan`; reescrever `getPlanBadge` com os casos `starter` / `profissional` / `growth` e default "Sem plano", mantendo a paleta Aurum (dourado para Growth, tons neutros/azulados para os demais).
- `src/components/admin/CompanyDetailPanel.tsx`: mesmos casos em `getPlanBadge`; `getPlanLimits` alinhado ao `PLAN_LIMITS` de `check-plan-limits` (starter 1/100/0, profissional 5/999999/50, growth 999/999999/999999, nenhum 0/0/0); receber o plano efetivo por prop vinda da lista para evitar divergência entre as duas telas.
- Sem alteração de banco e sem alteração das regras de cobrança.
