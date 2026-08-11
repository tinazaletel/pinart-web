'use client';

/* UI-KIT — en sam »Nazaj« gumb za VSE (Račun, Pogodba, Retainer, Stranke, Stroški …).
   Slog + hover v uikit.module.css (en CSS vir). Podpira onClick ALI href (Link). */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import type { ReactNode, MouseEventHandler } from 'react';
import styles from './uikit.module.css';

type Props = {
  children?: ReactNode;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  'aria-label'?: string;
  className?: string;
};

export default function GumbNazaj({ children = 'Nazaj', href, onClick, className, ...rest }: Props) {
  const cls = `${styles.nazaj}${className ? ' ' + className : ''}`;
  const vsebina = <><ArrowLeft size={15} weight="bold" /> {children}</>;
  if (href) {
    return <Link href={href} className={cls} aria-label={rest['aria-label']}>{vsebina}</Link>;
  }
  return <button type="button" className={cls} onClick={onClick} aria-label={rest['aria-label']}>{vsebina}</button>;
}
