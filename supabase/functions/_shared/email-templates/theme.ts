// Identidade visual Aurum Suite para os e-mails de autenticação.
export const LOGO_URL = 'https://aurumsuite.cloud/aurum-suite-logo.png'
export const GOLD = '#C7A052'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Helvetica, Arial, sans-serif',
}

export const container = {
  padding: '32px 24px',
  maxWidth: '560px',
}

export const logo = {
  margin: '0 auto 24px',
  display: 'block',
}

export const card = {
  backgroundColor: '#121212',
  border: `1px solid ${GOLD}`,
  borderRadius: '16px',
  padding: '32px 28px',
}

export const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: '0 0 16px',
}

export const text = {
  fontSize: '15px',
  color: '#A1A1AA',
  lineHeight: '1.6',
  margin: '0 0 28px',
}

export const button = {
  backgroundColor: GOLD,
  color: '#121212',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  border: `1px solid ${GOLD}`,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const code = {
  fontSize: '30px',
  letterSpacing: '8px',
  fontWeight: 'bold' as const,
  color: GOLD,
  margin: '0 0 24px',
}

export const footer = {
  fontSize: '12px',
  color: '#71717A',
  margin: '28px 0 0',
  lineHeight: '1.6',
}

// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
export const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #C7A052 !important; color: #121212 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #C7A052 !important; color: #121212 !important; }
  [data-ogsb] .dm-btn { background-color: #C7A052 !important; color: #121212 !important; }
`
