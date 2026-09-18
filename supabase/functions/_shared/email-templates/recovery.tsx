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

import { main, container, logo, card, h1, text, button, footer, darkModeCss, LOGO_URL } from './theme.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Redefina sua senha da {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={siteName} width="150" style={logo} />
        <Section style={card}>
          <Heading style={h1}>Redefinir senha</Heading>
          <Text style={text}>
            Recebemos um pedido para redefinir a senha da sua conta na {siteName}. Clique no
            botão abaixo para criar uma nova senha.
          </Text>
          <Button className="dm-btn" style={button} href={confirmationUrl}>
            Criar nova senha
          </Button>
          <Text style={footer}>
            Se você não solicitou a redefinição, pode ignorar este e-mail com segurança. Sua
            senha permanecerá a mesma.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
