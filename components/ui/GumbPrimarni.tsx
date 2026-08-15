'use client';

/* UI-KIT — en primarni (CTA) gumb za VSE: temni pill + (opcijsko) brand puščica desno.
   Slog + hover v uikit.module.css. Podpira onClick/type ALI href (Link). */

import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import type { ReactNode, MouseEventHandler } from 'react';
import styles from './uikit.module.css';

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

export default function GumbPrimarni({ children, href, onClick, type = 'button', puscica, disabled, className, ...rest }: Props) {
  const cls = `${styles.primarni}${className ? ' ' + className : ''}`;
  const vsebina = <>{children}{puscica && <ArrowRight size={15} weight="bold" />}</>;
  if (href) {
    return <Link href={href} className={cls} aria-label={rest['aria-label']}>{vsebina}</Link>;
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={rest['aria-label']}>
      {vsebina}
    </button>
  );
}
