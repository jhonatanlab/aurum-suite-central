/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de confirmação da Aurum Suite</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Img src={logoUrl} width="150" alt="Aurum Suite" style={logo} />
          <Heading style={h1}>Seu código de confirmação</Heading>
          <Text style={text}>
            Use o código abaixo para confirmar esta ação na sua conta.
          </Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            Se você não solicitou este código, ignore este e-mail.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
  margin: '0 0 20px',
}
const codeStyle = {
  fontSize: '30px',
  letterSpacing: '8px',
  fontWeight: 'bold' as const,
  color: '#C7A052',
  margin: '0 0 12px',
}
const footer = {
  fontSize: '12px',
  color: '#6B6B6B',
  lineHeight: '1.6',
  margin: '32px 0 0',
}
