# Criar empresas pelo Admin SaaS

Adicionar em Admin SaaS > Empresas a criação manual de uma empresa com seu proprietário, sem definir senha: o usuário recebe um e-mail para criar a própria senha.

## Fluxo

1. Botão "Nova Empresa" no topo da página de Empresas abre um modal com:
   - Nome da empresa (obrigatório)
   - CNPJ (opcional)
   - Nome do responsável (obrigatório)
   - E-mail do responsável (obrigatório)
   - Plano (Starter / Pro / Growth)
   - Status inicial (Ativa / Trial)
2. Ao confirmar, o sistema cria a empresa, cria (ou reaproveita) o usuário do responsável e o vincula como proprietário.
3. O responsável recebe um e-mail de convite com link para definir a senha, que aponta para a tela de redefinição de senha do app.
4. A lista de empresas é atualizada e uma confirmação informa que o e-mail foi enviado.

Se o e-mail já existir no sistema, é enviado um link de definição de senha em vez de um novo convite, e o usuário é vinculado à nova empresa como proprietário.

## Detalhes técnicos

- Nova Edge Function `admin-create-company`:
  - Valida o token com `supabase.auth.getClaims(token)` e exige papel `superadmin` via `has_role`.
  - Usa service role para: `insert` em `companies` (name, cnpj, plan, status, owner_uid), criar usuário com `auth.admin.inviteUserByEmail` (redirectTo `${origin}/reset-password`) ou, se já existir, `generateLink` tipo `recovery`; `insert` em `company_users` com role `owner`.
  - Rollback da empresa criada se o vínculo falhar.
  - Registrada em `supabase/config.toml` com `verify_jwt = false` (validação feita em código), seguindo o padrão das demais funções.
- Novo componente `src/components/admin/NewCompanyModal.tsx` (Dialog, estética dark/gold do Aurum Suite) chamando a função via `supabase.functions.invoke`.
- `src/pages/admin/AdminEmpresas.tsx`: botão "Nova Empresa" no cabeçalho, estado do modal e `fetchData()` após sucesso.
- Sem migrations: as tabelas `companies` e `company_users` já suportam esses campos.
