/**
 * E-mail transacional (convite, memorial pronto, aviso de cota).
 * Sem SMTP configurado, loga e segue — dev não precisa de servidor de e-mail.
 */
import nodemailer from "nodemailer";

const HOST = process.env.SMTP_HOST;
const FROM = process.env.MAIL_FROM ?? "Enginairy <nao-responda@enginairy.com>";

const transporter = HOST
  ? nodemailer.createTransport({
      host: HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!transporter) {
    console.warn("[mailer] SMTP não configurado — e-mail não enviado:", input.subject);
    return false;
  }
  try {
    await transporter.sendMail({ from: FROM, ...input });
    return true;
  } catch (err) {
    console.error("[mailer] falha ao enviar", err);
    return false;
  }
}
