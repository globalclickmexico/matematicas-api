import * as React from 'react';
import {
  Html, Head, Preview, Body, Container,
  Section, Text, Button, Hr, Row, Column,
  Img,
} from '@react-email/components';

interface RecuperarCredencialesProps {
  nombre:        string;
  nombreUsuario: string;
  resetLink:     string;
}

export function RecuperarCredenciales({ nombre, nombreUsuario, resetLink }: RecuperarCredencialesProps) {
  const firstName = nombre.split(' ')[0];

  return (
    <Html lang="es">
      <Head />
      <Preview>🔐 Recupera tu acceso a CursoMate — enlace válido por 1 hora</Preview>
      <Body style={main}>
        <Container style={wrapper}>

          {/* ── Header ─────────────────────────────── */}
          <Section style={header}>
            {/* <Section style={monogramWrap}>
              <Text style={monogram}>CM</Text>
            </Section> */}
            {/* <Text style={brandName}>CursoMate</Text> */}
            <Img src="https://globalclickmexico.com/img/nuevosRecursos/logo-gc-horizontal.png" alt="Global Click México" width="100%" height="auto" />
            <Text style={brandTagline}>Curso de regularización de matemáticas</Text>
          </Section>

          {/* ── Hero badge ─────────────────────────── */}
          <Section style={heroBadge}>
            <Text style={lockIcon}>🔐</Text>
            <Text style={heroTitle}>Recuperación de acceso</Text>
            <Text style={heroSub}>
              Recibimos una solicitud para restablecer las credenciales de tu cuenta
            </Text>
          </Section>

          {/* ── Body ───────────────────────────────── */}
          <Section style={body}>

            <Text style={greeting}>
              Hola, <strong style={greetingName}>{firstName}</strong> 👋
            </Text>
            <Text style={paragraph}>
              Alguien solicitó recuperar el acceso a la cuenta asociada a tu correo electrónico en CursoMate.
              Si fuiste tú, aquí tienes todo lo que necesitas para retomar tu aprendizaje.
            </Text>

            {/* Username card */}
            <Section style={usernameCard}>
              <Text style={usernameLabel}>Tu nombre de usuario</Text>
              <Text style={usernameValue}>{nombreUsuario}</Text>
              <Text style={usernameHint}>Úsalo junto con tu nueva contraseña para iniciar sesión</Text>
            </Section>

            {/* CTA */}
            <Section style={ctaSection}>
              <Button style={ctaButton} href={resetLink}>
                Restablecer mi contraseña →
              </Button>
            </Section>

            {/* Info pills */}
            <Row style={pillRow}>
              <Column style={pillCol}>
                <Section style={pill}>
                  <Text style={pillIcon}>⏱</Text>
                  <Text style={pillLabel}>Válido por</Text>
                  <Text style={pillValue}>1 hora</Text>
                </Section>
              </Column>
              <Column style={pillColMid} />
              <Column style={pillCol}>
                <Section style={pill}>
                  <Text style={pillIcon}>🔒</Text>
                  <Text style={pillLabel}>Enlace de</Text>
                  <Text style={pillValue}>Un solo uso</Text>
                </Section>
              </Column>
            </Row>

          </Section>

          <Hr style={divider} />

          {/* ── Security note ──────────────────────── */}
          <Section style={securityNote}>
            <Text style={securityTitle}>⚠️ ¿No solicitaste esto?</Text>
            <Text style={securityText}>
              Si no iniciaste esta solicitud, ignora este correo. Tu cuenta permanece segura
              y nadie podrá cambiar tu contraseña sin el enlace enviado a tu correo.
            </Text>
          </Section>

          {/* ── Fallback link ──────────────────────── */}
          <Section style={fallbackSection}>
            <Text style={fallbackTitle}>¿Problemas con el botón?</Text>
            <Text style={fallbackText}>Copia y pega este enlace en tu navegador:</Text>
            <Text style={fallbackLink}>{resetLink}</Text>
          </Section>

          {/* ── Footer ─────────────────────────────── */}
          <Section style={footer}>
            <Text style={footerBrand}>CursoMate</Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} CursoMate · Todos los derechos reservados
            </Text>
            <Text style={footerText}>
              Este es un correo automático, por favor no respondas a este mensaje.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const main: React.CSSProperties = {
  backgroundColor: '#eef2ff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
};

const wrapper: React.CSSProperties = {
  maxWidth: '580px',
  margin: '40px auto',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(15,37,87,0.12)',
};

/* Header */
const header: React.CSSProperties = {
  background: 'linear-gradient(150deg, #0f2557 0%, #1d4ed8 60%, #3b82f6 100%)',
  padding: '40px 40px 36px',
  textAlign: 'center' as const,
};

const monogramWrap: React.CSSProperties = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.15)',
  border: '2px solid rgba(255,255,255,0.35)',
  margin: '0 auto 16px',
  padding: '0',
};

const monogram: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '800',
  letterSpacing: '1px',
  margin: '0',
  lineHeight: '60px',
  textAlign: 'center' as const,
};

const brandName: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '800',
  margin: '0 0 6px',
  letterSpacing: '-0.3px',
};

const brandTagline: React.CSSProperties = {
  color: 'rgba(255,255,255,0.65)',
  fontSize: '13px',
  fontWeight: '400',
  margin: '0',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
};

/* Hero badge */
const heroBadge: React.CSSProperties = {
  backgroundColor: '#02658c',
  padding: '28px 40px',
  textAlign: 'center' as const,
  // borderBottom: '3px solid #3b82f6',
};

const lockIcon: React.CSSProperties = {
  fontSize: '36px',
  margin: '0 0 8px',
  lineHeight: '1',
};

const heroTitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0 0 8px',
  letterSpacing: '-0.2px',
};

const heroSub: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
};

/* Body */
const body: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '40px',
};

const greeting: React.CSSProperties = {
  color: '#111827',
  fontSize: '17px',
  margin: '0 0 16px',
};

const greetingName: React.CSSProperties = {
  color: '#1d4ed8',
};

const paragraph: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 28px',
};

/* Username card */
const usernameCard: React.CSSProperties = {
  backgroundColor: '#f0f4ff',
  borderLeft: '4px solid #1d4ed8',
  borderRadius: '0 10px 10px 0',
  padding: '20px 24px',
  margin: '0 0 32px',
};

const usernameLabel: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
};

const usernameValue: React.CSSProperties = {
  color: '#0f2557',
  fontSize: '26px',
  fontWeight: '800',
  letterSpacing: '0.3px',
  margin: '0 0 6px',
};  

const usernameHint: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
};

/* CTA */
const ctaSection: React.CSSProperties = {
  textAlign: 'center' as const,
  padding: '20px 0px 20px 0px'
};

const ctaButton: React.CSSProperties = {
  background: '#FF9900',
  color: '#212529',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  padding: '16px 40px',
  borderRadius: '15px',
  display: 'inline-block',
  letterSpacing: '0.2px',
  boxShadow: '0 4px 14px rgba(29,78,216,0.35)',
};

/* Info pills */
const pillRow: React.CSSProperties = {
  margin: '0 0 4px',
};

const pillCol: React.CSSProperties = {
  width: '47%',
};

const pillColMid: React.CSSProperties = {
  width: '6%',
};

const pill: React.CSSProperties = {
  backgroundColor: '#f8faff',
  border: '1px solid #dbeafe',
  borderRadius: '10px',
  padding: '14px 16px',
  textAlign: 'center' as const,
};

const pillIcon: React.CSSProperties = {
  fontSize: '20px',
  margin: '0 0 4px',
  lineHeight: '1',
};

const pillLabel: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  fontWeight: '500',
  margin: '0 0 2px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const pillValue: React.CSSProperties = {
  color: '#1d4ed8',
  fontSize: '14px',
  fontWeight: '700',
  margin: '0',
};

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0',
};

/* Security note */
const securityNote: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  borderTop: '3px solid #f59e0b',
  padding: '20px 40px',
};

const securityTitle: React.CSSProperties = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '700',
  margin: '0 0 6px',
};

const securityText: React.CSSProperties = {
  color: '#78350f',
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0',
};

/* Fallback */
const fallbackSection: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  padding: '20px 40px',
  borderTop: '1px solid #e5e7eb',
};

const fallbackTitle: React.CSSProperties = {
  color: '#374151',
  fontSize: '13px',
  fontWeight: '600',
  margin: '0 0 4px',
};

const fallbackText: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 6px',
};

const fallbackLink: React.CSSProperties = {
  color: '#1d4ed8',
  fontSize: '11px',
  wordBreak: 'break-all' as const,
  margin: '0',
};

/* Footer */
const footer: React.CSSProperties = {
  backgroundColor: '#0f2557',
  padding: '24px 40px',
  textAlign: 'center' as const,
};

const footerBrand: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '800',
  margin: '0 0 8px',
  letterSpacing: '-0.2px',
};

const footerText: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  margin: '0 0 4px',
  lineHeight: '1.5',
};
