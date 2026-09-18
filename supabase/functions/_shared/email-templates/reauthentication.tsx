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

import { main, container, logo, card, h1, text, code, footer, darkModeCss, LOGO_URL } from './theme.ts'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Seu código de verificação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Aurum Suite" width="150" style={logo} />
        <Section style={card}>
          <Heading style={h1}>Seu código de verificação</Heading>
          <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
          <Text style={code}>{token}</Text>
          <Text style={footer}>
            Se você não solicitou este código, ignore este e-mail.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
