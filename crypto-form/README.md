# Frugal Entity · Withdrawal Portal

A crypto-themed multi-step form portal built with Next.js, deployable on Vercel.

## Features
- 5-step gated form flow
- Access code protection (via environment variable)
- Email notification on every submission
- Solana-themed UI with animations
- All secrets stored server-side in env variables

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

---

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Click **Deploy** (Next.js is auto-detected)

### 3. Add Environment Variables
In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `ACCESS_CODE` | `frugalentity43985` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | Your Gmail App Password |
| `RECIPIENT_EMAIL` | `your-email@gmail.com` |

> **IMPORTANT**: Never put real values in `.env.example` or commit `.env.local` to git.

---

## Gmail App Password Setup
1. Enable 2FA on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create app password → use it as `SMTP_PASS`

---

## Form Steps
1. **Access Code** — password gated entry
2. **Name** — full name input
3. **Solana Wallet Address** — validated SOL address
4. **SVK** — free text, 256 char limit
5. **Foundry Link** — pre-filled Solscan URL, 256 char limit

---

## Tech Stack
- Next.js 14
- Tailwind CSS
- Nodemailer (email)
- Google Fonts (Orbitron, Share Tech Mono, Rajdhani)
