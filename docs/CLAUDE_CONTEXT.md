# Aurum Suite — Briefing para o Claude

> Cole este documento no Claude (Projects → Custom Instructions, ou no início da conversa) sempre que for trabalhar no Aurum Suite. Ele contém o contexto mínimo necessário para o Claude responder com qualidade sem quebrar regras de negócio ou padrão visual.

---

## 1. Visão Geral do Produto

**Aurum Suite** é um SaaS **multi-tenant** de gestão para joalherias e negócios com revenda/consignação. Concentra em um só painel:

- **CRM** com pipelines e funil de leads.
- **Vendas / POS** (frente de caixa) com múltiplos pagamentos.
- **Estoque** com lotes FIFO, análises (MarkUp, Imobilizado, Curva ABC, Giro).
- **Financeiro** com receitas, despesas, recorrências e recibos.
- **WhatsApp** (chat ao vivo, campanhas, automações) via Uazapi + n8n.
- **Revendedores** (consignação, fechamentos, pagamentos, extrato, documentos).
- **Garantias** com análise por lote e fornecedor.

**Público:** lojistas, gerentes, vendedores e revendedores.

**Modelo comercial:** assinatura **Stripe** (planos Starter, Pro, Growth). **Não existe plano grátis.** Usuários sem assinatura ativa ou em atraso são redirecionados para `/billing`.

**MVP Mode:** flag global que oculta módulos avançados (Campanhas, Automações, partes de Configurações). Quando ativo, qualquer feature nova deve respeitar essa flag.

---

## 2. Stack Técnica

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + React Router + React Query (`refetchOnWindowFocus: false`).
- **Backend:** Lovable Cloud (Supabase) — Auth, Postgres com RLS, Storage, Edge Functions (Deno).
- **Pagamentos:** Stripe (test + live), webhooks em `stripe-webhook-handler`.
- **WhatsApp:** Uazapi (provider) orquestrado por n8n; sync via Edge Function `n8n-whatsapp-sync`.
- **Estado:** React Query para server state; Context para Auth/Company.

Arquivos **autogerados** que NUNCA devem ser editados manualmente:
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env` (variáveis `VITE_SUPABASE_*`)
- `supabase/config.toml` (configs de projeto)

---

## 3. Identidade Visual — Padrão Aurum (não negociável)

Tema **dark premium metálico**, estética executiva, luxo moderno.

| Token | Valor |
|---|---|
| Background principal | `#121212` |
| Superfícies / cards | `#1E1E1E` |
| Cor primária (Gold) | `#C7A052` |
| Texto secundário | `#A1A1AA` |
| Headings | branco |

Regras de UI:
- Bordas arredondadas **XL**, transições suaves, sombras sutis.
- **Glassmorphism** em headers e cartões especiais.
- Espaçamento generoso, layout minimalista, tipografia clean.
- Componentes devem transmitir **valor** — nunca parecer SaaS genérico (sem roxo/indigo, sem gradientes clichê).
- **Proibido** hardcode de cor em componentes (`text-white`, `bg-black`, `bg-[#xxx]`). Sempre tokens semânticos do `index.css` / Tailwind.
- Responsivo: drawer mobile, grid POS adaptativo (2–4 colunas).

---

## 4. Arquitetura Multi-tenant & Segurança

- **Isolamento por `company_id`** em toda tabela de domínio, garantido por **RLS**.
- **Roles em tabela separada** (`user_roles` + função `has_role(_user_id, _role)` `SECURITY DEFINER`). **NUNCA** armazenar role em `profiles` (vetor de privilege escalation).
- Hierarquia de roles:
  1. `superadmin` — acesso ao painel `/admin/*`, sidebar vermelha, limites de plano Growth, nunca redirecionado para `/billing`.
  2. `owner` — dono da empresa.
  3. `gerente` — acesso total à empresa.
  4. `vendedor` — restrito a CRM/Vendas, redirecionado para Dashboard ao tentar outras rotas.
- **Edge Functions** devem usar `supabase.auth.getClaims(token)` (compatível com ES256 do Lovable Cloud). **Nunca** `getUser` — falha silenciosamente.
- Toda `CREATE TABLE` em `public` precisa de `GRANT` explícito + `ENABLE RLS` + policies. Sem grants, a API retorna permission error mesmo com RLS aberta.
- Storage de recibos/documentos em buckets **privados** com policies por `company_id`.

---

## 5. Regras de Negócio Críticas

### POS / Vendas (`src/pages/Vendas.tsx`)
- Carrinho suporta **múltiplos pagamentos** e **pagamentos parciais**.
- Quando o cliente paga **valor a mais**, o excedente **soma ao Total** (não vira troco silencioso).
- **Data da venda editável** (backdating) — gerentes/owners podem editar cliente, data e preços no histórico; quantidades são bloqueadas.
- Checkout gera transação `entrada` no Financeiro mapeada por `origin`.
- Delay de **300ms** após checkout para o trigger de estoque calcular corretamente.
- Vendas a "consumidor final" (sem cliente) são atribuídas ao lead `Consumidor final` no Dashboard.

### Produtos
- **Soft-delete** via `status='inactive'`. Nunca DELETE físico (mantém relações com vendas/lotes).
- **Bundles** (`type='bundle'`) com estoque virtual calculado a partir dos componentes; transação `sell_bundle`.
- **`promo_price`** só vale quando `> 0`. Zero significa "sem promoção" — usar `promo_price && promo_price > 0 ? promo_price : price`, **nunca `??`** (zero é falsy intencional).
- `cost_price` calcula automaticamente margem de lucro em % e BRL.

### Estoque
- Lotes em `product_batches`, baixa **FIFO**.
- Entrada de estoque exige **fornecedor obrigatório**.
- Métricas por fornecedor: taxa de defeito automática a partir de garantias.

### Garantias
- Análise de defeitos por lote/fornecedor.
- Trocas via fluxo "Troca com Venda" no POS, com itens bloqueados.

### Revendedores (`/revendedores`)
- Consignação **reduz** o estoque da loja no envio.
- Suporta retornos parciais e fechamentos parciais.
- "Pagamentos" liquida saldo de comissão e gera **despesa** no Financeiro automaticamente.
- Documentos em storage privado com histórico.

### WhatsApp
- **1 instância ativa por empresa** (lógica de upsert). Botão "Reset" para instâncias travadas.
- Conversas agrupadas pelos **últimos 8 dígitos** do telefone (consolida não lidas).
- Mídia rica em buckets dedicados (`campaign-media`, etc.).
- Sync via `n8n-whatsapp-sync` (dedupe por hash; status de mensagens).
- Frontend **aguarda** updates do n8n-whatsapp-sync antes de marcar a instância como conectada (prevenção de race condition).
- Tags coloridas customizadas por empresa, filtros na inbox.
- Integração CRM: link com lead existente ou criação em 1 clique.

### Financeiro
- **Arredondamento sempre** `Math.round(val * 100) / 100`.
- Anexo de recibos a transações pagas.
- Notificações de vencidos.
- Export CSV nativo (sem `xlsx`); PDF via `jspdf`.

### Stripe / Assinatura
- **Upgrades imediatos**; downgrades agendados via `pending_plan_change` (aplicados no fim do ciclo).
- Status `canceling` mantém acesso até o fim do ciclo pago.
- Sem assinatura → estado `none`, módulos bloqueados, sidebar com 🔒, modal `PlanLimitModal` com atalho para `/billing`.
- Onboarding totalmente automatizado: lead capturado no checkout, Auth provisionada pelo webhook. **Não existe mais `/criar-empresa`.**
- Limites por plano (usuários, produtos, revendedores) enforced via `check-plan-limits` Edge Function.

---

## 6. Convenções de Código

- Componentes shadcn em `src/components/ui` — não modificar primitives.
- Modais de criar/editar produto usam **`Dialog`**, não `Sheet`.
- Sidebar: item "Equipe" vive **dentro** de "Meu Negócio".
- Edge Functions: usar helper `bodyCache` para parse de JSON em Deno; whitelist em `n8n-proxy`; validar tenancy com RPC `user_belongs_to_company`.
- React Context order: `QueryClient` > `Tooltip` > `Auth` > `Company`.
- Logout deve limpar sessão local **mesmo se** `signOut` falhar.
- Configurações n8n: usar URLs base padronizadas (não hardcode em features).
- Para AI no app: usar **Lovable AI Gateway** (`google/gemini-3-flash-preview` por padrão), nunca expor `LOVABLE_API_KEY` no client.

---

## 7. O que o Claude NUNCA deve fazer

- ❌ Sugerir plano grátis, remover paywall ou bypass de `/billing`.
- ❌ Armazenar role em `profiles` ou checar admin no client (localStorage/hardcoded).
- ❌ Usar `??` com `promo_price` (zero é intencionalmente "sem promo").
- ❌ Deletar produtos fisicamente (sempre soft-delete).
- ❌ Criar segunda instância WhatsApp para a mesma empresa.
- ❌ Expor IDs, URLs ou links de dashboard do Supabase ao usuário final (dizer "Lovable Cloud" / "backend").
- ❌ Usar cores fora da paleta Aurum (sem roxo/indigo, sem branco puro de fundo).
- ❌ Editar `client.ts`, `types.ts` do Supabase ou `.env`.
- ❌ Criar tabela em `public` sem `GRANT` + RLS + policies no mesmo migration.
- ❌ Usar `getUser` em Edge Function (usar `getClaims(token)`).
- ❌ Confirmar email automaticamente ou habilitar signup anônimo sem pedido explícito.

---

## 8. Template de Prompt para o Claude

Use este formato ao iniciar uma tarefa:

```
Contexto: Aurum Suite (ver doc anexo CLAUDE_CONTEXT.md).
Tarefa: <descrever objetivo de negócio>
Arquivos relevantes: <listar paths se souber>
Restrições:
  - Manter padrão visual Aurum (dark + gold #C7A052).
  - Respeitar RLS multi-tenant (company_id).
  - Não quebrar regras de POS, Estoque ou Financeiro descritas no doc.
  - Sem alterar arquivos autogerados do Supabase.
Entrega esperada: <código completo / migration / análise / passo a passo>
```

---

## 9. Glossário Rápido

| Termo | Significado |
|---|---|
| Empresa / Company | Tenant; toda linha de domínio referencia `company_id`. |
| Owner | Criador da empresa, plano da assinatura é dele. |
| Superadmin | Operador da plataforma (Aurum), acesso a `/admin/*`. |
| Lead | Contato no CRM (origem WhatsApp, manual, venda etc.). |
| Consignação | Produto enviado ao revendedor sem venda concluída (reduz estoque). |
| Fechamento | Acerto de contas com revendedor (vendas - devoluções → comissão). |
| Entrada (Financeiro) | Receita, normalmente gerada por venda no POS. |
| Lote | Batch de produto com custo/fornecedor/data próprios; baixa FIFO. |

---

**Última atualização:** mantenha este doc versionado. Quando uma regra de negócio mudar, atualize a seção correspondente antes de pedir nova feature ao Claude.
