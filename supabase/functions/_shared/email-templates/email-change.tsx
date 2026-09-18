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

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirme seu novo e-mail na {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={siteName} width="150" style={logo} />
        <Section style={card}>
          <Heading style={h1}>Confirme seu novo e-mail</Heading>
          <Text style={text}>
            Você pediu para alterar o e-mail da sua conta na {siteName}
            {oldEmail ? ` de ${oldEmail}` : ''}
            {newEmail ? ` para ${newEmail}` : ''}. Confirme a alteração no botão abaixo.
          </Text>
          <Button className="dm-btn" style={button} href={confirmationUrl}>
            Confirmar alteração
          </Button>
          <Text style={footer}>
            Se você não solicitou essa mudança, ignore este e-mail e sua conta continuará
            como está.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
