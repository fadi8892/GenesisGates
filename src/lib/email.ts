// src/lib/email.ts
export async function sendOtpEmail(to: string, code: string) {
  // Prefer Resend if configured
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject: 'Your Genesis Gates sign-in code',
      text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
    });
    return;
  }

  // Fallback: SMTP (IONOS, etc.)
  if (process.env.SMTP_URL) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport(process.env.SMTP_URL as string);
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'Genesis Gates <no-reply@example.com>',
      to,
      subject: 'Your Genesis Gates sign-in code',
      text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
    });
    return;
  }

  // Neither configured
  throw new Error('No email provider configured. Set RESEND_API_KEY or SMTP_URL.');
}
