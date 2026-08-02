'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';

if (typeof window !== 'undefined') gsap.registerPlugin(TextPlugin);

const imaPikice = (t: string) => /[.…]+\s*$/.test(t);
const brezPikic = (t: string) => t.replace(/[.…]+\s*$/, '');

/* Animiran zamik besedila (GSAP TextPlugin, type:'diff') — po vzoru
   demos.gsap.com/demo/animate-text-replacement: ob spremembi `text` se znaki
   morfajo eden za drugim; če se besedilo konča s pikicami (npr. "Pripravljam…"),
   te utripajo (yoyo), dokler je tak napis prikazan. Vsebino spana upravlja GSAP,
   zato span nima React-otrok (da se ne prepišeta). Dostopno prek aria-label. */
export default function SwapText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prej = useRef<string | null>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    tl.current?.kill();
    if (prej.current === null) { el.textContent = text; prej.current = text; return; }
    if (prej.current === text) return;
    prej.current = text;
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = text; return; }
    const t = gsap.timeline();
    t.to(el, { duration: 0.5, ease: 'sine.in', text: { value: text, type: 'diff' } });
    if (imaPikice(text)) {
      t.to(el, { duration: 0.55, ease: 'sine.inOut', repeat: -1, yoyo: true, text: { value: brezPikic(text), type: 'diff' } });
    }
    tl.current = t;
  }, [text]);

  useEffect(() => () => { tl.current?.kill(); }, []);

  return <span ref={ref} className={className} style={style} aria-label={text} />;
}
