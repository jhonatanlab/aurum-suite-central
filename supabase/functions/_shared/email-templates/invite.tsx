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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu acesso à Aurum Suite está pronto</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Img src={logoUrl} width="150" alt={siteName} style={logo} />
          <Heading style={h1}>Bem-vindo à Aurum Suite</Heading>
          <Text style={text}>
            Sua conta foi criada. Para começar, defina sua senha de acesso
            clicando no botão abaixo.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Definir minha senha
          </Button>
          <Text style={footer}>
            Este link é pessoal e expira em breve. Se você não esperava este
            convite, pode ignorar este e-mail.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
