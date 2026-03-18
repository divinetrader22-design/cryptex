import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const recipientEmail = process.env.RECIPIENT_EMAIL;

  // Show what env vars are loaded (safe check)
  const envCheck = {
    SMTP_HOST: smtpHost || 'MISSING',
    SMTP_PORT: smtpPort,
    SMTP_USER: smtpUser ? smtpUser.substring(0, 4) + '****' : 'MISSING',
    SMTP_PASS: smtpPass ? `SET (${smtpPass.length} chars)` : 'MISSING',
    RECIPIENT_EMAIL: recipientEmail ? recipientEmail.substring(0, 4) + '****' : 'MISSING',
  };

  if (!smtpHost || !smtpUser || !smtpPass || !recipientEmail) {
    return res.status(500).json({ error: 'Missing env vars', envCheck });
  }

  const transporter = nodemailer.createTransporter({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: `"Cryptex Test" <${smtpUser}>`,
      to: recipientEmail,
      subject: '✅ Cryptex Portal — Email Test',
      text: 'If you received this, your email setup is working correctly!',
      html: '<h2 style="color:#9945ff">✅ Email is working!</h2><p>Your Cryptex Portal email setup is configured correctly.</p>',
    });
    return res.status(200).json({ success: true, message: 'Test email sent! Check your inbox.', envCheck });
  } catch (error) {
    return res.status(500).json({ error: error.message, envCheck });
  }
}
