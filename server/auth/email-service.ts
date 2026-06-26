import { Resend } from "resend";
import { env } from "../config/env";
import { getResendFromEmail } from "./email-config";

const resend = new Resend(env.RESEND_API_KEY);

interface SendOtpEmailProps {
  to: string;
  firstName: string;
  code: string;
  verificationLink?: string;
}

export async function sendOtpEmail({ to, firstName, code, verificationLink }: SendOtpEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: getResendFromEmail(),
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
          ${
            verificationLink
              ? `
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Or verify instantly with one click:
          </p>
          <div style="text-align: center; margin: 24px 0 32px;">
            <a href="${verificationLink}" style="background-color: #003527; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #374151; font-size: 14px; margin-top: 16px;">
            Or copy and paste this link into your browser:<br>
            <a href="${verificationLink}" style="color: #006c49; word-break: break-all;">${verificationLink}</a>
          </p>
          `
              : ""
          }
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
      from: getResendFromEmail(), // replace in prod
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
      from: getResendFromEmail(),
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

interface SendBroadcastEmailProps {
  to: string | string[];
  subject: string;
  title: string;
  message: string;
  ctaText?: string;
  ctaLink?: string;
  footerNote?: string;
}

export async function sendBroadcastEmail({
  to,
  subject,
  title,
  message,
  ctaText,
  ctaLink,
  footerNote
}: SendBroadcastEmailProps) {
  try {
    const recipients = Array.isArray(to) ? to : [to];

    const { data, error } = await resend.emails.send({
      from: getResendFromEmail(),
      to: recipients,
      subject,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f9fafb;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #f1f5f9;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04);
    }
    .header {
      padding: 40px 40px 0;
      text-align: left;
    }
    .content {
      padding: 40px;
    }
    .footer {
      padding: 40px;
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      text-align: center;
    }
    .logo {
      color: #003527;
      font-size: 24px;
      font-weight: 800;
      text-decoration: none;
      letter-spacing: -0.03em;
    }
    h1 {
      color: #003527;
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 24px;
      letter-spacing: -0.04em;
      line-height: 1.1;
    }
    p {
      color: #475569;
      font-size: 16px;
      line-height: 1.7;
      margin: 0 0 24px;
    }
    .btn-container {
      margin-top: 40px;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background-color: #003527;
      color: #ffffff !important;
      padding: 18px 40px;
      text-decoration: none;
      border-radius: 14px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 6px -1px rgba(0, 53, 39, 0.1);
    }
    .footer-text {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
    }
    .unsubscribe {
      color: #cbd5e1;
      text-decoration: underline;
      font-size: 12px;
      margin-top: 24px;
      display: block;
    }
    @media (max-width: 600px) {
      .container { border-radius: 0; }
      .content, .header, .footer { padding: 30px; }
      h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://ventrapos.com" class="logo">VentraPOS</a>
      </div>
      <div class="content">
        <h1>${title}</h1>
        <p>${message.replace(/\n/g, '<br>')}</p>
        ${ctaLink && ctaText ? `
          <div class="btn-container">
            <a href="${ctaLink}" class="btn">${ctaText}</a>
          </div>
        ` : ''}
      </div>
      <div class="footer">
        ${footerNote ? `<p class="footer-text" style="color: #64748b; margin-bottom: 20px; font-weight: 500;">${footerNote}</p>` : ''}
        <p class="footer-text">
          &copy; 2026 VentraPOS. All rights reserved.<br>
          Modern Retail Operating System.
        </p>
        <a href="#" class="unsubscribe">Unsubscribe from future updates</a>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("[Email Service - Broadcast]:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[Email Service catch - Broadcast]:", error);
    return { success: false, error };
  }
}

interface SendContactEmailProps {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}

export async function sendContactEmail({
  senderName,
  senderEmail,
  subject: contactSubject,
  message
}: SendContactEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: getResendFromEmail("VentraPOS Contact Form"),
      to: ["support@ventrapos.com"],
      subject: `[Contact Form] ${contactSubject}`,
      replyTo: senderEmail,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h1 style="color: #003527; font-size: 24px; font-weight: 700; margin-bottom: 8px;">New Contact Message</h1>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">Received via ventrapos.com contact page.</p>
          
          <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; border: 1px solid #f3f4f6;">
            <div style="margin-bottom: 16px;">
              <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #9ca3af; display: block; margin-bottom: 4px;">From</span>
              <span style="font-size: 16px; font-weight: 600;">${senderName}</span>
            </div>
            <div style="margin-bottom: 16px;">
              <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #9ca3af; display: block; margin-bottom: 4px;">Email</span>
              <a href="mailto:${senderEmail}" style="color: #006c49; text-decoration: none; font-size: 16px;">${senderEmail}</a>
            </div>
            <div style="margin-bottom: 16px;">
              <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #9ca3af; display: block; margin-bottom: 4px;">Subject</span>
              <span style="font-size: 16px;">${contactSubject}</span>
            </div>
            <div>
              <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #9ca3af; display: block; margin-bottom: 4px;">Message</span>
              <div style="font-size: 16px; line-height: 1.6; color: #374151; white-space: pre-wrap;">${message}</div>
            </div>
          </div>
          
          <div style="margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 24px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px;">This is an automated notification from VentraPOS.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Email Service - Contact]:", error);
      return { success: false, error };
    }

    console.log(`✅ [Email Service] Contact form message from ${senderEmail} successfully routed to support inbox.`);
    return { success: true, data };
  } catch (error) {
    console.error("[Email Service catch - Contact]:", error);
    return { success: false, error };
  }
}

interface SendWeeklyReportEmailProps {
  to: string;
  businessName: string;
  reportDate: string;
  stats: {
    revenue: string;
    profit: string;
    orders: number;
    topProducts: Array<{ name: string; quantity: number; revenue: string }>;
    lowStockCount: number;
  };
  excelBuffer: Buffer;
}

export async function sendWeeklyReportEmail({
  to,
  businessName,
  reportDate,
  stats,
  excelBuffer
}: SendWeeklyReportEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: getResendFromEmail("VentraPOS Reports"),
      to: [to],
      subject: `Weekly Performance Report: ${businessName} (${reportDate})`,
      attachments: [
        {
          filename: `VentraPOS_Weekly_Report_${businessName.replace(/\s+/g, '_')}_${reportDate}.xlsx`,
          content: excelBuffer,
        },
      ],
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #003527 0%, #064e3b 100%); padding: 48px 40px; color: white; }
    .content { padding: 40px; }
    .kpi-grid { display: block; margin-bottom: 32px; }
    .kpi-card { background: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 20px; border: 1px solid #f1f5f9; }
    .kpi-label { color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .kpi-value { font-size: 28px; font-weight: 800; color: #0f172a; }
    .section-title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 40px 0 20px; }
    .product-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .footer { padding: 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 14px; }
    .badge { background: #fff1f2; color: #e11d48; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 14px; font-weight: 600; opacity: 0.8; text-transform: uppercase; margin-bottom: 8px;">Weekly Summary</div>
      <h1 style="margin: 0; font-size: 32px; letter-spacing: -0.025em;">${businessName}</h1>
      <div style="margin-top: 16px; font-size: 16px; opacity: 0.9;">Period: ${reportDate}</div>
    </div>
    <div class="content">
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Gross Revenue</div>
          <div class="kpi-value" style="color: #059669;">GHS ${stats.revenue}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Estimated Profit</div>
          <div class="kpi-value">GHS ${stats.profit}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Orders</div>
          <div class="kpi-value">${stats.orders}</div>
        </div>
      </div>

      <div class="section-title">Top Performing Products</div>
      ${stats.topProducts.map(p => `
        <div class="product-row">
          <div style="font-weight: 600; color: #334155;">${p.name}</div>
          <div style="color: #64748b;">${p.quantity} sold · GHS ${p.revenue}</div>
        </div>
      `).join('')}

      <div style="margin-top: 40px; padding: 24px; background: #fffbeb; border-radius: 16px; border: 1px solid #fef3c7;">
        <span class="badge" style="background: #fef3c7; color: #d97706;">Stock Alert</span>
        <div style="margin-top: 12px; color: #92400e; font-weight: 600;">
          ${stats.lowStockCount} products are currently below reorder points.
        </div>
        <div style="margin-top: 4px; color: #b45309; font-size: 14px;">
          Check the attached Excel file for the full list of items needing restock.
        </div>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 VentraPOS Reports. All rights reserved.<br>
      This is an automated performance audit.
    </div>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("[Email Service - Weekly Report Error]:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[Email Service - Weekly Report Catch]:", error);
    return { success: false, error };
  }
}


