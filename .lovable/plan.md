## Problema

O botão "Desbloquear" só aparece quando `company.status !== "active"`. Porém a empresa **felipe joias** tem:
- `companies.status = "active"`
- `subscriptions.status = "canceled"`

Ou seja, o cancelamento veio pelo webhook do Stripe e atualizou a subscription, mas o `companies.status` continuou como `active`. Por isso a lista mostra "Ativa" e o botão de desbloquear não aparece — mesmo o usuário estando de fato bloqueado (o middleware de assinatura redireciona pra `/billing` baseado na subscription, não no `companies.status`).

## Correção

Fazer a UI de Admin > Empresas usar o **status efetivo** = combinação de `companies.status` + status da última `subscriptions`.

### 1. `src/pages/admin/AdminEmpresas.tsx`
- No `fetchData`, buscar também a última subscription de cada empresa (`subscriptions` ordenado por `created_at desc`, agrupado por `company_id`) trazendo `status`.
- Criar helper `getEffectiveStatus(company, sub)`:
  - Se `sub.status` for `canceled` / `cancelled` / `past_due` / `unpaid` / `incomplete_expired` → retorna esse status (tem prioridade sobre `companies.status = "active"`).
  - Se `companies.status` estiver definido e não for `active`/`trial`, retorna ele.
  - Caso contrário retorna `companies.status` (active/trial/etc).
- Substituir `company.status` por `effectiveStatus` em:
  - `getCompanyStatusBadge(effectiveStatus)` na coluna Status.
  - Cálculo de `isBlocked = effectiveStatus !== "active" && effectiveStatus !== "trial"` que controla o botão inline "Desbloquear".
- Passar `effectiveStatus` (via prop nova ou sobrescrevendo `company.status` numa cópia) para o `CompanyDetailPanel`.

### 2. `src/components/admin/CompanyDetailPanel.tsx`
- Trocar a condição do bloco "Empresa com acesso bloqueado" para o mesmo critério (`effectiveStatus !== 'active' && effectiveStatus !== 'trial'`) — mais tolerante que a checagem atual.

### 3. `unblockCompany` (já existe)
- Continua igual: força `companies.status = 'active'` e a última subscription para `status = 'active'`. Só o gatilho visual precisa mudar.

## Resultado esperado

- **felipe joias** aparecerá com badge **"Cancelada"** na lista.
- Botão **"Desbloquear"** aparecerá tanto na linha da tabela quanto no painel de detalhes.
- Clicando, empresa e subscription voltam para `active` e o usuário sai da tela `/billing`.
