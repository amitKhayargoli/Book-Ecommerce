import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ─── Shared email shell ────────────────────────────────────────────

const BG = "#0B0B0C";
const CARD = "#111111";
const CARD_BORDER = "#1E1E1E";
const FG = "#FFFFFF";
const TEXT_SECONDARY = "#A1A1AA";
const TEXT_MUTED = "#52525B";
const ACCENT = "#FF4D6D";

function emailShell(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@700;800;900&family=Inter:wght@400;500;600&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;padding:32px 16px">
    <!-- Brand dots -->
    <tr><td style="padding:0 0 24px;text-align:center">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto">
        <tr>
          <td style="padding:1px"><div style="width:6px;height:6px;border-radius:50%;background:${TEXT_MUTED}"></div></td>
          <td style="padding:1px"><div style="width:6px;height:6px;border-radius:50%;background:${TEXT_MUTED}"></div></td>
        </tr>
        <tr>
          <td style="padding:1px"><div style="width:6px;height:6px;border-radius:50%;background:${TEXT_MUTED}"></div></td>
          <td style="padding:1px"><div style="width:6px;height:6px;border-radius:50%;background:${TEXT_MUTED}"></div></td>
        </tr>
      </table>
    </td></tr>

    <!-- Card -->
    <tr><td style="background:${CARD};border:1px solid ${CARD_BORDER};border-radius:16px;padding:40px 32px;text-align:center">
      ${content}
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:24px 0 0;text-align:center;font-size:12px;color:${TEXT_MUTED}">
      BOOK Premium Book Store
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Individual templates ─────────────────────────────────────────

function verificationEmailHtml(url: string, name: string): string {
  return emailShell(`
      <h1 style="font-family:'Epilogue',sans-serif;font-size:24px;font-weight:800;color:${FG};margin:0 0 8px;letter-spacing:-0.5px">
        Verify your email
      </h1>
      <p style="color:${TEXT_SECONDARY};margin:0 0 28px;font-size:15px">
        Hi ${escapeHtml(name)}, click the button to confirm your account.
      </p>
      <a href="${escapeHtml(url)}"
         style="display:inline-block;padding:14px 36px;background:${FG};color:${BG};border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.2px">
        Verify email
      </a>
      <p style="color:${TEXT_MUTED};margin:28px 0 0;font-size:13px;line-height:1.5">
        This link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
  `);
}

function passwordResetEmailHtml(url: string, name: string): string {
  return emailShell(`
      <h1 style="font-family:'Epilogue',sans-serif;font-size:24px;font-weight:800;color:${FG};margin:0 0 8px;letter-spacing:-0.5px">
        Reset your password
      </h1>
      <p style="color:${TEXT_SECONDARY};margin:0 0 28px;font-size:15px">
        Hi ${escapeHtml(name)}, you requested a password reset.
      </p>
      <a href="${escapeHtml(url)}"
         style="display:inline-block;padding:14px 36px;background:${FG};color:${BG};border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.2px">
        Reset password
      </a>
      <p style="color:${TEXT_MUTED};margin:28px 0 0;font-size:13px;line-height:1.5">
        This link expires in 1 hour. If you didn't request this, ignore this email.
      </p>
  `);
}

function orderConfirmationHtml(order: {
  id: string;
  totalAmount: number;
  items: Array<{ title: string; quantity: number; price: number }>;
  name: string;
}): string {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${CARD_BORDER};font-size:14px;color:${FG}">${escapeHtml(item.title)}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${CARD_BORDER};font-size:14px;color:${TEXT_SECONDARY};text-align:center">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${CARD_BORDER};font-size:14px;color:${FG};text-align:right">NPR ${item.price.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  return emailShell(`
      <h1 style="font-family:'Epilogue',sans-serif;font-size:24px;font-weight:800;color:${FG};margin:0 0 4px;letter-spacing:-0.5px">
        Order confirmed
      </h1>
      <p style="color:${TEXT_SECONDARY};margin:0 0 4px;font-size:15px">
        Thanks ${escapeHtml(order.name)}!
      </p>
      <p style="color:${TEXT_MUTED};margin:0 0 28px;font-size:13px">
        Order #${escapeHtml(order.id.slice(-8).toUpperCase())}
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr>
          <th style="padding:8px 0 6px;border-bottom:2px solid ${TEXT_MUTED};font-size:11px;color:${TEXT_MUTED};text-align:left;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Item</th>
          <th style="padding:8px 0 6px;border-bottom:2px solid ${TEXT_MUTED};font-size:11px;color:${TEXT_MUTED};text-align:center;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Qty</th>
          <th style="padding:8px 0 6px;border-bottom:2px solid ${TEXT_MUTED};font-size:11px;color:${TEXT_MUTED};text-align:right;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Price</th>
        </tr>
        ${itemsHtml}
      </table>

      <div style="margin-top:16px;padding-top:16px;border-top:1px solid ${CARD_BORDER};text-align:right">
        <span style="font-size:13px;color:${TEXT_MUTED};margin-right:8px">Total</span>
        <span style="font-size:20px;font-weight:700;color:${FG}">NPR ${order.totalAmount.toFixed(2)}</span>
      </div>

      <p style="color:${TEXT_MUTED};margin:28px 0 0;font-size:13px;line-height:1.5">
        You'll receive a confirmation when your order ships. View your order history in your account.
      </p>
  `);
}

function welcomeEmailHtml(name: string): string {
  return emailShell(`
      <h1 style="font-family:'Epilogue',sans-serif;font-size:24px;font-weight:800;color:${FG};margin:0 0 8px;letter-spacing:-0.5px">
        Welcome to BOOK
      </h1>
      <p style="color:${TEXT_SECONDARY};margin:0 0 4px;font-size:15px">
        Hi ${escapeHtml(name)},
      </p>
      <p style="color:${TEXT_SECONDARY};margin:0 0 28px;font-size:15px">
        Your account is ready. Discover stories that stay with you.
      </p>
      <a href="${escapeHtml(process.env.FRONTEND_BASE_URL ?? "http://localhost:3000")}/books"
         style="display:inline-block;padding:14px 36px;background:${FG};color:${BG};border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.2px">
        Browse books
      </a>
      <p style="color:${TEXT_MUTED};margin:24px 0 0;font-size:13px">
        Explore curated genres, build your wishlist, and find your next great read.
      </p>
  `);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── MailService ───────────────────────────────────────────────────

export class MailService {
  private transporter: Transporter | null = null;
  private fromName: string;
  private fromEmail: string;
  private enabled: boolean;

  constructor() {
    this.fromName = process.env.SMTP_FROM_NAME ?? "BOOK Bookstore";
    this.fromEmail = process.env.SMTP_FROM_EMAIL ?? "noreply@bookstore.com";
    this.enabled = false;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
      });
      this.enabled = true;
    } else {
      console.warn(
        "[MailService] SMTP not configured : emails will be logged to console instead of sent.",
      );
    }
  }

  private async send(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.enabled || !this.transporter) {
      console.log("\n─── Email (not sent, SMTP not configured) ──────────");
      console.log(`  To: ${options.to}`);
      console.log(`  Subject: ${options.subject}`);
      console.log("──────────────────────────────────────────────────\n");
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (err) {
      console.error(`[MailService] Failed to send email to ${options.to}:`, err);
    }
  }

  /**
   * Send a verification email with a link to verify the user's email address.
   * Triggered after registration.
   */
  async sendVerificationEmail(to: string, name: string, url: string): Promise<void> {
    await this.send({
      to,
      subject: "Verify your email : BOOK Bookstore",
      html: verificationEmailHtml(url, name),
    });
  }

  /**
   * Send a password reset email with a link to reset the user's password.
   * Triggered on forgot-password request.
   */
  async sendPasswordResetEmail(to: string, name: string, url: string): Promise<void> {
    await this.send({
      to,
      subject: "Reset your password : BOOK Bookstore",
      html: passwordResetEmailHtml(url, name),
    });
  }

  /**
   * Send an order confirmation email with itemised order summary.
   * Triggered after successful payment verification.
   */
  async sendOrderConfirmation(
    to: string,
    name: string,
    order: {
      id: string;
      totalAmount: number;
      items: Array<{ title: string; quantity: number; price: number }>;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `Order confirmed : BOOK Bookstore`,
      html: orderConfirmationHtml({ ...order, name }),
    });
  }

  /**
   * Send a welcome email after successful email verification.
   * Triggered when a user confirms their email address.
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.send({
      to,
      subject: "Welcome to BOOK : Premium Book Store",
      html: welcomeEmailHtml(name),
    });
  }
}
