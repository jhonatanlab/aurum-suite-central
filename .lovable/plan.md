## Problema

No `LeadSidePanel` (CRM), a aba **Informações** mostra apenas a "Data de Cadastro" do lead. Quando o lead virou cliente e teve venda(s) registradas no POS (`sales.client_id = lead.id`), a **data da venda** não aparece em lugar nenhum do painel.

## Solução

Adicionar uma seção **"Vendas do Cliente"** na aba Informações do `LeadSidePanel`, logo abaixo de "Dados Adicionais", listando todas as vendas vinculadas ao lead.

### O que vai aparecer

Para cada venda em `sales` com `client_id = lead.id` e `status != 'cancelled'`:

- Data da venda (`created_at`) formatada `dd/MM/yyyy 'às' HH:mm`
- Total da venda (`total`) em BRL
- Badge com status (Concluída / Pendente)

Ordenação: mais recente primeiro. Sem venda → mensagem discreta "Nenhuma venda registrada".

### Onde buscar

Nova query React Query dentro do próprio `LeadSidePanel`, disparada quando o painel abre e há `lead.id`:

```ts
supabase
  .from("sales")
  .select("id, created_at, total, status")
  .eq("client_id", lead.id)
  .order("created_at", { ascending: false });
```

Query key: `["lead-sales", lead.id]`, `enabled: !!lead?.id && open`.

## Arquivos alterados

- `src/components/crm/LeadSidePanel.tsx` — nova seção "Vendas do Cliente" + hook de fetch.

Sem mudanças de banco, RLS ou lógica de negócio — apenas leitura e apresentação.
