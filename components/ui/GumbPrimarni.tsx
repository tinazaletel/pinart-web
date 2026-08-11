'use client';

/* UI-KIT — en primarni (CTA) gumb za VSE: temni pill + (opcijsko) brand puščica desno.
   Uporabi za »Zaključi«, »Pripravi račun«, »Ustvari …« ipd., da so povsod enaki.
   Podpira onClick/type ALI href (Link). Slog inline (deluje v vsakem workspacu). */

import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import type { ReactNode, MouseEventHandler, CSSProperties } from 'react';

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit';
  /** pokaži brand puščico (→) desno */
  puscica?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};

const slog: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '.55rem',
  padding: '.85rem 1.7rem',
  border: '1px solid var(--ink, #1c1815)',
  borderRadius: '999px',
  background: 'var(--ink, #1c1815)',
  color: 'var(--paper, #fff)',
  font: '700 .74rem var(--font-sans), system-ui, sans-serif',
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

export default function GumbPrimarni({ children, href, onClick, type = 'button', puscica, disabled, className, ...rest }: Props) {
  const vsebina = <>{children}{puscica && <ArrowRight size={15} weight="bold" />}</>;
  if (href) {
    return <Link href={href} className={className} style={slog} aria-label={rest['aria-label']}>{vsebina}</Link>;
  }
  return (
    <button type={type} className={className} style={disabled ? { ...slog, opacity: .5, cursor: 'default' } : slog} onClick={onClick} disabled={disabled} aria-label={rest['aria-label']}>
      {vsebina}
    </button>
  );
}
