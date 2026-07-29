// lib/email.js — Email notifications via Resend
// Developer: Asad

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM || 'IntelliMart <noreply@intellimart.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    // Dev mode — log instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}`)
    }
    return { success: true, dev: true }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Email send failed')
  }
  return res.json()
}

// ── Templates ────────────────────────────────────────────────────────────────

function baseTemplate(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
        .card { background: white; border-radius: 16px; max-width: 560px; margin: 0 auto; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .logo { font-size: 28px; font-weight: 700; color: #1e293b; margin-bottom: 24px; }
        .logo span { color: #22c55e; }
        .btn { display: inline-block; background: #22c55e; color: white; text-decoration: none; padding: 12px 28px; border-radius: 50px; font-weight: 600; font-size: 14px; margin: 16px 0; }
        .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 32px; }
        h2 { color: #1e293b; font-size: 20px; margin-bottom: 12px; }
        p { color: #64748b; font-size: 14px; line-height: 1.6; margin: 8px 0; }
        .highlight { background: #f0fdf4; border-left: 3px solid #22c55e; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
        .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo"><span>intelli</span>mart.</div>
        ${content}
        <div class="footer">
          © 2025 IntelliMart by Asad. All rights reserved.<br/>
          <a href="${APP_URL}" style="color:#22c55e">Visit IntelliMart</a>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function sendWelcomeEmail({ to, name }) {
  return sendEmail({
    to,
    subject: 'Welcome to IntelliMart! 🎉',
    html: baseTemplate(`
      <h2>Welcome aboard, ${name}! 👋</h2>
      <p>Your IntelliMart account is ready. You can now browse thousands of products from verified vendors.</p>
      <div class="highlight">
        <p><strong>Use code NEW20</strong> for 20% off your first order!</p>
      </div>
      <a href="${APP_URL}/shop" class="btn">Start Shopping</a>
      <hr class="divider"/>
      <p>Need help? Reply to this email or visit our support centre.</p>
    `),
  })
}

export async function sendOrderConfirmationEmail({ to, name, orderId, total, items, estimatedDelivery }) {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const itemRows = items.map(item =>
    `<tr><td style="padding:8px 0;color:#1e293b">${item.name}</td><td style="padding:8px 0;text-align:right;color:#64748b">x${item.quantity}</td><td style="padding:8px 0;text-align:right;color:#22c55e;font-weight:600">${currency}${(item.price * item.quantity).toFixed(2)}</td></tr>`
  ).join('')

  return sendEmail({
    to,
    subject: `Order Confirmed — #${orderId.slice(-8).toUpperCase()} 📦`,
    html: baseTemplate(`
      <h2>Order Confirmed! 🎉</h2>
      <p>Hi ${name}, your order has been placed successfully.</p>
      <div class="highlight">
        <p><strong>Order ID:</strong> #${orderId.slice(-8).toUpperCase()}</p>
        ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(estimatedDelivery).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr style="border-bottom:1px solid #e2e8f0"><th style="text-align:left;padding:8px 0;color:#94a3b8;font-size:12px">Product</th><th style="text-align:right;color:#94a3b8;font-size:12px">Qty</th><th style="text-align:right;color:#94a3b8;font-size:12px">Price</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr style="border-top:1px solid #e2e8f0"><td colspan="2" style="padding:12px 0;font-weight:700;color:#1e293b">Total</td><td style="padding:12px 0;text-align:right;font-weight:700;color:#22c55e;font-size:16px">${currency}${total}</td></tr></tfoot>
      </table>
      <a href="${APP_URL}/orders" class="btn">Track Your Order</a>
    `),
  })
}

export async function sendShippingEmail({ to, name, orderId, trackingNumber, status }) {
  const statusLabel = status === 'SHIPPED' ? 'Your order has been shipped!' : 'Your order is out for delivery!'
  return sendEmail({
    to,
    subject: `${statusLabel} 🚚 — Order #${orderId.slice(-8).toUpperCase()}`,
    html: baseTemplate(`
      <h2>${statusLabel}</h2>
      <p>Hi ${name}, great news!</p>
      <div class="highlight">
        <p><strong>Order ID:</strong> #${orderId.slice(-8).toUpperCase()}</p>
        ${trackingNumber ? `<p><strong>Tracking Number:</strong> <span style="font-family:monospace;color:#6366f1">${trackingNumber}</span></p>` : ''}
      </div>
      <p>${status === 'OUT_FOR_DELIVERY' ? 'Your package will arrive today.' : 'Your package is on its way and will arrive within 2-3 business days.'}</p>
      <a href="${APP_URL}/orders" class="btn">Track Order</a>
    `),
  })
}

export async function sendPasswordResetEmail({ to, name, resetToken }) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`
  return sendEmail({
    to,
    subject: 'Reset your IntelliMart password',
    html: baseTemplate(`
      <h2>Password Reset Request</h2>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <hr class="divider"/>
      <p style="font-size:12px;color:#94a3b8">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    `),
  })
}

export async function sendStoreApprovedEmail({ to, name, storeName }) {
  return sendEmail({
    to,
    subject: `Your store "${storeName}" has been approved! 🎉`,
    html: baseTemplate(`
      <h2>Congratulations, ${name}! 🎉</h2>
      <p>Your store <strong>${storeName}</strong> has been approved and is now live on IntelliMart!</p>
      <div class="highlight">
        <p>You can now start adding products and receiving orders through your seller dashboard.</p>
      </div>
      <a href="${APP_URL}/store" class="btn">Go to Dashboard</a>
    `),
  })
}
