'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { gsap } from '@/lib/gsap';
import SplitText from '@/components/SplitText';
import Reveal from '@/components/Reveal';
import RotatingLaptop from '@/components/RotatingLaptop';

export default function About() {
  const t = useTranslations('about');
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const laptopRef   = useRef<HTMLDivElement>(null);
  // Separate ref for just the canvas/grid area so the marquee strip is excluded
  const contentRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });   // raw pointer (content-relative)
  const mouseRef   = useRef({ x: 0, y: 0 });   // spring-smoothed

  useEffect(() => {
    const canvas  = canvasRef.current;
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!canvas || !section || !content) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = section!.getBoundingClientRect();
      const w = Math.round(window.innerWidth),  h = Math.round(rect.height);
      canvas!.width  = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width  = w + 'px';
      canvas!.style.height = h + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // centre mouse when resizing
      pointerRef.current = mouseRef.current = { x: w * 0.5, y: h * 0.5 };
    }

    // ── draw terrain — VERTICAL wavy lines (ported directly from codex) ──────
    function draw(time = 0) {
      const w = canvas!.offsetWidth, h = canvas!.offsetHeight;
      const idle = time * 0.00014; // a touch faster so the lines always drift gently

      // spring-smooth toward pointer
      mouseRef.current.x += (pointerRef.current.x - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (pointerRef.current.y - mouseRef.current.y) * 0.08;
      const mx = mouseRef.current.x, my = mouseRef.current.y;

      ctx!.clearRect(0, 0, w, h);
      ctx!.lineWidth    = 0.56;
      ctx!.strokeStyle  = 'oklch(0.50 0.058 104 / 0.56)';

      for (let index = -10; index < Math.ceil(w / 15) + 12; index++) {
        const baseX = index * 15;
        const phase = index * 0.48;
        ctx!.beginPath();
        let prevX: number | null = null;
        let prevY: number | null = null;

        for (let y = -90; y <= h + 90; y += 12) {
          const packaBasin = Math.max(0, 1 - Math.hypot((baseX - w * 0.27) * 0.88, (y - h * 0.5) * 0.72) / 340);
          const rightBasin = Math.max(0, 1 - Math.hypot((baseX - w * 0.95) * 1.25, (y - h * 0.5) * 0.82) / 320);
          const distance   = Math.hypot((baseX - mx) * 1.05, (y - my) * 0.72);
          const pull       = Math.max(0, 1 - distance / 360); // wider mouse influence

          const wave =
            Math.sin(y * 0.006 + phase + idle) * 10 +              // bigger idle drift
            Math.sin(y * 0.017 + phase * 1.7 - idle * 1.4) * 5 +
            packaBasin * Math.sin((y - h * 0.5) * 0.018 + idle * 0.7) * 112 +
            packaBasin * (baseX < w * 0.27 ? -38 : 38) -
            rightBasin * Math.sin((y - h * 0.5) * 0.015 - idle * 0.8) * 34 +
            pull * Math.sin((y - my) * 0.028) * 74 +               // bend more near the mouse
            pull * (baseX < mx ? -36 : 36);                        // push further away from it

          const x = baseX + wave;

          if (prevX === null) {
            ctx!.moveTo(x, y);
          } else {
            ctx!.quadraticCurveTo(prevX, prevY!, (prevX + x) / 2, (prevY! + y) / 2);
          }
          prevX = x; prevY = y;
        }
        ctx!.stroke();
      }

      raf = requestAnimationFrame(draw);
    }

    const onMove = (e: PointerEvent) => {
      const rect = section!.getBoundingClientRect();
      pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  // Portrait "jumps out of the laptop" and bounces onto its spot when scrolled in.
  useEffect(() => {
    const portrait = portraitRef.current;
    const laptop   = laptopRef.current;
    if (!portrait || !laptop) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let done = false;
    const play = () => {
      if (done) return;
      done = true;
      const pr = portrait.getBoundingClientRect();
      const lr = laptop.getBoundingClientRect();
      // start at the laptop's SCREEN (upper area), tiny — as if popping out of it
      const dx = (lr.left + lr.width / 2) - (pr.left + pr.width / 2);
      const dy = (lr.top + lr.height * 0.32) - (pr.top + pr.height / 2);
      gsap.set(portrait, { x: dx, y: dy, scale: 0.06, autoAlpha: 0, transformOrigin: '50% 50%' });
      gsap.to(portrait, {
        x: 0, y: 0, scale: 1, autoAlpha: 1,
        duration: 1.1, ease: 'back.out(1.9)', // pop + bounce overshoot
      });
    };

    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); play(); } },
      { threshold: 0.35 },
    );
    io.observe(portrait);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="about-section"
      style={{
        position: 'relative',
        background: 'var(--paper)',
        minHeight: '100vh',
        clipPath: 'polygon(0 clamp(5rem,8vw,8rem), 100% 0, 100% 100%, 0 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100vw',
            height: '100%',
            zIndex: 0,
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
            opacity: 0.9,
          }}
        />
      </div>

      {/* ── grid area: canvas + portrait + text ───────────────────────────── */}
      <div
        ref={contentRef}
        className="about-layout"
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(17rem, 0.85fr) minmax(0, 1.15fr)',
          gap: 'clamp(2rem, 4.5vw, 5.5rem)',
          alignItems: 'center',
          minHeight: '100vh',
          padding: 'clamp(7rem, 10vw, 11rem) clamp(1.25rem, 4vw, 4.5rem) clamp(5rem, 8vw, 8rem)',
        }}
      >
        {/* ── left: portrait circle (jumps out of the laptop and bounces in) ─── */}
        <div
          className="about-portrait-wrap"
          style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'flex-end', gap: '2.5rem',
            minHeight: 'clamp(20rem, 42vw, 35rem)',
            justifyContent: 'center',
          }}
        >
          {/* portrait in circle */}
          <div
            ref={portraitRef}
            className="about-portrait"
            style={{
              width: 'clamp(155px, 22vw, 300px)',
              aspectRatio: '1',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0.8rem 2.4rem rgba(17,17,17,0.14)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tina-1.jpg"
              alt="Tina Zaletel"
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
            />
          </div>

          {/* rotating laptop (flipbook of the Laptop2.svg angle frames) */}
          <div
            ref={laptopRef}
            className="about-laptop"
            style={{
              alignSelf: 'flex-start',
              marginLeft: 'clamp(-1.5rem, -2.5vw, -3rem)',
              marginTop: 'clamp(-2.5rem, -4vw, -4rem)',
              transform: 'translate(140px, -120px)',
            }}
          >
            <RotatingLaptop
              style={{
                width: 'clamp(15rem, 25vw, 25rem)',
                height: 'clamp(9rem, 15vw, 15rem)',
              }}
            />
          </div>
        </div>

        {/* ── right: text ─────────────────────────────────────────────────── */}
        <div className="about-copy" style={{ position: 'relative', zIndex: 1 }}>
          <p className="kicker" style={{ paddingTop: '0.4em', marginBottom: 0 }}>
            {t('kicker')}
          </p>

          <SplitText
            text={t('headline')}
            tag="h2"
            textAlign="left"
            splitType="chars"
            from={{ opacity: 0, x: 130 }}
            to={{ opacity: 1, x: 0 }}
            delay={26}
            duration={0.85}
            ease="power3.out"
            rootMargin="-60px"
            style={{
              fontFamily:    'var(--font-serif)',
              fontSize:      'clamp(2.7rem,6vw,7.4rem)',
              fontWeight:    400,
              lineHeight:    1.05,
              letterSpacing: '-0.025em',
              marginBottom:  0,
              maxWidth:      '14ch',
              display:       'block',
            }}
          />

          <Reveal
            as="p"
            from="right"
            distance={180}
            delay={0.18}
            className="about-body copy-review"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(1.02rem,1.25vw,1.2rem)',
              fontWeight: 300,
              lineHeight: 1.42,
              color: 'rgba(17,17,17,0.72)',
              maxWidth: '48ch',
              marginTop: 'clamp(1.5rem,2.5vw,2.25rem)',
            }}
          >
            {t('body')}
          </Reveal>
        </div>
      </div>

      {/* ── packa — right edge of section, outside overflow:hidden contentRef ─ */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="about-packa"
        src="/packa.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        style={{
          position:      'absolute',
          right:         'clamp(2rem, 5vw, 6rem)',
          bottom:        'clamp(6rem, 10vw, 9rem)',
          width:         'clamp(8rem, 13vw, 17rem)',
          zIndex:        1,
          mixBlendMode:  'multiply',
          filter:        'contrast(1.08)',
          opacity:       0.82,
          pointerEvents: 'none',
        }}
      />
    </section>
  );
}
