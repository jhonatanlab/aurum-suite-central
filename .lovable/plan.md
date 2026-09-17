# Mover o DNS de aurumsuite.cloud para a Cloudflare (destravar e-mails)

A Hostinger não permite criar registros NS para subdomínios, e a Lovable exige NS para o envio de e-mails (`notify.aurumsuite.cloud` segue pendente). A solução escolhida foi hospedar a zona DNS na Cloudflare (plano gratuito), que aceita NS em subdomínio.

## Estado atual (verificado)

- Site ativo e publicado: `aurumsuite.cloud` e `www.aurumsuite.cloud` apontam para `185.158.133.1` (A) e têm 2 registros TXT de verificação da Lovable — **esses precisam ser replicados na Cloudflare para o site não cair**.
- Zona DNS hoje nos nameservers da Hostinger (`ns1/ns2.dns-parking.com`).
- `notify.aurumsuite.cloud` pendente; faltam: TXT `_lovable-email.aurumsuite.cloud` → `lovable_email_verify=b1bafa...49b75` e NS `notify` → `ns3.lovable.cloud` / `ns4.lovable.cloud`.
- Nenhuma conexão Cloudflare vinculada ao projeto ainda.

## Passos

1. **Vincular o conector Cloudflare** — mostro o cartão de conexão; você cria a conexão com um token da sua conta Cloudflare (permissões Zone Read + DNS Edit). Isso me permite criar os registros via API em vez de você digitar tudo manualmente.
2. **Você adiciona a zona na Cloudflare** (dashboard Cloudflare → Add a domain → `aurumsuite.cloud`, plano Free). A Cloudflare atribui 2 nameservers próprios.
3. **Replicar os registros existentes na Cloudflare** (via conector, com sua confirmação antes de cada criação), todos em modo "DNS only" (nuvem cinza):
   - A `@` → `185.158.133.1`
   - A `www` → `185.158.133.1`
   - TXT `_lovable.aurumsuite.cloud` → `lovable_verify=16c3cb80cce3587a55b8d8ff0c0e39ba0deb58c43ebb002ec934a17c292d4565`
   - TXT `_lovable.www.aurumsuite.cloud` → `lovable_verify=f66ff58364177590289abd66ed7d08f3fd13d637e688ebda738c7ae29479f4e1`
4. **Criar os registros de e-mail na Cloudflare**:
   - TXT `_lovable-email.aurumsuite.cloud` → `lovable_email_verify=b1bafa5c835da23c5d4836e750dfd7129e4384cb7f9eca1266ab8b5b2b849b75`
   - NS `notify.aurumsuite.cloud` → `ns3.lovable.cloud`
   - NS `notify.aurumsuite.cloud` → `ns4.lovable.cloud`
5. **Você troca os nameservers na Hostinger** (Domains → Manage → DNS/Nameservers → usar nameservers personalizados → os 2 da Cloudflare). Só depois dos passos 3–4 concluídos, para o site não ficar fora do ar.
6. **Verificar propagação e ativação** — checo o status do domínio de e-mail; quando ativo, faço o envio de teste e confirmo que redefinição de senha e convites do Admin saem com a marca Aurum Suite.

## Riscos

- Troca de nameservers pode levar até 24h para propagar; com os registros replicados antes da troca, o site continua no ar durante a transição.
- Manter os registros da Lovable em "DNS only" evita interferência do proxy da Cloudflare na verificação.

## Resultado esperado

- Site `aurumsuite.cloud` / `www` inalterado e ativo.
- `notify.aurumsuite.cloud` verificado; e-mails de autenticação enviados do domínio da Aurum Suite.
