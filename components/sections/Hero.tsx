'use client';

/**
 * Hero — animation sequence:
 *
 *  1. Eyes appear, look toward drop (above head)
 *  2. Drop falls in from above, pupils track it
 *  3. Hair draws path-by-path top→bottom, drop shrinks, body/face fade in
 *  4. Full pupa — eyes return, cursor tracking continues
 *  5. "IDEAS" blurs in
 *  6. Word pills stagger in, then fade out
 *  7. Pupa presses into screen (eyes forward), hand + outline shown
 *  8. packa_splat + blackout
 *  9. Final text rises in
 * 10. Replay appears
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);

const NS    = 'http://www.w3.org/2000/svg';
const CREAM = '#ECE6D5';

type EaseFn = (t: number) => number;
const E: Record<string, EaseFn> = {
  outQuart:  t => 1 - Math.pow(1 - t, 4),
  outExpo:   t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outBack:   t => { const c = 2.70158; return 1 + c * Math.pow(t - 1, 3) + (c - 1) * Math.pow(t - 1, 2); },
  inCubic:   t => t * t * t,
  inQuart:   t => t * t * t * t,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function tw(ms: number, ease: EaseFn, fn: (e: number) => void, sig?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (sig?.aborted) { resolve(); return; }
    const start = performance.now();
    const tick = (now: number) => {
      if (sig?.aborted) { resolve(); return; }
      const p = Math.min((now - start) / ms, 1);
      fn(ease(p));
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function wait(ms: number, sig?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (sig?.aborted) { resolve(); return; }
    const id = setTimeout(resolve, ms);
    sig?.addEventListener('abort', () => { clearTimeout(id); resolve(); }, { once: true });
  });
}

function raf2(): Promise<void> {
  return new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export default function Hero() {
  const t = useTranslations('hero');

  const sectionRef   = useRef<HTMLElement>(null);
  const svgWrapRef   = useRef<HTMLDivElement>(null);
  const dropRef      = useRef<HTMLDivElement>(null);
  const wordIdeaRef  = useRef<HTMLDivElement>(null);
  const wordRestRef  = useRef<HTMLDivElement>(null);
  const splatWrapRef = useRef<HTMLDivElement>(null);
  const blackoutRef  = useRef<HTMLDivElement>(null);
  const scrollArrowRef = useRef<HTMLDivElement>(null);
  const finalRef     = useRef<HTMLDivElement>(null);
  const replayRef    = useRef<HTMLButtonElement>(null);
  const cueRef       = useRef<HTMLDivElement>(null);

  const acRef = useRef<AbortController | null>(null);

  const startAnimation = useCallback(async () => {
    acRef.current?.abort();
    const ac  = new AbortController();
    acRef.current = ac;
    const sig = ac.signal;

    // On back navigation: skip animation, jump straight to final state
    if (sessionStorage.getItem('pinart-hero-played')) {
      const blackout = blackoutRef.current;
      const finalEl  = finalRef.current;
      const replay   = replayRef.current;
      if (blackout) { blackout.style.transition = 'none'; blackout.style.opacity = '1'; }
      if (finalEl) {
        finalEl.style.opacity = '1';
        finalEl.querySelectorAll<HTMLElement>('.ln').forEach(ln => {
          ln.style.opacity   = '1';
          ln.style.transform = 'translateY(0px) scale(1)';
        });
      }
      if (replay) { replay.style.opacity = '0.5'; replay.style.pointerEvents = 'auto'; }
      const scrollArrow = scrollArrowRef.current;
      if (scrollArrow) scrollArrow.style.opacity = '1';
      window.dispatchEvent(new CustomEvent('pinart-dark', { detail: { dark: true } }));
      window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
      window.dispatchEvent(new CustomEvent('pinart-hero-done'));
      document.body.style.overflow = '';
      return;
    }

    window.dispatchEvent(new CustomEvent('pinart-lenis-stop'));
    window.dispatchEvent(new CustomEvent('pinart-dark', { detail: { dark: false } }));
    document.body.style.overflow = 'hidden';

    const svgWrap   = svgWrapRef.current!;
    const drop      = dropRef.current!;
    const wordIdea  = wordIdeaRef.current!;
    const wordRest  = wordRestRef.current!;
    const splatWrap = splatWrapRef.current!;
    const blackout  = blackoutRef.current!;
    const finalEl   = finalRef.current!;
    const replay    = replayRef.current!;
    const cue       = cueRef.current!;

    /* ── reset ─────────────────────────────────────────────────────────── */
    svgWrap.style.transform  = '';
    svgWrap.style.filter     = '';
    svgWrap.style.opacity    = '';
    drop.style.opacity       = '0';
    drop.style.pointerEvents = 'none';
    drop.style.cursor        = '';
    wordIdea.style.opacity   = '0';
    wordIdea.style.filter    = 'blur(12px)';
    wordIdea.style.transform = 'translate(-50%,-50%) scale(0.9)';
    wordRest.style.opacity   = '0';
    wordRest.style.filter    = '';
    wordRest.style.transform = 'translate(-50%,-50%)';
    wordRest.innerHTML       = '';
    blackout.style.transition = 'none';
    blackout.style.opacity   = '0';
    splatWrap.style.opacity  = '0';
    splatWrap.style.transform = 'translate(-50%,-50%) scale(0.04)';
    finalEl.style.opacity    = '0';
    finalEl.querySelectorAll<HTMLElement>('.ln').forEach(ln => {
      ln.style.opacity   = '0';
      ln.style.transform = 'translateY(86px) scale(0.94)';
    });
    replay.style.opacity      = '0';
    replay.style.pointerEvents = 'none';
    cue.style.opacity = '0';

    /* ── wait for Bodoni Moda ───────────────────────────────────────────── */
    try {
      await Promise.race([document.fonts.load('500 1rem "Bodoni Moda"'), wait(2500, sig)]);
      await Promise.race([document.fonts.ready, wait(500, sig)]);
    } catch { /* cached */ }
    if (sig.aborted) return;

    /* ── fetch + inject SVG ────────────────────────────────────────────── */
    let raw: string;
    try { raw = await fetch('/pupa_pinart_6.svg').then(r => r.text()); }
    catch {
      wordIdea.style.opacity = '1'; wordIdea.style.filter = 'none';
      wordIdea.style.transform = 'translate(-50%,-50%) scale(1)';
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
      return;
    }
    if (sig.aborted) return;

    svgWrap.innerHTML = raw;
    const svg = svgWrap.querySelector('svg');
    if (!svg) {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
      return;
    }
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.cssText = 'width:100%;height:100%;display:block;';

    /* ── grab layer groups ─────────────────────────────────────────────── */
    const gEl = (id: string) => svg.getElementById(id) as SVGGElement | null;
    const eyes        = gEl('eys')            ?? gEl('eyes');
    const pupils      = gEl('zenice')         ?? gEl('eyeballs');
    const nose        = gEl('nose')           ?? gEl('nose1');
    const face        = gEl('face')           ?? gEl('face1');
    const hairG0      = gEl('Hair_x5F_0');   // main hair stroke — display:none in SVG
    const hairG1      = gEl('hair_x5F_1');   // hair base fill — hide initially, show after animation
    const hairG3      = gEl('hair_x5F_3');   // secondary hair stroke — display:none in SVG
    const dotG        = gEl('dot');           // position marker — must be hidden, packa covers it
    const body        = gEl('trup')           ?? gEl('body');
    const hand        = gEl('hand');
    const handFill    = gEl('hand1');
    const handOutline = gEl('hand_x5F_outline');

      /* Normalize all paper-coloured fills on the hand layers to the exact
         --paper background (#F5F2EA). Codex previously set them to "none",
         which exposed the body/trup outline through the hand. Now the hand
         reads as a solid paper-cream covering whatever sits behind it, while
         the black outline/detail paths (#202020) remain untouched. */
      const paperFillRe = /^(?:#f4(?:f1e9|eee4)|#f5f2ea|#fff(?:fff)?)$/i;
      const PAPER = '#F5F2EA';
      const normalizePaperFill = (el: SVGElement) => {
        const fill = el.getAttribute('fill')?.trim();
        if (fill && paperFillRe.test(fill)) el.setAttribute('fill', PAPER);

        const styleFill = el.style.fill?.trim();
        if (styleFill && paperFillRe.test(styleFill)) el.style.fill = PAPER;

        const styleAttr = el.getAttribute('style');
        if (styleAttr && /fill:\s*(?:#f4(?:f1e9|eee4)|#f5f2ea|#fff(?:fff)?)/i.test(styleAttr)) {
          el.setAttribute(
            'style',
            styleAttr.replace(/fill:\s*(?:#f4(?:f1e9|eee4)|#f5f2ea|#fff(?:fff)?)/gi, `fill:${PAPER}`)
          );
        }
      };

      [handFill, handOutline].forEach(group => {
        if (!group) return;
        normalizePaperFill(group);
        group.querySelectorAll<SVGElement>('*').forEach(normalizePaperFill);
      });
      if (handFill) {
        handFill.style.opacity = '0';
        handFill.style.pointerEvents = 'none';
      }

    /* fix z-order: face details render above hair_x5F_1 */
    if (face && hairG1) hairG1.insertAdjacentElement('afterend', face);

    /* hide ALL layers initially — oči se pokažejo same, ostalo pride med animacijo */
    [eyes, pupils, nose, face, hairG0, hairG1, hairG3, body, hand, handFill, handOutline, dotG]
      .forEach(el => { if (el) el.style.opacity = '0'; });

    /* two rAFs so getBBox / getScreenCTM see actual layout */
    await raf2();
    if (sig.aborted) return;

    /* ── hair: collect drawable paths (display:none ne preprečuje getTotalLength) ── */
    // remove display="none" from hairG3 only so we can measure it; hairG0 stays hidden until timeline
    if (hairG3) { hairG3.style.removeProperty('display'); hairG3.removeAttribute('display'); }

    const hairG0Paths = Array.from(hairG0?.querySelectorAll<SVGPathElement>('path') ?? [])
      .filter(p => {
        const stroke = p.getAttribute('stroke');
        let len = 0;
        try { len = p.getTotalLength(); } catch { /* noop */ }
        return stroke && stroke !== 'none' && len > 0;
      });
    const hairG3Paths = Array.from(hairG3?.querySelectorAll<SVGPathElement>('path') ?? [])
      .filter(p => {
        const stroke = p.getAttribute('stroke');
        let len = 0;
        try { len = p.getTotalLength(); } catch { /* noop */ }
        return stroke && stroke !== 'none' && len > 0;
      });

    // DOT SVG position — packa starts here, hair radiates from here
    const DOT_X = 415.71, DOT_Y = 288;

    // Find % on Hair_0 path closest to dot position
    let hairStartPct = 0;
    if (hairG0Paths.length > 0) {
      const p     = hairG0Paths[0];
      const total = p.getTotalLength();
      let minDist = Infinity;
      for (let i = 0; i <= 300; i++) {
        const pt2  = p.getPointAtLength((i / 300) * total);
        const dist = (pt2.x - DOT_X) ** 2 + (pt2.y - DOT_Y) ** 2;
        if (dist < minDist) { minDist = dist; hairStartPct = (i / 300) * 100; }
      }
    }

    // Find % on Hair_3 path closest to dot position
    let hairG3StartPct = 0;
    if (hairG3Paths.length > 0) {
      const p     = hairG3Paths[0];
      const total = p.getTotalLength();
      let minDist = Infinity;
      for (let i = 0; i <= 300; i++) {
        const pt2  = p.getPointAtLength((i / 300) * total);
        const dist = (pt2.x - DOT_X) ** 2 + (pt2.y - DOT_Y) ** 2;
        if (dist < minDist) { minDist = dist; hairG3StartPct = (i / 300) * 100; }
      }
    }

    // Pre-set stroke positions (hair groups still hidden via opacity/display)
    if (hairG0Paths.length) gsap.set(hairG0Paths, { drawSVG: `${hairStartPct.toFixed(1)}% ${hairStartPct.toFixed(1)}%` });
    if (hairG3Paths.length) gsap.set(hairG3Paths, { drawSVG: `${hairG3StartPct.toFixed(1)}% ${hairG3StartPct.toFixed(1)}%` });

    /* ── drop: pozicija = dot layer SVG koordinate (415.71, 288) ─────────── */
    {
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = DOT_X;
        pt.y = DOT_Y;
        const sp      = pt.matrixTransform(ctm);
        const secRect = (svgWrap.closest('section') ?? svgWrap).getBoundingClientRect();
        drop.style.left = `${sp.x - secRect.left}px`;
        drop.style.top  = `${sp.y - secRect.top}px`;
      }
      drop.style.opacity   = '0';
      drop.style.transform = 'translate(-50%,-50%) translateY(-72px)';
    }

    /* ── eye tracking — poglej proti dot poziciji ───────────────────────── */
    const dropAim = { x: clamp((DOT_X - 420) / 260, -1, 1), y: clamp((DOT_Y - 530) / 260, -1, 1) };
    let eyeMode: 'look' | 'cursor' | 'forward' = 'look';
    let cursorAim: { x: number; y: number } | null = null;
    const eyePos    = { x: 0, y: 0 };
    const eyeTarget = { x: dropAim.x, y: dropAim.y };

    let eyeRAF = 0;
    const onPointerMove = (e: PointerEvent) => {
      if (!pupils) return;
      const eb = pupils.getBoundingClientRect();
      if (!eb.width) return;
      const cx = eb.left + eb.width  / 2;
      const cy = eb.top  + eb.height / 2;
      cursorAim = { x: clamp((e.clientX - cx) / 240, -1, 1), y: clamp((e.clientY - cy) / 240, -1, 1) };
      eyeMode = 'cursor';
    };

    function eyeFrame() {
      if (sig.aborted) return;
      if      (eyeMode === 'cursor'  && cursorAim) { eyeTarget.x = cursorAim.x; eyeTarget.y = cursorAim.y; }
      else if (eyeMode === 'look')                 { eyeTarget.x = dropAim.x;   eyeTarget.y = dropAim.y;   }
      else                                         { eyeTarget.x = 0;            eyeTarget.y = 0;            }
      eyePos.x += (eyeTarget.x - eyePos.x) * 0.10;
      eyePos.y += (eyeTarget.y - eyePos.y) * 0.10;
      const tx = (eyePos.x * 10).toFixed(2);
      const ty = (eyePos.y *  5).toFixed(2);
      if (pupils) pupils.setAttribute('transform', `translate(${tx} ${ty})`);
      eyeRAF = requestAnimationFrame(eyeFrame);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    sig.addEventListener('abort', () => {
      cancelAnimationFrame(eyeRAF);
      window.removeEventListener('pointermove', onPointerMove);
    }, { once: true });
    eyeRAF = requestAnimationFrame(eyeFrame);

    if (sig.aborted) return;

    /* ── 1. OČI ПОЯВЯТСЯ ───────────────────────────────────────────────── */
    await tw(820, E.outQuart, e => {
      if (eyes)   eyes.style.opacity   = String(e);
      if (pupils) pupils.style.opacity = String(Math.max(0, (e - 0.25) / 0.75));
    }, sig);
    await wait(760, sig);
    if (sig.aborted) return;

    /* ── 2. PACKA PADE Z ZGORAJ ─────────────────────────────────────────── */
    await tw(720, E.outExpo, e => {
      drop.style.opacity   = String(Math.min(1, e * 2));
      drop.style.transform = `translate(-50%,-50%) translateY(${lerp(-72, 0, e).toFixed(1)}px)`;
    }, sig);
    await wait(280, sig);
    if (sig.aborted) return;

    /* ── 2b. PACKA LEBDI — ČAKAJ NA KLIK ─────────────────────────────── */
    drop.style.pointerEvents = 'auto';
    drop.style.cursor        = 'pointer';
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const moveCue = (event: PointerEvent) => {
      if (!finePointer) return;
      const rect = sectionRef.current?.getBoundingClientRect();
      if (!rect) return;
      cue.style.opacity = '1';
      cue.style.transform = `translate3d(${event.clientX - rect.left + 28}px,${event.clientY - rect.top - 44}px,0) rotate(-7deg)`;
    };
    window.addEventListener('pointermove', moveCue, { passive: true });

    {
      let floatRAF = 0;
      const floatOrigin = performance.now();
      let isPulsing   = false;
      let pulseOrigin = 0;

      const floatAnimate = (now: number) => {
        const floatY = Math.sin(((now - floatOrigin) / 1400) * Math.PI * 2) * 8;
        const s      = isPulsing
          ? 1 + 0.16 * Math.abs(Math.sin(((now - pulseOrigin) / 550) * Math.PI))
          : 1;
        drop.style.transform =
          `translate(-50%,-50%) translateY(${(-floatY).toFixed(2)}px) scale(${s.toFixed(3)})`;
        floatRAF = requestAnimationFrame(floatAnimate);
      };
      floatRAF = requestAnimationFrame(floatAnimate);

      const pulseTimer = setTimeout(() => {
        isPulsing   = true;
        pulseOrigin = performance.now();
      }, 3000);

      sig.addEventListener('abort', () => {
        cancelAnimationFrame(floatRAF);
        clearTimeout(pulseTimer);
      }, { once: true });

      await new Promise<void>(resolve => {
        if (sig.aborted) { resolve(); return; }
        const onClick = () => {
          cue.style.opacity = '0';
          resolve();
        };
        drop.addEventListener('click', onClick, { once: true });
        sig.addEventListener('abort', () => { drop.removeEventListener('click', onClick); resolve(); }, { once: true });
      });

      cancelAnimationFrame(floatRAF);
      clearTimeout(pulseTimer);
      window.removeEventListener('pointermove', moveCue);
    }
    if (sig.aborted) return;

    drop.style.pointerEvents = 'none';
    drop.style.cursor        = '';

    /* ── 3. LASE SE RIŠEJO (drawSVG) + TRUP POJAVI ─────────────────────── */
    // Groups start hidden (opacity:0 from init) — timeline shows them at the right moment

    await Promise.all([
      /* drop + eyes fade out */
      tw(760, E.outQuart, e => {
        drop.style.opacity             = String(1 - e);
        if (eyes)   eyes.style.opacity   = String(1 - e);
        if (pupils) pupils.style.opacity = String(1 - e);
      }, sig),

      /* drawSVG sekvenca — eksplicitne pozicije:
         t=0.0 : Hair_0 odklenemo + začne izris od dot navzven (2.0s)
         t=2.2 : hair_3 pokaži + izriši (1.5s)
         t=3.9 : hair_3 izgine (0.5s)
         t=4.4 : hair_1 fill zbledi noter (0.8s) */
      wait(100, sig).then(() => new Promise<void>(resolve => {
        if (sig.aborted) { resolve(); return; }
        const tl = gsap.timeline({ onComplete: resolve });

        // t=0 — Hair_0 odklenemo display:none + izriši od dot navzven
        tl.call(() => {
          if (hairG0) {
            hairG0.style.removeProperty('display');
            hairG0.removeAttribute('display');
            hairG0.style.opacity = '1';
          }
        }, [], 0);
        if (hairG0Paths.length) {
          tl.fromTo(hairG0Paths,
            { drawSVG: `${hairStartPct.toFixed(1)}% ${hairStartPct.toFixed(1)}%` },
            { drawSVG: '0% 100%', duration: 2.0, ease: 'power2.inOut' },
            0
          );
        }

        // t=1.3 — hair_3 pokaži + izriši (začne prej, med hair_0)
        tl.set(hairG3 ? [hairG3] : [], { opacity: 1 }, 1.3);
        if (hairG3Paths.length) {
          tl.fromTo(hairG3Paths,
            { drawSVG: `${hairG3StartPct.toFixed(1)}% ${hairG3StartPct.toFixed(1)}%` },
            { drawSVG: '0% 100%', duration: 1.5, ease: 'power2.inOut' },
            1.3
          );
        }

        // t=3.0 — hair_3 izgine (0.2s po koncu izrisa)
        if (hairG3) {
          tl.to(hairG3, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 3.0);
        }

        // hair_1 ostane trajno skrit — bi povzročil dvojne lase

        if (!hairG0Paths.length && !hairG3Paths.length) resolve();
        sig.addEventListener('abort', () => { tl.kill(); resolve(); }, { once: true });
      })),

      /* trup: pojavi se zgodaj med risanjem las */
      wait(420, sig).then(() =>
        tw(900, E.outQuart, e => {
          if (body) body.style.opacity = String(e);
        }, sig)
      ),

      /* obraz + nos: pojavi se ko hair_3 začne giniti (t=3.1s od začetka) */
      wait(3100, sig).then(() =>
        tw(700, E.outQuart, e => {
          if (face) face.style.opacity = String(e);
          if (nose) nose.style.opacity = String(Math.max(0, (e - 0.18) / 0.82));
        }, sig)
      ),
    ]);
    if (sig.aborted) return;

    /* ── 4. OČI SE VRNEJO ───────────────────────────────────────────────── */
    await tw(800, E.outQuart, e => {
      if (eyes)   eyes.style.opacity   = String(Math.max(0, (e - 0.24) / 0.76));
      if (pupils) pupils.style.opacity = String(Math.max(0, (e - 0.32) / 0.68));
    }, sig);
    await wait(400, sig);
    if (sig.aborted) return;

    /* ── 5. IDEAS ───────────────────────────────────────────────────────── */
    await tw(980, E.outBack, e => {
      wordIdea.style.opacity   = String(e);
      wordIdea.style.transform = `translate(-50%,-50%) scale(${lerp(0.9, 1, e).toFixed(3)})`;
      wordIdea.style.filter    = `blur(${lerp(12, 0, e).toFixed(2)}px)`;
    }, sig);
    await wait(840, sig);
    if (sig.aborted) return;

    /* ── 6. BESEDNE KARTICE ─────────────────────────────────────────────── */
    const words = t('wordRest').split(' ');
    // unikatna rotacija za vsako kartico
    const cardRots = [-8, 5, -4, 7, -6, 4, -5];
    wordRest.innerHTML = words.map((w, i) => {
      const rot = cardRots[i % cardRots.length];
      const entryRot = rot + (i % 2 ? -14 : 14);
      return (
        `<span data-rot="${rot}" style="display:inline-block;background:#ffffff;` +
        `border-radius:14px;padding:0.38em 1.15em;margin:0.3em;` +
        `font-style:italic;font-weight:500;letter-spacing:-0.01em;line-height:1.2;` +
        `color:var(--ink);opacity:0;` +
        `transform:translateY(${i % 2 ? -2.2 : -3}em) rotate(${entryRot}deg);` +
        `will-change:transform,opacity;">${w}</span>`
      );
    }).join('');
    wordRest.style.opacity = '1';

    // kartice se pojavijo ena za drugo
    const bits = Array.from(wordRest.querySelectorAll<HTMLElement>('span'));
    for (let i = 0; i < bits.length; i++) {
      if (sig.aborted) return;
      const bit  = bits[i];
      const rot  = parseFloat(bit.getAttribute('data-rot') ?? '0');
      const fromY = i % 2 ? -2.2 : -3;
      tw(680, E.outBack, e => {
        bit.style.opacity   = String(e);
        bit.style.transform = `translateY(${lerp(fromY, 0, e).toFixed(3)}em) rotate(${rot}deg)`;
      }, sig);
      await wait(200, sig);
    }
    if (sig.aborted) return;

    // subtilno lebdenje — vsaka kartica z lastno fazo
    let floatRaf = 0;
    const floatOrigin = performance.now();
    const floatBits = bits.map((el, i) => ({
      el,
      rot:   parseFloat(el.getAttribute('data-rot') ?? '0'),
      phase: i * 0.65,
      amp:   3.5 + i * 0.4,
      speed: 1.3 + i * 0.08,
    }));
    const doFloat = (now: number) => {
      if (sig.aborted) return;
      const t = (now - floatOrigin) / 1000;
      floatBits.forEach(({ el, rot, phase, amp, speed }) => {
        const y = Math.sin((t + phase) * speed) * amp;
        const r = rot + Math.sin((t + phase) * speed * 0.6) * 1.2;
        el.style.transform = `translateY(${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
      });
      floatRaf = requestAnimationFrame(doFloat);
    };
    floatRaf = requestAnimationFrame(doFloat);
    sig.addEventListener('abort', () => cancelAnimationFrame(floatRaf), { once: true });

    await wait(2400, sig);
    cancelAnimationFrame(floatRaf);
    if (sig.aborted) return;

    /* kartice in IDEAS zdrsijo navzdol iz ekrana */
    await tw(860, E.inCubic, e => {
      wordIdea.style.opacity   = String(1 - e);
      wordIdea.style.transform = `translate(-50%,-50%) scale(${lerp(1, 1.05, e).toFixed(3)})`;
      const dy = lerp(0, 72, e);
      wordRest.style.transform = `translate(-50%, calc(-50% + ${dy.toFixed(1)}vh))`;
      wordRest.style.opacity   = String(Math.max(0, 1 - e * 2));
    }, sig);
    if (sig.aborted) return;

    /* ── 7. PUPA PRITISNE V ZASLON ──────────────────────────────────────── */
    eyeMode = 'forward'; // oči naravnost — pritisk v zaslon
    if (hand)        hand.style.opacity        = '1';
    if (handFill)    handFill.style.opacity    = '1';
    if (handOutline) handOutline.style.opacity = '1';
    await tw(780, E.outExpo, e => {
      svgWrap.style.transform = `translate3d(0,${lerp(0, -22, e).toFixed(1)}px,0) scale(${lerp(1, 1.18, e).toFixed(3)})`;
      // contrast(1.12) removed: it brightened SVG fills but not the page bg,
      // which made the cream hand fill visibly lighter than var(--paper).
      // Press-in feel preserved via translate + scale.
    }, sig);
    if (sig.aborted) return;

    /* ── 8. PACKA SE RAZŠIRI + BLACKOUT ─────────────────────────────────── */
    svgWrap.style.opacity = '0'; // skrij SVG pred zatemnitvijo
    splatWrap.style.opacity = '1';
    await tw(330, E.outExpo, e => {
      splatWrap.style.transform = `translate(-50%,-50%) scale(${lerp(0.04, 1.25, e).toFixed(3)})`;
    }, sig);
    await wait(110, sig);
    if (sig.aborted) return;

    blackout.style.transition = 'opacity .42s ease';
    blackout.style.opacity    = '1';
    await tw(360, E.inQuart, e => {
      splatWrap.style.transform = `translate(-50%,-50%) scale(${lerp(1.25, 6.4, e).toFixed(3)})`;
    }, sig);
    splatWrap.style.opacity = '0';
    if (sig.aborted) return;

    window.dispatchEvent(new CustomEvent('pinart-dark', { detail: { dark: true } }));

    /* ── 9. FINALE TEKST ────────────────────────────────────────────────── */
    await wait(540, sig);
    if (sig.aborted) return;
    finalEl.style.opacity = '1';
    const lns = Array.from(finalEl.querySelectorAll<HTMLElement>('.ln'));
    for (let i = 0; i < lns.length; i++) {
      if (sig.aborted) return;
      tw(980, E.outBack, e => {
        lns[i].style.opacity   = String(e);
        lns[i].style.transform = `translateY(${lerp(86, 0, e).toFixed(1)}px) scale(${lerp(0.94, 1, e).toFixed(3)})`;
      }, sig);
      await wait(220, sig);
    }
    await wait(700, sig);
    if (sig.aborted) return;

    /* ── 10. REPLAY + SCROLL UNLOCK ─────────────────────────────────────── */
    replay.style.opacity       = '0.5';
    replay.style.pointerEvents = 'auto';
    const scrollArrow = scrollArrowRef.current;
    if (scrollArrow) scrollArrow.style.opacity = '1';
    document.body.style.overflow = '';
    sessionStorage.setItem('pinart-hero-played', '1');
    window.dispatchEvent(new CustomEvent('pinart-lenis-start'));
    // Hero is done — tell SmoothScroll to refresh ScrollTrigger so that
    // SplitText and other scroll-based animations get correct trigger positions.
    window.dispatchEvent(new CustomEvent('pinart-hero-done'));

  }, [t]);

  useEffect(() => {
    startAnimation();
    return () => {
      acRef.current?.abort();
      document.body.style.overflow = '';
    };
  }, [startAnimation]);

  /* ── JSX ──────────────────────────────────────────────────────────────── */
  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative h-screen overflow-hidden"
      style={{ background: 'var(--paper)' }}
    >
      {/* Pupa SVG — injected inline */}
      <div
        ref={svgWrapRef}
        aria-hidden
        style={{
          position:        'absolute',
          inset:           0,
          transformOrigin: '50% 52%',
          willChange:      'transform,filter',
        }}
      />

      {/* Drop (packa) — falls from above, then becomes clickable */}
      <div
        ref={dropRef}
        role="button"
        aria-label="Začni animacijo"
        style={{
          position:      'absolute',
          width:         'clamp(3.5rem, 6vw, 7rem)',
          aspectRatio:   '1',
          opacity:       0,
          pointerEvents: 'none',
          zIndex:        5,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/packa.svg" alt="" style={{ width: '100%' }} />
        {/* Mobile-only tap hint */}
        <span
          className="md:hidden"
          style={{
            position:      'absolute',
            top:           '110%',
            left:          '50%',
            transform:     'translateX(-50%)',
            whiteSpace:    'nowrap',
            fontFamily:    '"Bradley Hand ITC", "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive',
            fontSize:      '1rem',
            fontWeight:    500,
            letterSpacing: '-0.01em',
            color:         'rgba(17,17,17,0.55)',
          }}
        >
          Pritisni packo
        </span>
      </div>

      <div
        ref={cueRef}
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 7,
          pointerEvents: 'none',
          opacity: 0,
          color: 'rgba(17,17,17,0.82)',
          fontFamily: '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive',
          fontSize: 'clamp(1.05rem,1.5vw,1.4rem)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          transition: 'opacity 220ms ease',
          willChange: 'transform, opacity',
        }}
      >
        {t('cue')}
      </div>

      {/* Large "IDEAS" / "IDEJE" */}
      <div
        ref={wordIdeaRef}
        aria-hidden
        style={{
          position:             'absolute',
          top:                  '50%',
          left:                 '50%',
          transform:            'translate(-50%,-50%) scale(0.9)',
          whiteSpace:           'nowrap',
          fontFamily:           '"Bodoni Moda", var(--font-serif)',
          fontSize:             'clamp(7rem, 25vw, 520px)',
          fontWeight:           500,
          fontOpticalSizing:    'auto',
          fontVariationSettings: "'opsz' 144",
          lineHeight:           0.84,
          letterSpacing:        '0.14em',
          textTransform:        'uppercase',
          color:                'var(--ink)',
          opacity:              0,
          filter:               'blur(12px)',
          willChange:           'transform,opacity,filter',
          pointerEvents:        'none',
          zIndex:               8,
        }}
      >
        {t('headlinePrimary')}
      </div>

      {/* Word pills */}
      <div
        ref={wordRestRef}
        aria-hidden
        className="hero-word-pills"
        style={{
          position:      'absolute',
          top:           'clamp(60%, 72dvh, 79vh)',
          left:          '50%',
          transform:     'translate(-50%,-50%)',
          fontFamily:    '"Bodoni Moda", var(--font-serif)',
          fontSize:      'clamp(1.65rem, 3.2vw, 62px)',
          fontWeight:    500,
          fontStyle:     'italic',
          letterSpacing: '0.01em',
          color:         'var(--ink)',
          opacity:       0,
          willChange:    'transform,opacity,filter',
          pointerEvents: 'none',
          zIndex:        8,
          textAlign:     'center',
          width:         '80vw',
          maxWidth:      '900px',
        }}
      />

      {/* packa_splat */}
      <div
        ref={splatWrapRef}
        aria-hidden
        style={{
          position:        'absolute',
          top:             '50%',
          left:            '50%',
          width:           'max(100vw, 100vh)',
          aspectRatio:     '1',
          transform:       'translate(-50%,-50%) scale(0.04)',
          transformOrigin: '50% 50%',
          opacity:         0,
          pointerEvents:   'none',
          zIndex:          21,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/packa_splat.svg" alt="" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Blackout overlay */}
      <div
        ref={blackoutRef}
        style={{
          position:      'absolute',
          inset:         0,
          zIndex:        22,
          background:    'oklch(0.07 0.01 58)',
          opacity:       0,
          pointerEvents: 'none',
        }}
      />

      {/* Final text */}
      <div
        ref={finalRef}
        style={{
          position:       'absolute',
          inset:          0,
          zIndex:         23,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '0.12em',
          opacity:        0,
          pointerEvents:  'none',
          padding:        '6vw',
        }}
      >
        {([t('finalL1'), t('finalL2')] as string[]).map((line, i) => (
          <div
            key={i}
            className="ln"
            style={{
              fontFamily:            'var(--font-serif)',
              fontWeight:            400,
              fontOpticalSizing:     'auto',
              fontVariationSettings: "'opsz' 144",
              color:                 '#ffffff',
              letterSpacing:         i === 0 ? '0.05em' : '0.045em',
              lineHeight:            1.18,
              textAlign:             'center',
              fontSize:              'clamp(2.2rem, 7.4vw, 6.8rem)',
              opacity:               0,
              transform:             'translateY(86px) scale(0.94)',
            }}
          >
            {line}
          </div>
        ))}

        {/* Replay button — 100px below finale text, inside the finale container */}
        <button
          ref={replayRef}
          onClick={() => {
            sessionStorage.removeItem('pinart-hero-played');
            startAnimation();
          }}
          style={{
            marginTop:      '100px',
            zIndex:         30,
            opacity:        0,
            pointerEvents:  'auto',
            fontFamily:     'var(--font-sans)',
            fontSize:       '11px',
            fontWeight:     600,
            letterSpacing:  '0.19em',
            textTransform:  'uppercase',
            color:          CREAM,
            background:     'none',
            border:         'none',
            borderBottom:   '1px solid rgba(236,230,213,.35)',
            paddingBottom:  '2px',
            cursor:         'pointer',
            transition:     'opacity 0.3s ease',
            whiteSpace:     'nowrap',
            flexShrink:     0,
          }}
        >
          {t('restart')}
        </button>
      </div>

      {/* Scroll-down cue — animated line + dot */}
      <div
        ref={scrollArrowRef}
        style={{
          position:      'absolute',
          bottom:        'calc(env(safe-area-inset-bottom, 0px) + clamp(2.5rem, 5vw, 3.5rem))',
          left:          '50%',
          transform:     'translateX(-50%)',
          opacity:       0,
          zIndex:        30,
          transition:    'opacity 0.6s ease',
          pointerEvents: 'none',
        }}
      >
        <style>{`
          @keyframes scroll-dot {
            0%   { transform: translateY(0);    opacity: 1; }
            60%  { transform: translateY(22px); opacity: 0; }
            61%  { transform: translateY(0);    opacity: 0; }
            100% { transform: translateY(0);    opacity: 1; }
          }
        `}</style>
        <svg width="16" height="48" viewBox="0 0 16 48" fill="none">
          {/* vertical line */}
          <line x1="8" y1="0" x2="8" y2="48" stroke="#ECE6D5" strokeWidth="1" strokeOpacity="0.5"/>
          {/* bouncing dot */}
          <circle
            cx="8" cy="6" r="3" fill="#ECE6D5"
            style={{ animation: 'scroll-dot 1.8s ease-in-out infinite' }}
          />
        </svg>
      </div>

    </section>
  );
}
