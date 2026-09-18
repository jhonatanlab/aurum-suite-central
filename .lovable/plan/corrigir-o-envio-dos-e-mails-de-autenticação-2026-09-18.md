# Corrigir o envio dos e-mails de autenticação

## O que está acontecendo

O domínio de envio `notify.aurumsuite.cloud` está verificado e ativo, mas **nenhum e-mail saiu**: o histórico de envios dos últimos 14 dias está completamente vazio (nenhum enviado, recusado ou bloqueado).

Causa confirmada: o código que monta os e-mails de autenticação usa um modelo antigo, que grava a mensagem numa "fila" interna do banco para envio posterior. Essa fila não existe mais neste projeto (a função de enfileiramento foi consultada no banco e não está lá). Resultado: toda tentativa de envio falha antes de sair, inclusive a redefinição de senha e o convite criado hoje para `aurumsuiteio@gmail.com` (conta criada às 03:53, nunca confirmada).

Ou seja: não é problema de DNS, de domínio nem do endereço do destinatário.

## O que será feito

1. Regenerar a estrutura de e-mails de autenticação no formato atual (envio direto, sem fila), mantendo os seis tipos: redefinição de senha, convite, confirmação de cadastro, link mágico, troca de e-mail e código de verificação.
2. Reaplicar a identidade Aurum Suite nos seis modelos: logo `aurum-suite-logo.png`, acento dourado `#C7A052`, tipografia e textos em português, remetente "Aurum Suite".
3. Publicar a nova versão do serviço de e-mails.
4. Disparar uma redefinição de senha real para `aurumsuiteio@gmail.com` e conferir no histórico de envios se a mensagem foi aceita e entregue.
5. Se o registro mostrar recusa ou bloqueio do destinatário, reportar o motivo exato e o próximo passo.

## Detalhes técnicos

- `supabase/functions/auth-email-hook/index.ts` será reescrito pelo scaffold oficial, passando a usar `createAuthEmailHandler` de `npm:@lovable.dev/email-js@0.1.0` (envio síncrono pela API gerenciada) em vez de `enqueue_email` + `email_send_log`.
- Os seis arquivos em `supabase/functions/_shared/email-templates/` serão sobrescritos e rebrandeados em seguida (fundo do corpo do e-mail permanece claro, com blocos de destaque em dourado).
- Deploy de `auth-email-hook` após as edições.
- Nenhuma migração de banco: a fila e a tabela de log não devem ser recriadas.
- Verificação final pelo histórico de eventos de entrega, filtrando pelo destinatário.

## Observação

O e-mail de teste só chega se o endereço existir como usuário do sistema — `aurumsuiteio@gmail.com` já existe, então a redefinição funcionará assim que o envio for corrigido.
