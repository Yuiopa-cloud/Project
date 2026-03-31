import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  private merchantInbox(): string {
    return (
      this.config.get<string>('ORDER_NOTIFICATION_EMAIL')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      'youssefstat20@gmail.com'
    );
  }

  private async sendMail(opts: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (!smtpHost) {
      this.log.debug('SMTP_HOST not set — email skipped');
      return;
    }
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!user || !pass) {
      this.log.debug('SMTP_USER/SMTP_PASS missing — email skipped');
      return;
    }
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.config.get('SMTP_PORT', 587)),
        secure: false,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM'),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
    } catch (e) {
      this.log.warn(`sendMail failed to ${opts.to}: ${e}`);
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
      postal?: string | null;
    };
    locale?: string;
  }) {
    if (!payload.to?.trim()) {
      this.log.debug(
        `Customer email skip (no address): order ${payload.orderNumber}`,
      );
      return;
    }
    const to = payload.to.trim();
    const linesRows = payload.lines
      .map(
        (l) =>
          `<tr><td style="padding:10px 8px;border-bottom:1px solid #eee;">${escapeHtml(l.title)} × ${l.qty}</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(l.lineTotal)} MAD</td></tr>`,
      )
      .join('');
    const html = `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#f4f7fb;padding:24px;margin:0;">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08);">
<tr><td style="padding:28px 28px 8px;">
<p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#0d9488;">Atlas Auto</p>
<h1 style="margin:12px 0 8px;font-size:22px;color:#0f172a;">${payload.locale === 'ar' ? 'تأكيد الطلب' : 'Commande confirmée'}</h1>
<p style="margin:0;color:#64748b;font-size:15px;">${escapeHtml(payload.customerName)} — <strong>${escapeHtml(payload.orderNumber)}</strong></p>
</td></tr>
<tr><td style="padding:0 28px;">
<table width="100%" style="border-collapse:collapse;font-size:14px;">${linesRows}</table>
<table width="100%" style="border-collapse:collapse;font-size:14px;margin-top:8px;">
${moneyRow('Sous-total', `${payload.subtotalMad} MAD`)}
${parseFloat(payload.discountMad) > 0 ? moneyRow('Réduction', `− ${payload.discountMad} MAD`) : ''}
${moneyRow('Livraison', `${payload.shippingMad} MAD`)}
<tr><td style="padding:12px 0 0;font-size:15px;font-weight:700;color:#0f172a;">Total</td><td style="padding:12px 0 0;text-align:right;font-size:18px;font-weight:800;color:#0d9488;">${escapeHtml(payload.totalMad)} MAD</td></tr>
</table>
</td></tr>
<tr><td style="padding:16px 28px 28px;">
<p style="margin:0 0 8px;font-size:13px;color:#64748b;">Livraison</p>
<p style="margin:0;font-size:14px;color:#0f172a;">${escapeHtml(payload.address.line1)}, ${escapeHtml(payload.address.quarter)} — ${escapeHtml(payload.address.cityName)} (${escapeHtml(payload.address.cityCode)})</p>
<p style="margin:12px 0 0;font-size:13px;color:#64748b;">Paiement : ${escapeHtml(payload.paymentLabel)}</p>
</td></tr>
</table>
</body></html>`;
    const text = `Commande ${payload.orderNumber}\nTotal: ${payload.totalMad} MAD\nMerci pour votre achat, ${payload.customerName}.`;
    await this.sendMail({
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
      postal?: string | null;
    };
    lines: {
      title: string;
      qty: number;
      unitPrice: string;
      lineTotal: string;
    }[];
    couponCode?: string | null;
  }) {
    const to = this.merchantInbox();
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
${escapeHtml(payload.address.quarter)} — ${escapeHtml(payload.address.cityName)} (${escapeHtml(payload.address.cityCode)})
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

    await this.sendMail({
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
