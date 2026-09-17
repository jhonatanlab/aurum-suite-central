# Finalizar ativação do e-mail notify.aurumsuite.cloud

## Estado atual (verificado)

- DNS na Cloudflare: todos os registros corretos e públicos
  - A `aurumsuite.cloud` e `www` → 185.158.133.1 (Somente DNS)
  - TXT `_lovable` e `_lovable.www` → ok
  - NS `notify.aurumsuite.cloud` → ns3/ns4.lovable.cloud
  - TXT `_lovable-email.aurumsuite.cloud` → ok
- Site: domínios em recuperação automática (algumas horas), sem ação necessária
- E-mail: verificação do domínio em andamento ("Setting up — Verifying")

## Próximos passos

1. Aguardar a verificação do domínio de e-mail concluir (minutos; se demorar, clicar em "Verificar domínio" em Cloud → Emails).
2. Assim que ativo, disparar um e-mail de teste de redefinição de senha para confirmar envio e identidade visual (logo Aurum, fundo escuro, dourado).
3. Confirmar também o e-mail de convite de usuário criado pela aba Admin.

## Detalhes técnicos

- `auth-email-hook` já está deployada com templates em pt-BR com a marca Aurum Suite.
- TTL da fila: 15 min (autenticação) — o teste deve ser feito logo após a ativação.
- Nenhuma alteração de código pendente; restam apenas verificação de DNS e o envio de teste.
