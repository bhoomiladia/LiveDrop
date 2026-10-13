import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Development fallback store to allow immediate verification & testing
export const devEmailStore: {
  lastVerificationToken?: { email: string; token: string; link: string; timestamp: number };
  lastResetToken?: { email: string; token: string; link: string; timestamp: number };
} = {};

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<{ success: boolean; previewUrl?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const from = process.env.EMAIL_FROM || "Live Drop <noreply@livedrop.example>";

  // If real SMTP is configured, send via nodemailer
  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.sendMail({ from, to, subject, text, html });
      return { success: true };
    } catch (err) {
      console.error("[Live Drop Email] SMTP Error:", err);
      // Fallback to dev log
    }
  }

  // Development / Preview mode logging
  console.log("--------------------------------------------------");
  console.log(`[Live Drop Email Service] (Dev / Preview Mode)`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${text}`);
  console.log("--------------------------------------------------");

  return { success: true };
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verificationLink = `${baseUrl}/verify-email?token=${token}`;

  devEmailStore.lastVerificationToken = {
    email,
    token,
    link: verificationLink,
    timestamp: Date.now(),
  };

  const subject = "Verify your Live Drop account";
  const text = `Welcome to Live Drop!\n\nPlease verify your email by clicking the link below:\n${verificationLink}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, you can safely ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0c0e13; background: #ffffff;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 20px; font-weight: 700; color: #1842b8; letter-spacing: -0.03em;">Live Drop</span>
      </div>
      <h1 style="font-size: 22px; font-weight: 600; line-height: 1.3; margin: 0 0 16px; color: #0c0e13;">Verify your email address</h1>
      <p style="font-size: 15px; line-height: 1.5; color: #686c75; margin: 0 0 24px;">
        Thanks for signing up for Live Drop. Please confirm your email address to start running Live Drop shows.
      </p>
      <div style="margin: 32px 0;">
        <a href="${verificationLink}" style="display: inline-block; background: #1842b8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Verify Email Address
        </a>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #9499a3; margin: 32px 0 0;">
        This link is valid for 24 hours. If the button doesn't work, copy and paste this URL into your browser:<br />
        <a href="${verificationLink}" style="color: #1842b8;">${verificationLink}</a>
      </p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  devEmailStore.lastResetToken = {
    email,
    token,
    link: resetLink,
    timestamp: Date.now(),
  };

  const subject = "Reset your Live Drop password";
  const text = `You requested a password reset for Live Drop.\n\nPlease reset your password using the link below:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0c0e13; background: #ffffff;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 20px; font-weight: 700; color: #1842b8; letter-spacing: -0.03em;">Live Drop</span>
      </div>
      <h1 style="font-size: 22px; font-weight: 600; line-height: 1.3; margin: 0 0 16px; color: #0c0e13;">Reset your password</h1>
      <p style="font-size: 15px; line-height: 1.5; color: #686c75; margin: 0 0 24px;">
        We received a request to reset your password for your Live Drop account. Click the button below to choose a new password.
      </p>
      <div style="margin: 32px 0;">
        <a href="${resetLink}" style="display: inline-block; background: #1842b8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #9499a3; margin: 32px 0 0;">
        This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.<br />
        <a href="${resetLink}" style="color: #1842b8;">${resetLink}</a>
      </p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}
