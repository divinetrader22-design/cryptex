import '../styles/globals.css';
import { useState, useEffect, useRef } from 'react';


// ─── SECURITY (maintenance page) ─────────────────────────────────────────────

function useSecurityLock() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const noContext = e => e.preventDefault();
    document.addEventListener('contextmenu', noContext);

    const noKeys = e => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I','i','J','j','C','c','K','k'].includes(e.key)) ||
        (e.ctrlKey && ['u','U','s','S'].includes(e.key)) ||
        (e.metaKey && e.altKey && ['i','I','j','J','c','C'].includes(e.key))
      ) { e.preventDefault(); e.stopPropagation(); return false; }
    };
    document.addEventListener('keydown', noKeys, true);

    const noSelect = e => e.preventDefault();
    document.addEventListener('selectstart', noSelect);
    document.addEventListener('dragstart', noSelect);

    const noCopy = e => { e.clipboardData && e.clipboardData.setData('text',''); e.preventDefault(); };
    document.addEventListener('copy', noCopy);
    document.addEventListener('cut', noCopy);

    let devtoolsOpen = false;
    const dtCheck = setInterval(() => {
      if (typeof window === 'undefined') return;
      const wDiff = window.outerWidth - window.innerWidth > 160;
      const hDiff = window.outerHeight - window.innerHeight > 160;
      if ((wDiff || hDiff) && !devtoolsOpen) {
        devtoolsOpen = true;
        document.body.innerHTML = '';
        document.body.style.background = '#03020e';
      }
    }, 1000);

    try {
      console.clear();
      console.log = console.warn = console.error = console.info = console.debug = () => {};
    } catch(_) {}

    return () => {
      document.removeEventListener('contextmenu', noContext);
      document.removeEventListener('keydown', noKeys, true);
      document.removeEventListener('selectstart', noSelect);
      document.removeEventListener('dragstart', noSelect);
      document.removeEventListener('copy', noCopy);
      document.removeEventListener('cut', noCopy);
      clearInterval(dtCheck);
    };
  }, []);
}

// ─── HEAVY USAGE SCREEN ──────────────────────────────────────────────────────

function HeavyUsageScreen() {
  useSecurityLock();
  const canvasRef = useRef(null);
  const [dots, setDots] = useState(1);
  const [percent, setPercent] = useState(0);
  const [phase, setPhase] = useState(0);

  // Animate loading dots
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d >= 3 ? 1 : d + 1), 500);
    return () => clearInterval(iv);
  }, []);

  // Animate progress bar — loops from 0→100 repeatedly
  useEffect(() => {
    const iv = setInterval(() => {
      setPercent(p => {
        if (p >= 100) { setPhase(ph => ph + 1); return 0; }
        return p + 0.6;
      });
    }, 30);
    return () => clearInterval(iv);
  }, []);

  // Particle / sphere canvas
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W = cv.width = window.innerWidth;
    let H = cv.height = window.innerHeight;
    let animId;
    let t = 0;

    window.addEventListener('resize', () => {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
    });

    // Particles
    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.4 + .3,
      ph: Math.random() * Math.PI * 2,
      hue: Math.random() < .5 ? 270 : 155,
    }));

    // Wireframe ring
    const R = Math.min(W, H) * 0.22;
    const cx = W / 2, cy = H / 2;

    function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(3,2,14,.95)';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(153,69,255,.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      t += 0.008;

      // Rotating wireframe sphere rings
      const rotY = t;
      for (let lat = -80; lat <= 80; lat += 20) {
        const latR = Math.cos(lat * Math.PI / 180) * R;
        const latY = Math.sin(lat * Math.PI / 180) * R;
        ctx.beginPath();
        for (let lng = 0; lng <= 360; lng += 4) {
          const lngR = lng * Math.PI / 180;
          const x = cx + latR * Math.cos(lngR + rotY);
          const z = latR * Math.sin(lngR + rotY);
          const scale = 900 / (900 + z);
          const sx = cx + (x - cx) * scale;
          const sy = cy + latY * scale;
          const alpha = (z / R + 1) / 2 * 0.3 + 0.05;
          if (lng === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = `rgba(153,69,255,${((Math.abs(lat) / 80) * 0.15 + 0.08).toFixed(3)})`;
        ctx.lineWidth = .7;
        ctx.stroke();
      }
      for (let lng = 0; lng < 360; lng += 30) {
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 3) {
          const lngR = (lng * Math.PI / 180) + rotY;
          const latRad = lat * Math.PI / 180;
          const x = cx + Math.cos(latRad) * R * Math.cos(lngR);
          const z = Math.cos(latRad) * R * Math.sin(lngR);
          const y = cy + Math.sin(latRad) * R;
          const scale = 900 / (900 + z);
          if (lat === -90) ctx.moveTo(cx + (x - cx) * scale, cy + (y - cy) * scale);
          else ctx.lineTo(cx + (x - cx) * scale, cy + (y - cy) * scale);
        }
        ctx.strokeStyle = 'rgba(20,241,149,0.07)';
        ctx.lineWidth = .5;
        ctx.stroke();
      }

      // Glowing equator
      ctx.beginPath();
      for (let lng = 0; lng <= 360; lng += 2) {
        const lngR = lng * Math.PI / 180 + rotY;
        const x = cx + R * Math.cos(lngR);
        const z = R * Math.sin(lngR);
        const scale = 900 / (900 + z);
        const sx = cx + (x - cx) * scale;
        const sy = cy;
        lng === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = 'rgba(153,69,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Core glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
      grd.addColorStop(0, 'rgba(153,69,255,0.15)');
      grd.addColorStop(.5, 'rgba(20,241,149,0.07)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();

      // Particles
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy; p.ph += .004;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const a = (Math.sin(p.ph) + 1) / 2 * .6 + .1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.hue === 270 ? `rgba(153,69,255,${a})` : `rgba(20,241,149,${a})`;
        ctx.fill();
      }

      // Connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 90) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(153,69,255,${(1 - d / 90) * .15})`;
            ctx.lineWidth = .4; ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(frame);
    }

    frame();
    return () => cancelAnimationFrame(animId);
  }, []);

  const loadingPhrases = [
    'SYNCHRONIZING NODES',
    'VALIDATING CHAIN',
    'LOADING PROTOCOL',
    'CONNECTING NETWORK',
    'CALIBRATING POOLS',
  ];
  const currentPhrase = loadingPhrases[phase % loadingPhrases.length];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#03020e', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, userSelect: 'none', WebkitUserSelect: 'none' }}>
      <style>{`* { -webkit-user-select:none!important; user-select:none!important; } img { pointer-events:none!important; }`}</style>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Corner decorations */}
      {[['top:20px;left:20px', 'borderTop:2px solid rgba(153,69,255,.4);borderLeft:2px solid rgba(153,69,255,.4)'],
        ['top:20px;right:20px', 'borderTop:2px solid rgba(153,69,255,.4);borderRight:2px solid rgba(153,69,255,.4)'],
        ['bottom:20px;left:20px', 'borderBottom:2px solid rgba(153,69,255,.4);borderLeft:2px solid rgba(153,69,255,.4)'],
        ['bottom:20px;right:20px', 'borderBottom:2px solid rgba(153,69,255,.4);borderRight:2px solid rgba(153,69,255,.4)'],
      ].map(([pos, border], i) => (
        <div key={i} style={{
          position: 'absolute', width: 40, height: 40, pointerEvents: 'none',
          ...Object.fromEntries(pos.split(';').map(s => { const [k, v] = s.split(':'); return [k, v]; })),
          ...Object.fromEntries(border.split(';').map(s => { const [k, v] = s.split(':'); return [k, v]; })),
        }} />
      ))}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 22, background: 'linear-gradient(90deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 48, letterSpacing: 2 }}>
          ⬡ CRYPTEX
        </div>

        {/* Main message */}
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 'clamp(22px,4vw,38px)', color: '#fff', marginBottom: 10, letterSpacing: 1, textShadow: '0 0 40px rgba(153,69,255,0.5)' }}>
          SITE UNDER
        </div>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,5vw,52px)', background: 'linear-gradient(135deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 20, letterSpacing: 2 }}>
          HEAVY USAGE
        </div>

        {/* Status message */}
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: 'rgba(224,224,255,.4)', letterSpacing: 3, marginBottom: 44 }}>
          WE ARE EXPERIENCING HIGH TRAFFIC · PLEASE WAIT
        </div>

        {/* Loading bar */}
        <div style={{ width: 320, maxWidth: '90vw', margin: '0 auto 16px' }}>
          <div style={{ height: 3, background: 'rgba(153,69,255,.15)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: `${percent}%`,
              background: 'linear-gradient(90deg,#9945ff,#14f195)',
              borderRadius: 99,
              transition: 'width .03s linear',
              boxShadow: '0 0 12px rgba(20,241,149,0.5)',
            }} />
          </div>
        </div>

        {/* Loading phrase */}
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: 'rgba(153,69,255,.7)', letterSpacing: 2, marginBottom: 8, height: 18 }}>
          {currentPhrase}{'.'.repeat(dots)}
        </div>

        {/* Percentage */}
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, color: 'rgba(20,241,149,.5)', letterSpacing: 2 }}>
          {Math.round(percent)}%
        </div>

        {/* Bottom note */}
        <div style={{ marginTop: 52, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: 'rgba(224,224,255,.18)', letterSpacing: 1.5, lineHeight: 1.9 }}>
          ◎ CRYPTEX PROTOCOL IS HANDLING INCREASED LOAD<br />
          THE PORTAL WILL BE AVAILABLE SHORTLY
        </div>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App({ Component, pageProps }) {
  const [underLoad, setUnderLoad] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/api/site-status')
      .then(r => r.json())
      .then(d => { setUnderLoad(d.underLoad); setChecked(true); })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) return null;
  if (underLoad) return <HeavyUsageScreen />;
  return <Component {...pageProps} />;
}
