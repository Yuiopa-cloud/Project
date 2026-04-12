import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function moneyRow(label: string, value: string): string {
  return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#444;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#111;">${escapeHtml(value)}</td></tr>`;
}

type SmtpResolved = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly log = new Logger(NotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  /** One-line hint at boot: Resend vs SMTP vs disabled (debugs missing env on Railway). */
  onModuleInit(): void {
    if (this.config.get<string>('RESEND_API_KEY')?.trim()) {
      this.log.log('Email transport: Resend (HTTPS API)');
      return;
    }
    const smtp = this.resolveSmtp();
    if (smtp) {
      this.log.log(`Email transport: SMTP ${smtp.host}:${smtp.port}`);
    }
  }

  /**
   * Merchant notification recipient — env only (no hardcoded inbox).
   * Prefer ORDER_NOTIFICATION_EMAIL; else SMTP_USER / EMAIL_USER (for Resend-only setups).
   */
  private merchantInbox(): string | null {
    const orderNotif = this.config.get<string>('ORDER_NOTIFICATION_EMAIL')?.trim();
    if (orderNotif) return orderNotif;
    const smtpUser =
      this.config.get<string>('SMTP_USER')?.trim() ||
      this.config.get<string>('EMAIL_USER')?.trim();
    if (smtpUser) return smtpUser;
    return null;
  }

  /** Resend `from` — verified domain in production; `onboarding@resend.dev` only for quick tests. */
  private buildResendFrom(): string {
    const fromRaw = this.config.get<string>('RESEND_FROM')?.trim();
    if (fromRaw && fromRaw.includes('@')) {
      return fromRaw.includes('<') ? fromRaw : `"Easy Handles" <${fromRaw}>`;
    }
    return '"Easy Handles" <onboarding@resend.dev>';
  }

  private async sendViaResend(
    apiKey: string,
    opts: { to: string; subject: string; text: string; html: string },
  ): Promise<boolean> {
    const from = this.buildResendFrom();
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
      };
      if (!res.ok) {
        this.log.error(
          `Resend API failed → ${opts.to}: HTTP ${res.status} ${JSON.stringify(body)}`,
        );
        return false;
      }
      this.log.log(
        `Email sent (Resend): id=${body.id ?? '?'} → ${opts.to} subject="${opts.subject}"`,
      );
      return true;
    } catch (error) {
      const err = error as Error;
      this.log.error(`Resend request failed → ${opts.to}: ${err?.message}`, err?.stack);
      return false;
    }
  }

  /**
   * SMTP from env: SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS.
   * Aliases: EMAIL_USER / EMAIL_PASS / EMAIL_API_KEY for auth when SMTP_* unset.
   * From header: `"Auto Store" <SMTP_USER>` (auth user must match envelope from for many providers).
   */
  private resolveSmtp(): SmtpResolved | null {
    const host =
      this.config.get<string>('SMTP_HOST')?.trim() ||
      this.config.get<string>('EMAIL_SMTP_HOST')?.trim() ||
      '';
    const user =
      this.config.get<string>('SMTP_USER')?.trim() ||
      this.config.get<string>('EMAIL_USER')?.trim() ||
      '';
    const pass =
      this.config.get<string>('SMTP_PASS')?.trim() ||
      this.config.get<string>('EMAIL_PASS')?.trim() ||
      this.config.get<string>('EMAIL_API_KEY')?.trim() ||
      '';
    if (!host || !user || !pass) {
      this.log.warn(
        'Email disabled: set SMTP_HOST, SMTP_USER, SMTP_PASS (or EMAIL_* aliases) in environment',
      );
      return null;
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? process.env.SMTP_PORT ?? '587');
    const secure = port === 465;
    return { host, port, secure, user, pass };
  }

  private async sendMail(opts: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    const resendKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (resendKey) {
      return this.sendViaResend(resendKey, opts);
    }

    const smtp = this.resolveSmtp();
    if (!smtp) {
      return false;
    }
    const fromRaw = this.config.get<string>('SMTP_FROM')?.trim();
    const fromHeader =
      fromRaw && fromRaw.includes('@')
        ? fromRaw.includes('<')
          ? fromRaw
          : `"Easy Handles" <${fromRaw}>`
        : `"Easy Handles" <${smtp.user}>`;

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 20_000,
        ...(smtp.port === 587 ? { requireTLS: true } : {}),
      });
      const info = await transporter.sendMail({
        from: fromHeader,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      this.log.log(
        `Email sent: messageId=${info.messageId} → ${opts.to} subject="${opts.subject}"`,
      );
      return true;
    } catch (error) {
      const err = error as Error & { response?: string; responseCode?: number };
      this.log.error(
        `Email sending failed → ${opts.to}: ${err?.message}`,
        err?.stack,
      );
      if (err?.response !== undefined) {
        this.log.error(`SMTP response: ${err.response}`);
      }
      if (err?.responseCode !== undefined) {
        this.log.error(`SMTP responseCode: ${err.responseCode}`);
      }
      return false;
    }
  }

  async sendOrderConfirmationEmail(payload: {
    to?: string | null;
    orderNumber: string;
    totalMad: string;
    subtotalMad: string;
    shippingMad: string;
    discountMad: string;
    customerName: string;
    paymentLabel: string;
    lines: { title: string; qty: number; lineTotal: string }[];
    address: {
      line1: string;
      quarter: string;
      cityCode: string;
      cityName: string;
      cityLabel: string;
      postal?: string | null;
    };
    /** Livraison — shown in email */
    shippingPhone?: string;
    locale?: string;
  }): Promise<boolean> {
    if (!payload.to?.trim()) {
      this.log.debug(
        `Customer confirmation skipped (no email): ${payload.orderNumber}`,
      );
      return false;
    }
    const to = payload.to.trim().toLowerCase();
    const isAr = payload.locale === 'ar';
    const html = isAr
      ? `
<!DOCTYPE html>
<html dir="rtl"><body style="font-family:system-ui,sans-serif;background:#f4f7fb;padding:24px;margin:0;">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08);">
<tr><td style="padding:28px;">
<p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#0d9488;">Atlas Auto</p>
<h1 style="margin:12px 0 16px;font-size:22px;color:#0f172a;">تم استلام طلبك</h1>
<p style="margin:0 0 12px;font-size:15px;color:#0f172a;line-height:1.6;">مرحبًا ${escapeHtml(payload.customerName)}،</p>
<p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">شكرًا لك — تم تسجيل طلبك تحت المرجع <strong>${escapeHtml(payload.orderNumber)}</strong>. سنتواصل معك قريبًا بخصوص التسليم.</p>
<p style="margin:16px 0 0;font-size:14px;color:#64748b;">فريق Atlas Auto</p>
</td></tr>
</table>
</body></html>`
      : `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#f4f7fb;padding:24px;margin:0;">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08);">
<tr><td style="padding:28px;">
<p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#0d9488;">Atlas Auto</p>
<h1 style="margin:12px 0 16px;font-size:22px;color:#0f172a;">Commande bien reçue</h1>
<p style="margin:0 0 12px;font-size:15px;color:#0f172a;line-height:1.6;">Bonjour ${escapeHtml(payload.customerName)},</p>
<p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">Merci — votre commande est enregistrée sous la référence <strong>${escapeHtml(payload.orderNumber)}</strong>. Nous vous recontacterons bientôt pour la livraison.</p>
<p style="margin:16px 0 0;font-size:14px;color:#64748b;">L’équipe Atlas Auto</p>
</td></tr>
</table>
</body></html>`;
    const text = isAr
      ? `Atlas Auto — طلبك مسجل تحت ${payload.orderNumber}. شكرًا ${payload.customerName}.`
      : `Atlas Auto — Commande enregistrée (${payload.orderNumber}). Merci ${payload.customerName}.`;
    return this.sendMail({
      to,
      subject:
        payload.locale === 'ar'
          ? `تأكيد الطلب ${payload.orderNumber}`
          : `Confirmation — ${payload.orderNumber} · Atlas Auto`,
      text,
      html,
    });
  }

  async sendMerchantNewOrderEmail(payload: {
    orderNumber: string;
    totalMad: string;
    subtotalMad: string;
    shippingMad: string;
    discountMad: string;
    paymentMethod: string;
    customer: {
      firstName: string;
      lastName: string;
      email?: string | null;
      phone: string;
    };
    address: {
      line1: string;
      quarter: string;
      cityCode: string;
      cityName: string;
      cityLabel: string;
      postal?: string | null;
    };
    lines: {
      title: string;
      qty: number;
      unitPrice: string;
      lineTotal: string;
    }[];
    couponCode?: string | null;
  }): Promise<boolean> {
    const to = this.merchantInbox();
    if (!to) {
      this.log.warn(
        `Merchant new-order email skipped (set ORDER_NOTIFICATION_EMAIL or SMTP_USER / EMAIL_USER): order ${payload.orderNumber}`,
      );
      return false;
    }
    const lineRows = payload.lines
      .map(
        (l) =>
          `<tr>
<td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(l.title)}</td>
<td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${l.qty}</td>
<td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${escapeHtml(l.unitPrice)}</td>
<td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${escapeHtml(l.lineTotal)} MAD</td>
</tr>`,
      )
      .join('');
    const html = `
<!DOCTYPE html>
<html><body style="margin:0;background:#0f172a;padding:28px;">
<table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;">
<tr><td style="background:linear-gradient(120deg,#0d9488,#6366f1);padding:24px 28px;">
<h1 style="margin:0;font-size:18px;color:#fff;font-weight:700;">Nouvelle commande Atlas Auto</h1>
<p style="margin:8px 0 0;font-size:26px;font-weight:800;color:#fff;letter-spacing:.04em;">${escapeHtml(payload.orderNumber)}</p>
</td></tr>
<tr><td style="padding:24px 28px 12px;">
<h2 style="margin:0 0 12px;font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#64748b;">Client</h2>
<p style="margin:0;font-size:15px;color:#0f172a;line-height:1.6;">
<strong>${escapeHtml(payload.customer.firstName)} ${escapeHtml(payload.customer.lastName)}</strong><br/>
Tél. ${escapeHtml(payload.customer.phone)}<br/>
${payload.customer.email ? `Email : ${escapeHtml(payload.customer.email)}` : '— pas d’email guest —'}
</p>
</td></tr>
<tr><td style="padding:12px 28px;">
<h2 style="margin:0 0 12px;font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#64748b;">Adresse de livraison</h2>
<p style="margin:0;font-size:15px;color:#0f172a;line-height:1.6;">
${escapeHtml(payload.address.line1)}<br/>
${escapeHtml(payload.address.quarter)} — <strong>${escapeHtml(payload.address.cityLabel)}</strong> (${escapeHtml(payload.address.cityName)} · ${escapeHtml(payload.address.cityCode)})
${payload.address.postal ? `<br/>CP ${escapeHtml(String(payload.address.postal))}` : ''}
</p>
</td></tr>
<tr><td style="padding:12px 28px 24px;">
<h2 style="margin:0 0 12px;font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#64748b;">Détail des lignes</h2>
<table width="100%" style="border-collapse:collapse;font-size:14px;">
<tr style="background:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;">
<th align="left" style="padding:10px;">Produit</th><th style="padding:10px;">Qté</th><th align="right" style="padding:10px;">P.U.</th><th align="right" style="padding:10px;">Total</th>
</tr>
${lineRows}
</table>
<table width="100%" style="border-collapse:collapse;font-size:14px;margin-top:16px;">
${moneyRow('Sous-total', `${payload.subtotalMad} MAD`)}
${parseFloat(payload.discountMad) > 0 ? moneyRow('Remise', `− ${payload.discountMad} MAD`) : ''}
${moneyRow('Livraison', `${payload.shippingMad} MAD`)}
<tr><td style="padding:14px 0 4px;font-size:14px;font-weight:700;color:#0f172a;">Total TTC</td><td style="padding:14px 0 4px;text-align:right;font-size:20px;font-weight:800;color:#0d9488;">${escapeHtml(payload.totalMad)} MAD</td></tr>
</table>
<p style="margin:16px 0 0;font-size:14px;color:#475569;">Paiement : <strong>${escapeHtml(payload.paymentMethod)}</strong>
${payload.couponCode ? `<br/>Coupon : <strong>${escapeHtml(payload.couponCode)}</strong>` : ''}
</p>
</td></tr>
</table>
<p style="text-align:center;margin:20px 0 0;font-size:12px;color:#94a3b8;">Notification boutique — ne pas répondre à cet expéditeur automatisé.</p>
</body></html>`;

    const text = [
      `NOUVELLE COMMANDE ${payload.orderNumber}`,
      `Client: ${payload.customer.firstName} ${payload.customer.lastName}`,
      `Tél: ${payload.customer.phone}`,
      payload.customer.email ? `Email: ${payload.customer.email}` : '',
      '',
      ...payload.lines.map(
        (l) => `- ${l.title} x${l.qty} = ${l.lineTotal} MAD`,
      ),
      '',
      `Total: ${payload.totalMad} MAD`,
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendMail({
      to,
      subject: `🛒 Nouvelle commande ${payload.orderNumber} — ${payload.totalMad} MAD`,
      text,
      html,
    });
  }

  buildWhatsAppOrderLink(input: {
    phoneCustomer: string;
    orderNumber: string;
    totalMad: string;
  }): string {
    const business = this.config
      .get<string>('WHATSAPP_PHONE_E164', '212620388209')
      .replace(/\D/g, '');
    const text = encodeURIComponent(
      `Bonjour Atlas Auto — commande ${input.orderNumber}, total ${input.totalMad} MAD. Merci de confirmer par téléphone.`,
    );
    return `https://wa.me/${business}?text=${text}`;
  }

  async sendWhatsAppTemplate(_payload: {
    toE164: string;
    orderNumber: string;
  }) {
    const token = this.config.get<string>('WHATSAPP_API_TOKEN');
    if (!token) {
      this.log.debug(
        'WhatsApp Cloud API not configured — use wa.me link client-side',
      );
      return;
    }
    this.log.debug(
      'WhatsApp API token present; implement template send in production',
    );
  }
}
