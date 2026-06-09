'use client';

import { useEffect, useRef } from 'react';

// ─── types ────────────────────────────────────────────────────────────────────
interface CharDatum {
  ch:     string;
  homeX:  number;
  homeY:  number;
  w:      number;   // body width
  h:      number;   // body height
  font:   string;
  color:  string;
  body:   any;      // Matter.Body
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PremiumInkHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = sectionRef.current as HTMLElement;
    const canvas  = canvasRef.current  as HTMLCanvasElement;
    if (!section || !canvas) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // ── mutable state ────────────────────────────────────────────────────────
    let W = 0, H = 0;
    let chars: CharDatum[] = [];
    let Engine: any, Bodies: any, Body: any, World: any;
    let engine: any;
    let raf = 0;
    let mouseX = -9999, mouseY = -9999;
    let phase: 'idle' | 'active' | 'returning' = 'idle';
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    // ── canvas resize + dpr scale ────────────────────────────────────────────
    function resize() {
      // offsetWidth/Height can be 0 before first layout — fall back to viewport
      W = section.offsetWidth  || window.innerWidth;
      H = section.offsetHeight || window.innerHeight;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ── build character layout ───────────────────────────────────────────────
    function buildChars() {
      const LINE1 = 'IDEJA';
      const LINE2 = 'USTVARJAMO IDEJE, KI OSTANEJO';

      const sz1 = Math.min(Math.floor(W * 0.175), 210);
      const sz2 = Math.min(Math.floor(W * 0.031), 40);

      const font1 = `700 ${sz1}px "Bodoni Moda", "Didot", Georgia, serif`;
      const font2 = `500 ${sz2}px "Manrope", system-ui, sans-serif`;

      const LETTER_SPACING_1 = sz1 * 0.02;
      const LETTER_SPACING_2 = sz2 * 0.18;   // wide tracking for subtitle

      chars = [];

      // helper: measure one char (returns advance width)
      function charW(font: string, ch: string) {
        ctx.font = font;
        return ch === ' '
          ? ctx.measureText('n').width * 0.55
          : ctx.measureText(ch).width;
      }

      // ── line 1 ──────────────────────────────────────────────────────────
      ctx.font = font1;
      const chs1  = [...LINE1];
      const ws1   = chs1.map(c => charW(font1, c));
      const total1 = ws1.reduce((s, w) => s + w, 0)
                   + LETTER_SPACING_1 * (chs1.length - 1);
      let cx = (W - total1) / 2;
      const y1 = H * 0.41;
      const h1 = sz1 * 0.82;

      chs1.forEach((ch, i) => {
        const cw = ws1[i];
        chars.push({
          ch, font: font1,
          color: 'rgba(248,245,238,0.97)',
          homeX: cx + cw / 2,
          homeY: y1,
          w: cw + sz1 * 0.04,
          h: h1,
          body: null,
        });
        cx += cw + LETTER_SPACING_1;
      });

      // ── line 2 ──────────────────────────────────────────────────────────
      ctx.font = font2;
      const chs2  = [...LINE2];
      const ws2   = chs2.map(c => charW(font2, c));
      const total2 = ws2.reduce((s, w) => s + w, 0)
                   + LETTER_SPACING_2 * (chs2.length - 1);
      cx = (W - total2) / 2;
      const y2 = H * 0.62;
      const h2 = sz2 * 0.82;

      chs2.forEach((ch, i) => {
        const cw = ws2[i];
        chars.push({
          ch, font: font2,
          color: ch === ' ' ? 'transparent' : 'rgba(248,245,238,0.44)',
          homeX: cx + cw / 2,
          homeY: y2,
          w: Math.max(cw + sz2 * 0.08, 4),
          h: h2,
          body: null,
        });
        cx += cw + LETTER_SPACING_2;
      });
    }

    // ── build matter.js world ────────────────────────────────────────────────
    function buildPhysics() {
      if (engine) {
        World.clear(engine.world, false);
        Engine.clear(engine);
      }

      engine = Engine.create();
      engine.gravity.x = 0;
      engine.gravity.y = 1.4;  // slightly stronger gravity for dramatic fall

      // boundaries (invisible) — floor inside section so letters stay visible
      const floor = Bodies.rectangle(W / 2, H * 0.89, W * 4, 80, {
        isStatic: true, restitution: 0.28, friction: 0.55, label: 'floor',
      });
      const wallL = Bodies.rectangle(-70, H / 2, 140, H * 3, {
        isStatic: true, label: 'wall',
      });
      const wallR = Bodies.rectangle(W + 70, H / 2, 140, H * 3, {
        isStatic: true, label: 'wall',
      });
      World.add(engine.world, [floor, wallL, wallR]);

      // per-character bodies — start static (frozen at home)
      chars.forEach(c => {
        c.body = Bodies.rectangle(c.homeX, c.homeY, c.w, c.h, {
          isStatic:    true,
          restitution: 0.38,
          friction:    0.22,
          frictionAir: 0.018,
          label:       'char',
          collisionFilter: { category: 0x0001, mask: 0x0001 },
        });
        World.add(engine.world, c.body);
      });
    }

    // ── phase transitions ────────────────────────────────────────────────────
    function activate() {
      if (phase === 'active') return;
      phase = 'active';
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      chars.forEach(c => Body.setStatic(c.body, false));
    }

    function startReturn() {
      if (phase === 'returning' || phase === 'idle') return;
      phase = 'returning';
      // kill velocities so the lerp starts from rest
      chars.forEach(c => {
        Body.setVelocity(c.body, { x: 0, y: 0 });
        Body.setAngularVelocity(c.body, 0);
      });
    }

    // ── render ───────────────────────────────────────────────────────────────
    function draw() {
      ctx.clearRect(0, 0, W, H);
      chars.forEach(c => {
        if (c.ch === ' ') return;
        const { x, y } = c.body.position;
        const angle    = c.body.angle;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font         = c.font;
        ctx.fillStyle    = c.color;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.ch, 0, 0);
        ctx.restore();
      });
    }

    // ── main loop ────────────────────────────────────────────────────────────
    function tick() {
      // ── physics step ──────────────────────────────────────────────────────
      if (phase === 'active') {
        Engine.update(engine, 1000 / 60);

        // repulsion force from cursor
        chars.forEach(c => {
          if (c.body.isStatic) return;
          const dx   = c.body.position.x - mouseX;
          const dy   = c.body.position.y - mouseY;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 0.5) {
            const t   = (120 - dist) / 120;
            const mag = t * t * 0.028 * c.body.mass;   // quadratic falloff
            Body.applyForce(c.body, c.body.position, {
              x: (dx / dist) * mag,
              y: (dy / dist) * mag,
            });
          }
        });
      }

      // ── return lerp ───────────────────────────────────────────────────────
      if (phase === 'returning') {
        const LERP = 0.08;
        let allHome = true;

        chars.forEach(c => {
          const dx   = c.homeX - c.body.position.x;
          const dy   = c.homeY - c.body.position.y;
          const dist = Math.hypot(dx, dy);

          // normalise angle to shortest path toward 0
          let a = c.body.angle % (2 * Math.PI);
          if (a >  Math.PI) a -= 2 * Math.PI;
          if (a < -Math.PI) a += 2 * Math.PI;

          if (dist > 0.6 || Math.abs(a) > 0.008) {
            allHome = false;
            Body.setPosition(c.body, {
              x: c.body.position.x + dx * LERP,
              y: c.body.position.y + dy * LERP,
            });
            Body.setAngle(c.body, a * (1 - LERP * 1.3));
            Body.setVelocity(c.body, { x: 0, y: 0 });
            Body.setAngularVelocity(c.body, 0);
          } else {
            Body.setPosition(c.body, { x: c.homeX, y: c.homeY });
            Body.setAngle(c.body, 0);
          }
        });

        if (allHome) {
          phase = 'idle';
          chars.forEach(c => Body.setStatic(c.body, true));
        }
      }

      draw();
      raf = requestAnimationFrame(tick);
    }

    // ── mouse events ─────────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;

      // activate when cursor enters 120px radius of any character
      if (phase === 'idle') {
        const near = chars.some(c => Math.hypot(c.homeX - mouseX, c.homeY - mouseY) < 120);
        if (near) activate();
      }

      // reset idle-return timer while active
      if (phase === 'active') {
        if (idleTimer) clearTimeout(idleTimer);
        const anyNear = chars.some(c =>
          Math.hypot(c.body.position.x - mouseX, c.body.position.y - mouseY) < 120
        );
        if (!anyNear) {
          idleTimer = setTimeout(startReturn, 1600);
        }
      }
    }

    function onMouseLeave() {
      mouseX = -9999; mouseY = -9999;
      if (phase === 'active') {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(startReturn, 500);
      }
    }

    // ── scroll-up → reassemble ────────────────────────────────────────────────
    let prevScrollY = window.scrollY;
    let wasVisible  = false;
    function onScroll() {
      const scrollingUp = window.scrollY < prevScrollY;
      prevScrollY = window.scrollY;
      const rect      = section.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      // trigger reassembly when section comes back into view while scrolling up
      if (scrollingUp && isVisible && !wasVisible) {
        if (phase !== 'idle') startReturn();
      }
      wasVisible = isVisible;
    }

    // ── resize ───────────────────────────────────────────────────────────────
    function onResize() {
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      cancelAnimationFrame(raf);
      phase = 'idle';
      document.fonts.ready.then(() => {
        resize();
        buildChars();
        buildPhysics();
        raf = requestAnimationFrame(tick);
      });
    }

    // ── boot ─────────────────────────────────────────────────────────────────
    import('matter-js').then(M => {
      Engine  = M.Engine;
      Bodies  = M.Bodies;
      Body    = M.Body;
      World   = M.World;

      // Explicitly load both fonts before measuring — more reliable than fonts.ready
      Promise.all([
        document.fonts.load(`700 100px "Bodoni Moda"`),
        document.fonts.load(`500 100px "Manrope"`),
      ]).then(() => {
        resize();
        buildChars();
        buildPhysics();
        raf = requestAnimationFrame(tick);
      });

      section.addEventListener('mousemove',  onMouseMove);
      section.addEventListener('mouseleave', onMouseLeave);
      window.addEventListener('resize',      onResize);
      window.addEventListener('scroll',      onScroll, { passive: true });
    }).catch(console.error);

    return () => {
      cancelAnimationFrame(raf);
      section.removeEventListener('mousemove',  onMouseMove);
      section.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize',      onResize);
      window.removeEventListener('scroll',      onScroll);
      if (idleTimer) clearTimeout(idleTimer);
      if (engine && World && Engine) {
        World.clear(engine.world, false);
        Engine.clear(engine);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="ideje"
      data-nav-dark
      style={{
        position: 'relative',
        width:    '100%',
        height:   '100svh',
        background: '#070707',
        overflow:   'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display:  'block',
          position: 'absolute',
          inset:    0,
          cursor:   'crosshair',
        }}
      />
    </section>
  );
}
