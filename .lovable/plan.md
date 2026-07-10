# Exportar Contatos do CRM

Adicionar botão de exportação na aba **Contatos** do CRM, permitindo baixar todos os leads cadastrados com seus dados completos em CSV e PDF.

## Localização
- Componente: `src/components/crm/ContactsTab.tsx`
- Botão posicionado ao lado da barra de busca (topo direito)

## Formatos suportados
Menu dropdown (mesmo padrão usado em Financeiro e Revendedores):
- **CSV** (.csv) — para Excel/planilhas
- **PDF** (.pdf) — relatório formatado

## Dados exportados (colunas)
Todos os campos relevantes do lead:
- Nome
- Telefone
- E-mail
- Etapa (nome do stage no CRM)
- Origem (source)
- Produto vinculado (nome)
- Valor do produto / Valor do lead (R$)
- Data de cadastro
- Observações / demais campos disponíveis na tabela `leads`

## Implementação
1. Criar novo componente `src/components/crm/ContactsExportMenu.tsx` seguindo o padrão de `ExportMenu.tsx` (Financeiro) e `ResellerExportMenu.tsx`:
   - Usa `jspdf` + `jspdf-autotable` (já instalados)
   - CSV nativo com BOM UTF-8 e separador `;`
   - Cabeçalho do PDF com título, data de exportação, total de contatos
   - Estilo Aurum (header dourado `[199,160,82]`, fundo escuro alternado)
2. Integrar no `ContactsTab.tsx`:
   - Import do novo menu
   - Renderizar no topo, ao lado do campo de busca
   - Passar `filteredLeads` (respeita filtro de busca ativo) + lista de `stages` para resolver nome da etapa
3. Aplicar filtro de busca: exporta o que o usuário está vendo. Se busca vazia, exporta todos.

## Nome de arquivo
`contatos_crm_YYYY-MM-DD.csv` / `.pdf`

## Fora de escopo
- Sem alterações no schema
- Sem novos campos no lead
- Sem filtros adicionais de exportação além da busca já existente