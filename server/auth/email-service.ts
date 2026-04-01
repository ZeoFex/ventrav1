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

interface SendSubscriptionEmailProps {
  to: string;
  firstName?: string;
  planName: string;
  amount: string;
  cycle: "monthly" | "annually";
}

export async function sendSubscriptionEmail({
  to,
  firstName,
  planName,
  amount,
  cycle
}: SendSubscriptionEmailProps) {
  try {
    const greeting = firstName ? `Hi ${firstName},` : "Hello,";
    const subject = `Receipt for your VentraPOS ${planName} Plan`;
    
    const { data, error } = await resend.emails.send({
      from: "VentraPOS <noreply@askorin.app>",
      to: [to],
      subject,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111827;">
          <div style="margin-bottom: 32px; border-bottom: 2px solid #f3f4f6; padding-bottom: 24px;">
            <h1 style="color: #003527; margin: 0; font-size: 28px; letter-spacing: -0.025em;">VentraPOS</h1>
          </div>
          
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #003527;">Welcome to the ${planName} Plan!</h2>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            ${greeting}
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
            Thank you for choosing VentraPOS. Your subscription is now active, and you have full access to all the premium features of your plan.
          </p>
          
          <div style="background-color: #f9fafb; border-radius: 16px; padding: 32px; border: 1px solid #f3f4f6; margin-bottom: 32px;">
            <h3 style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-top: 0; margin-bottom: 20px;">Payment Summary</h3>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #4b5563;">Selected Plan</span>
              <span style="font-weight: 600;">${planName} (${cycle})</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 12px; border-top: 1px solid #e5e7eb;">
              <span style="font-weight: 700; font-size: 18px;">Total Paid</span>
              <span style="font-weight: 700; font-size: 18px; color: #006c49;">GHS ${amount}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 40px;">
            <a href="https://ventrapos.app/login" style="background-color: #003527; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; display: inline-block; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
          
          <div style="margin-top: 60px; border-top: 1px solid #f3f4f6; pt: 32px; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px;">
              &copy; 2026 VentraPOS. All rights reserved.<br>
              Modern Retail Operating System.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Email Service - Subscription]:", error);
      return { success: false, error };
    }

    console.log(`✅ [Email Service] Subscription email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error("[Email Service catch - Subscription]:", error);
    return { success: false, error };
  }
}

