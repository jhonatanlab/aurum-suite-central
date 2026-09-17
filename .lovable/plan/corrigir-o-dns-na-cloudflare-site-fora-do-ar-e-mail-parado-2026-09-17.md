# Corrigir o DNS na Cloudflare (site fora do ar + e-mail parado)

## O que está acontecendo

A zona já está na Cloudflare (nameservers `kareem`/`melinda.ns.cloudflare.com` ativos), mas três problemas impedem o site e o e-mail de funcionarem:

1. **Registros com nome duplicado.** Todas as linhas com o triângulo de aviso ⚠ na sua tela foram criadas como `aurumsuite.cloud.aurumsuite.cloud`, `_lovable.aurumsuite.cloud.aurumsuite.cloud`, etc. Isso acontece quando o nome completo é digitado no campo "Nome" — a Cloudflare acrescenta o domínio de novo. Consultando a internet agora, **nenhum** dos três registros TXT de verificação existe de fato.
2. **Os registros A estão com proxy ligado (nuvem laranja).** O mundo enxerga os IPs da Cloudflare (104.21.82.250 / 172.67.166.57) em vez de 185.158.133.1, então a verificação do domínio falha e aparece a mensagem de erro.
3. **Sobraram registros NS antigos da Hostinger** (`ns1/ns2.dns-parking.com`), que não têm mais função e devem sair.

A parte do e-mail que já está certa: os dois NS `notify` → `ns3/ns4.lovable.cloud` estão publicados corretamente. Falta só o TXT de verificação, que hoje está com o conteúdo errado (repetindo o próprio nome em vez do código).

## O que você precisa ajustar na Cloudflare

Tudo é feito em DNS → Registros. Em "Nome", digite **apenas a parte antes do domínio** (a Cloudflare completa sozinha).

**Apagar** (todas as linhas com ⚠):

- A `aurumsuite.cloud.aurumsuite.cloud`
- A `www.aurumsuite.cloud.aurumsuite.cloud`
- NS `ns1.dns-parking.com` e NS `ns2.dns-parking.com`
- TXT `_lovable.aurumsuite.cloud.aurumsuite.cloud`
- TXT `_lovable.www.aurumsuite.cloud.aurumsuite.cloud`
- TXT `_lovable-email...` (conteúdo errado)

**Ajustar os dois A que ficarem** (`aurumsuite.cloud` e `www`): clicar em Editar e mudar de "Com proxy" para **Somente DNS** (nuvem cinza). Conteúdo continua 185.158.133.1.

**Criar três TXT**, todos em "Somente DNS", TTL Auto:


| Nome             | Conteúdo                                                                              |
| ---------------- | ------------------------------------------------------------------------------------- |
| `_lovable`       | lovable_verify=16c3cb80cce3587a55b8d8ff0c0e39ba0deb58c43ebb002ec934a17c292d4565       |
| `_lovable.www`   | lovable_verify=f66ff58364177590289abd66ed7d08f3fd13d637e688ebda738c7ae29479f4e1       |
| `_lovable-email` | lovable_email_verify=b1bafa5c835da23c5d4836e750dfd7129e4384cb7f9eca1266ab8b5b2b849b75 |


**Manter** os dois NS `notify` → ns3.lovable.cloud e ns4.lovable.cloud (já corretos).

Ao final devem sobrar 7 registros: 2 A, 2 NS (notify) e 3 TXT.

## Depois disso

Eu verifico a propagação, confirmo a volta do site em aurumsuite.cloud e www, acompanho a ativação do e-mail e faço o envio de teste de redefinição de senha.

Se preferir, posso abrir aqui no chat o cartão de conexão do domínio com os valores exatos para copiar.