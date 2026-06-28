# Documento de Onboarding para o Claude — Aurum Suite

Vou criar o arquivo `docs/CLAUDE_CONTEXT.md` na raiz do projeto, contendo um briefing completo que você poderá colar diretamente no Claude (Projects, system prompt ou início de conversa). Ele resume identidade, arquitetura, regras de negócio e convenções técnicas críticas do Aurum Suite.

## Estrutura do documento

### 1. Visão Geral do Produto
- O que é o Aurum Suite: SaaS multi-tenant de gestão para joalherias / negócios de revenda (CRM, Vendas/POS, Estoque, Financeiro, WhatsApp, Revendedores, Garantias).
- Público: lojistas, gerentes, vendedores e revendedores.
- Modelo comercial: assinatura Stripe (Starter, Pro, Growth — sem plano grátis). Usuários sem assinatura ativa são redirecionados para `/billing`.
- MVP Mode: oculta Campanhas, Automações e Configurações avançadas.

### 2. Stack Técnica
- React 18 + Vite + TypeScript + Tailwind + shadcn/ui.
- Lovable Cloud (Supabase) para auth, DB, Storage, Edge Functions.
- React Query (com `refetchOnWindowFocus: false`).
- Integrações: Stripe (assinaturas), n8n (orquestração WhatsApp), Uazapi (WhatsApp API).

### 3. Identidade Visual (não negociável)
- Tema dark premium "Aurum": background `#121212`, superfícies `#1E1E1E`.
- Cor primária Gold `#C7A052` para ações e métricas.
- Texto secundário `#A1A1AA`, headings brancos.
- Bordas XL, glassmorphism em headers, sombras suaves.
- Estética executiva / luxo moderno — nunca "genérico SaaS roxo".

### 4. Arquitetura Multi-tenant & Segurança
- Isolamento por `company_id` via RLS.
- Roles em tabela separada (`user_roles` + função `has_role`) — NUNCA na tabela de profiles.
- Hierarquia: `superadmin` > `owner` > `gerente` > `vendedor`.
- `vendedor` tem acesso limitado (CRM/Vendas), redireciona pro Dashboard.
- Edge Functions usam `supabase.auth.getClaims(token)`, nunca `getUser`.

### 5. Módulos e Regras de Negócio Críticas
- **POS/Vendas**: múltiplos pagamentos, parciais, excedente soma ao Total, backdating editável, checkout gera transação `entrada` no Financeiro (delay 300ms p/ trigger de estoque).
- **Produtos**: soft-delete (`status='inactive'`), bundles com estoque virtual, `promo_price` só vale se `> 0` (zero é tratado como sem promoção), margem auto calculada via `cost_price`.
- **Estoque**: lotes FIFO em `product_batches`, análises MarkUp/Imobilizado/Curva ABC/Giro.
- **Garantias**: análise por lote/fornecedor, troca via POS.
- **Revendedores**: consignação reduz estoque da loja, fechamentos parciais, pagamentos geram despesa no Financeiro.
- **WhatsApp**: 1 instância por empresa (upsert), agrupamento por últimos 8 dígitos do telefone, mídia rica em buckets, sync via `n8n-whatsapp-sync` (dedupe por hash).
- **Financeiro**: arredondamento sempre `Math.round(val*100)/100`, anexo de recibos, notificações de vencidos.
- **Stripe**: upgrade imediato, downgrade agendado via `pending_plan_change`, status `canceling` mantém acesso até fim do ciclo.

### 6. Convenções de Código
- Componentes shadcn em `src/components/ui` — nunca editar `client.ts` / `types.ts` do Supabase.
- Tokens semânticos no `index.css` — proibido `text-white`, `bg-[#xxx]` em componentes.
- Modais usam `Dialog` (não `Sheet`) para criar/editar produtos.
- Sidebar: "Equipe" dentro de "Meu Negócio"; módulos bloqueados mostram 🔒.
- Mobile: drawer + grid POS 2-4 colunas dinâmico.

### 7. O que o Claude NUNCA deve fazer
- Sugerir plano grátis ou remover paywall.
- Armazenar role em `profiles`.
- Usar `??` com `promo_price` (zero é falsy intencional).
- Deletar produtos fisicamente.
- Criar segunda instância WhatsApp por empresa.
- Expor IDs/URLs do Supabase dashboard ao usuário final.
- Quebrar a estética dark/gold com cores fora da paleta.

### 8. Como Pedir Coisas ao Claude (template)
Sessão de exemplo para começar conversas:
```
Contexto: Aurum Suite (ver doc anexo).
Tarefa: <descrever>
Restrições: manter padrão visual Aurum, respeitar RLS multi-tenant, sem quebrar regras de POS/Financeiro.
Entregar: <código / análise / migration / etc>
```

## Arquivo a criar
- `docs/CLAUDE_CONTEXT.md` — markdown completo com as seções acima, pronto para colar no Claude.

Nenhum código da aplicação será alterado.
