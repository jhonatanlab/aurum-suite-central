# Painel de empresas no Admin: exclusão de contas e ficha completa

## O que muda

### 1. Painel lateral da empresa muito mais completo
Ao abrir uma empresa na lista do Admin, além do que já aparece hoje (nome, CNPJ, status, plano, WhatsApp), serão exibidas três novas seções:

- **Responsável**: nome, e-mail de login, telefone e data do cadastro.
- **Equipe**: lista de todos os usuários da conta com e-mail e função (Proprietário, Gerente, Vendedor), com botão para copiar o e-mail.
- **Uso do plano**: quantidade de produtos, vendas, clientes/leads e revendedores cadastrados, comparada com o limite do plano contratado.

### 2. Apagar conta definitivamente
No painel lateral, um bloco "Zona de risco" no rodapé com o botão **Excluir empresa**. Ao clicar:

1. Abre uma confirmação que mostra o que será apagado (quantos produtos, vendas, usuários) e exige digitar o nome exato da empresa para liberar o botão.
2. Se houver assinatura ativa, ela é cancelada automaticamente na Stripe antes da exclusão.
3. Todos os dados da empresa são apagados (vendas, produtos, estoque, clientes, revendedores, financeiro, WhatsApp, arquivos enviados) e os usuários de acesso são removidos, de forma que não conseguem mais entrar.
4. A lista é atualizada e aparece um aviso de conclusão.

A ação é irreversível e fica registrada no log da operação.

## Detalhes técnicos

**Nova Edge Function `admin-company-details`**
- Valida JWT com `getClaims(token)` e exige `has_role(uid,'superadmin')`.
- Retorna: dados do owner (via `companies.owner_uid` → `auth.admin.getUserById`: email, phone, user_metadata.full_name, created_at, last_sign_in_at), membros de `company_users` com e-mail resolvido por `auth.admin`, e contagens `head:true` de `products` (status ativo), `sales`, `leads`, `resellers`, `company_users`.

**Nova Edge Function `admin-delete-company`**
- Mesma validação de superadmin; recusa se a empresa alvo for a do próprio chamador.
- Busca `subscriptions`/`stripe_customers` da empresa; se houver assinatura não cancelada, chama `stripe.subscriptions.cancel` usando a chave conforme `ENVIRONMENT` (mesma lógica de `stripe-service`).
- Remove arquivos dos buckets `product-images`, `financial-receipts`, `reseller-documents` e `campaign-media` referentes à empresa.
- Delete em ordem de dependência com service role: `sale_payments`/`sale_items` (por `sale_id`), `sales`, `consignment_items`, `consignment_closings`, `reseller_payments`, `reseller_documents`, `reseller_history`, `resellers`, `warranty_requests`, `product_batches`, `product_images`, `bundle_items`, `products`, `crm_history`, `leads`, `crm_stages`, `financial_transactions`, `recurring_transactions`, `financial_categories`, `payment_gateways`, `campaign_recipients`, `campaigns`, `whatsapp_*`, `tags`, `suppliers`, `subscriptions`, `stripe_customers`, `company_users`, `companies`.
- Para cada `user_id` que pertencia somente a essa empresa: apaga `user_roles` e `auth.admin.deleteUser`.
- Retorna resumo contando registros removidos.

**Frontend**
- `CompanyDetailPanel.tsx`: carrega `admin-company-details` quando abre (React Query com `enabled: open`), novas seções de Responsável / Equipe / Uso, skeleton enquanto carrega, e bloco de zona de risco.
- Novo `DeleteCompanyDialog.tsx` (AlertDialog com input de confirmação por nome).
- `AdminEmpresas.tsx`: ação de exclusão também no menu da linha da tabela; recarrega a lista ao concluir.
- Estética Aurum mantida: fundo escuro, cartões `bg-background border-border`, destaque dourado e bloco de exclusão em vermelho.
