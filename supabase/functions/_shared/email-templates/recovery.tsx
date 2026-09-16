/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Defina uma nova senha na Aurum Suite</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Img src={logoUrl} width="150" alt={siteName} style={logo} />
          <Heading style={h1}>Redefinir sua senha</Heading>
          <Text style={text}>
            Recebemos um pedido para redefinir a senha da sua conta na Aurum
            Suite. Clique no botão abaixo para criar uma nova senha.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Criar nova senha
          </Button>
          <Text style={footer}>
            Se você não solicitou a redefinição, pode ignorar este e-mail com
            segurança. Sua senha continuará a mesma.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const logoUrl = 'https://aurumsuite.cloud/aurum-suite-logo.png'
const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Helvetica, Arial, sans-serif',
  padding: '24px 0',
}
const container = { padding: '0 16px', maxWidth: '560px' }
const card = {
  backgroundColor: '#121212',
  border: '1px solid rgba(199,160,82,0.3)',
  borderRadius: '16px',
  padding: '36px 32px',
}
const logo = { margin: '0 0 28px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#F5F1E8',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#A1A1AA',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const button = {
  backgroundColor: '#C7A052',
  color: '#121212',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 26px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: '#6B6B6B',
  lineHeight: '1.6',
  margin: '32px 0 0',
}
