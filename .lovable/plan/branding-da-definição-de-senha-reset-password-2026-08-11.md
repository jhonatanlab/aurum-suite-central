# Branding da definição de senha (reset-password)

A tela e o e-mail de definição de senha estão usando o domínio de preview do Lovable e não exibem a marca Aurum Suite. O domínio de e-mail ainda não foi configurado para o projeto.

## Problemas identificados

1. Nenhum domínio de e-mail configurado: os e-mails de autenticação saem com remetente/URL genéricos do Lovable.
2. Nenhum template de e-mail de autenticação personalizado.
3. A Edge Function `admin-create-company` usa `window.location.origin` como base do link de redefinição, então o link aponta para o preview quando o admin está no preview.
4. A página `ResetPassword.tsx` usa texto + ícone em vez da logo real da Aurum Suite.

## Solução

1. Configurar o domínio `aurumsuite.cloud` para envio de e-mails.
2. Criar os templates de e-mail de autenticação (auth email templates) com a identidade visual Aurum Suite.
3. Aplicar branding: cores dark/gold, logo `public/aurum-suite-logo.png` e tom de voz do app.
4. Fazer deploy da Edge Function `auth-email-hook`.
5. Alterar `admin-create-company` para sempre usar o domínio publicado (`https://aurumsuite.cloud`) no `redirectTo`, ignorando `window.location.origin`.
6. Alterar `ResetPassword.tsx` para exibir a logo real da Aurum Suite no topo.
7. Verificar/ajustar o Site URL da autenticação para `https://aurumsuite.cloud`.

## Arquivos afetados

- `supabase/functions/auth-email-hook/index.ts` (novo)
- `supabase/functions/_shared/email-templates/*.tsx` (novos)
- `supabase/functions/admin-create-company/index.ts`
- `src/pages/ResetPassword.tsx`
- `supabase/config.toml` (atualizado pelo scaffold)

## Resultado esperado

- E-mail de definição de senha enviado de `@aurumsuite.cloud`.
- Link de redefinição apontando para `https://aurumsuite.cloud/reset-password`.
- Tela de reset-password exibindo a logo Aurum Suite.
- Templates com cores e tipografia da marca.
