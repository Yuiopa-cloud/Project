# Order emails — exact checklist (Railway / production)

If checkout works but you get **no mail**, or you only fixed “stuck on Validation…”, configure the following on the **API service** (Nest backend), not on Vercel alone.

## 0. Resend (HTTPS) — use this on Railway Free / Hobby

Railway **blocks outbound SMTP** on Free, Trial, and Hobby. Nodemailer then shows **Connection timeout**. Use [Resend](https://resend.com) over **HTTPS** instead (works on every plan).

On the **API** environment:

| Variable | Required | Example / notes |
|----------|----------|------------------|
| `RESEND_API_KEY` | Yes | `re_...` from Resend dashboard → API Keys. |
| `RESEND_FROM` | Strongly recommended | `orders@yourdomain.com` or `"Atlas Auto" <orders@yourdomain.com>` after you **verify your domain** in Resend. |
| `ORDER_NOTIFICATION_EMAIL` | Recommended | Inbox for **new order** alerts (e.g. your Gmail). Without it, merchant mail uses `SMTP_USER` or `EMAIL_USER` if set. |

If `RESEND_FROM` is unset, the API uses `onboarding@resend.dev`. In that mode Resend **only allows sending to the email address of your Resend account** (e.g. your Gmail). Any other customer address returns **HTTP 403** with *“verify a domain”*. **To email real customers, you must:** [add & verify a domain](https://resend.com/domains) in Resend, then set `RESEND_FROM` to an address on that domain (e.g. `noreply@yourdomain.com`).

Set **`ORDER_NOTIFICATION_EMAIL`** to your own inbox (e.g. `youssefstat20@gmail.com`) so **you** still receive the detailed “new order” email for every checkout; the **customer** only gets the short confirmation (no line items in that message — full detail stays in the merchant mail).

**Do not set** `RESEND_API_KEY` if you want to use SMTP only (e.g. local dev or Railway Pro).

Redeploy the API after changing variables. Logs show `Email sent (Resend): id=...` on success.

## 1. Required for any email to send (SMTP path)

Set **all three** on the backend environment:

| Variable | Example | Notes |
|----------|---------|--------|
| `SMTP_HOST` | `smtp.gmail.com` | Gmail uses this host for app passwords. |
| `SMTP_USER` | `yourstore@gmail.com` | The Google account that owns the app password. |
| `SMTP_PASS` | `xxxx xxxx xxxx xxxx` | Gmail **App password** (16 chars, spaces optional). **Not** your normal Gmail password. |

**Aliases (same meaning):** you may use `EMAIL_USER` + `EMAIL_PASS` or `EMAIL_API_KEY` instead of `SMTP_USER` / `SMTP_PASS` if you prefer.

If any of `SMTP_HOST`, `SMTP_USER`, or `SMTP_PASS` is missing, the app **skips sending** and logs: `Email disabled: set SMTP_HOST, SMTP_USER, SMTP_PASS`.

## 2. Gmail app password (step by step)

1. Google Account → **Security** → enable **2-Step Verification** if needed.  
2. Security → **App passwords** → create an app password for “Mail” / “Other”.  
3. Copy the 16-character password into **`SMTP_PASS`** on Railway.  
4. **`SMTP_USER`** must be that **same** Gmail address.

## 3. Where merchant (shop) notifications go

| Variable | Purpose |
|----------|---------|
| `ORDER_NOTIFICATION_EMAIL` | Inbox that receives **“new order”** HTML alerts. |

- If **set**: that address receives merchant notifications.  
- If **empty**: merchant mail goes to **`SMTP_USER`** (same as the sending account).

Use **`ORDER_NOTIFICATION_EMAIL=youssefstat20@gmail.com`** if you want orders in that inbox while sending from another mailbox (only if your provider allows that “From” — Gmail usually wants `From` = authenticated user).

## 4. Optional: From header

| Variable | Purpose |
|----------|---------|
| `SMTP_FROM` | Full `From` header, e.g. `"Easy Handles" <yourstore@gmail.com>`. |

If unset, the API uses `"Easy Handles" <SMTP_USER>`. For Gmail, **`From` should match the authenticated account** unless you’ve set up “Send mail as” in Google.

## 5. Customer confirmation email

- Sent only if the customer **enters an email** on checkout.  
- No extra env key — uses the same SMTP as above.

## 6. After changing variables

Redeploy or restart the **API** on Railway so the new env is loaded.

## 7. How to verify

1. Place a test order **with** an email in the form.  
2. Check Railway **logs** for either:  
   - `Email sent: messageId=...` (success), or  
   - `Email sending failed` / `SMTP response` (misconfigured auth or network).  
3. If logs say `Email disabled`, one of **§1** is still missing.

## 8. Checkout “Validation…” stuck (fixed in code)

The API **must not wait** for SMTP before responding — otherwise a slow mail server blocks the browser. Emails are sent **after** the order is saved; success on the site means the order exists even if mail fails (check logs for mail errors).
