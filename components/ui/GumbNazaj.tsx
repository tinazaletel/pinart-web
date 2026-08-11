'use client';

/* UI-KIT — en sam »Nazaj« gumb za VSE (Račun, Pogodba, Retainer, Stranke, Stroški …).
   Prej je vsak workspace imel svojega (rc-nazaj-vrh, pg-nazaj-vrh, rw-nazaj, clientBack …)
   → nedosledno. Zdaj vsi uporabljajo tega. Podpira onClick ALI href (Link).
   Slog = glass pill po CGP (prosojno + blur + mehek rob), enak povsod. */

import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react';
import type { ReactNode, MouseEventHandler } from 'react';

type Props = {
  /** Besedilo gumba (npr. »Nazaj«, »Imenik«, »Stroški«). */
  children?: ReactNode;
  /** Če je podan, gumb je <Link>. Sicer <button onClick>. */
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  'aria-label'?: string;
  className?: string;
};

/* Slog je inline (deluje v vsakem workspacu, ne glede na njegov CSS/scoping).
   Barve prek CGP tokenov z varnimi fallbacki. */
const slog: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.35rem',
  padding: '.5rem .95rem',
  border: '1px solid color-mix(in oklch, var(--ink, #1c1815) 12%, transparent)',
  borderRadius: '999px',
  background: 'rgba(255,255,255,.55)',
  WebkitBackdropFilter: 'blur(12px) saturate(1.3)',
  backdropFilter: 'blur(12px) saturate(1.3)',
  color: 'var(--ink, #1c1815)',
  font: '700 .82rem var(--font-sans), system-ui, sans-serif',
  letterSpacing: '.01em',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

export default function GumbNazaj({ children = 'Nazaj', href, onClick, className, ...rest }: Props) {
  const vsebina = <><CaretLeft size={15} weight="bold" /> {children}</>;
  if (href) {
    return <Link href={href} className={className} style={slog} aria-label={rest['aria-label']}>{vsebina}</Link>;
  }
  return <button type="button" className={className} style={slog} onClick={onClick} aria-label={rest['aria-label']}>{vsebina}</button>;
}
