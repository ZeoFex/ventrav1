import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);

interface SendOtpEmailProps {
  to: string;
  firstName: string;
  code: string;
}

export async function sendOtpEmail({ to, firstName, code }: SendOtpEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: "VentraPOS <noreply@askorin.app>", // TODO: replace with verified domain in prod
      to: [to],
      subject: "Your VentraPOS Verification Code",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #003527; margin-bottom: 24px;">Verify your email</h1>
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Hi ${firstName},
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Here is your verification code to complete your VentraPOS setup:
          </p>
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #003527;">
              ${code}
            </span>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            This code will expire in 10 minutes. If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend Error]:", error);
      return { success: false, error };
    }

    console.log(`✅ [Email Service] OTP successfully sent to ${to}:`, data?.id);
    return { success: true, data };
  } catch (error) {
    console.error("[Email Service catch]:", error);
    return { success: false, error };
  }
}

interface SendPasswordResetEmailProps {
  to: string;
  firstName: string;
  resetLink: string;
}

export async function sendPasswordResetEmail({ to, firstName, resetLink }: SendPasswordResetEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: "VentraPOS <noreply@askorin.app>", // replace in prod
      to: [to],
      subject: "Reset your VentraPOS password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #003527; margin-bottom: 24px;">Password Reset</h1>
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Hi ${firstName},
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            We received a request to reset your VentraPOS password. Click the button below to choose a new password:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background-color: #003527; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #374151; font-size: 14px; margin-top: 32px;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #006c49; word-break: break-all;">${resetLink}</a>
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            This link will expire in 15 minutes. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend Error - ResetEmail]:", error);
      return { success: false, error };
    }

    console.log(`✅ [Email Service] Reset link successfully sent to ${to}:`, data?.id);
    return { success: true, data };
  } catch (error) {
    console.error("[Email Service catch - ResetEmail]:", error);
    return { success: false, error };
  }
}
