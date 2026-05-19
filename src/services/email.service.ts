import nodemailer from 'nodemailer';
import { render } from '@react-email/components';
import * as React from 'react';
import { RecuperarCredenciales } from '../emails/RecuperarCredenciales';

const transporter = nodemailer.createTransport({
  service:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

interface SendRecuperarCredencialesOpts {
  to:            string;
  nombre:        string;
  nombreUsuario: string;
  resetLink:     string;
}

export async function sendRecuperarCredenciales(opts: SendRecuperarCredencialesOpts): Promise<void> {
  const html = await render(
    React.createElement(RecuperarCredenciales, {
      nombre:        opts.nombre,
      nombreUsuario: opts.nombreUsuario,
      resetLink:     opts.resetLink,
    })
  );

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || '"CursoMate" <notificaciones@globalclickmexico.com>',
    to:      process.env.NODE_ENV === "development" ? "gc.desarrollo3@outlook.com" : opts.to,
    subject: 'Recupera tu acceso a CursoMate',
    html,
  });
}
