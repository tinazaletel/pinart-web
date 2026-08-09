'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';

/* Skupna paginacija: ‹ 1 2 3 … n › — uporabljena v seznamih (Stranke, Stroški, Cenik …).
   Samostojno stilizirana (inline), da deluje v vseh delovnih prostorih ne glede na CSS modul. */
export default function Paginacija({ stran, strani, naStran }: { stran: number; strani: number; naStran: (n: number) => void }) {
  if (strani <= 1) return null;

  const stevilke: (number | '…')[] = [];
  const dodaj = (n: number) => { if (!stevilke.includes(n) && n >= 1 && n <= strani) stevilke.push(n); };
  dodaj(1);
  if (stran - 1 > 2) stevilke.push('…');
  dodaj(stran - 1); dodaj(stran); dodaj(stran + 1);
  if (stran + 1 < strani - 1) stevilke.push('…');
  dodaj(strani);

  const krog: React.CSSProperties = {
    minWidth: '2.1rem', height: '2.1rem', padding: '0 .5rem', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', borderRadius: '999px', border: '1px solid var(--line, rgba(17,17,17,.12))',
    background: '#fff', color: 'var(--ink, #111)', font: '700 .72rem var(--font-sans), system-ui, sans-serif',
    cursor: 'pointer', lineHeight: 1,
  };
  const aktiven: React.CSSProperties = { ...krog, background: 'var(--ink, #111)', color: 'var(--paper, #fff)', borderColor: 'var(--ink, #111)' };
  const strela: React.CSSProperties = { ...krog, opacity: 1 };
  const onemogocen: React.CSSProperties = { ...krog, opacity: .4, cursor: 'default' };

  return (
    <nav aria-label="Strani" style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', justifyContent: 'center', margin: '1rem 0 .2rem' }}>
      <button type="button" style={stran <= 1 ? onemogocen : strela} onClick={() => stran > 1 && naStran(stran - 1)} disabled={stran <= 1} aria-label="Prejšnja stran"><CaretLeft size={14} weight="bold" /></button>
      {stevilke.map((n, i) => n === '…'
        ? <span key={`e${i}`} style={{ ...krog, border: 'none', background: 'transparent', cursor: 'default' }} aria-hidden>…</span>
        : <button key={n} type="button" style={n === stran ? aktiven : krog} onClick={() => naStran(n)} aria-current={n === stran ? 'page' : undefined} aria-label={`Stran ${n}`}>{n}</button>)}
      <button type="button" style={stran >= strani ? onemogocen : strela} onClick={() => stran < strani && naStran(stran + 1)} disabled={stran >= strani} aria-label="Naslednja stran"><CaretRight size={14} weight="bold" /></button>
    </nav>
  );
}
