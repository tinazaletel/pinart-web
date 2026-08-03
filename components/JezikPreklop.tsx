'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';

/**
 * Jezikovni preklopnik za profilni meni. Preklopi trenutno pot med SL (brez
 * predpone) in EN (/en). Zapiše piškotek NEXT_LOCALE, da si izbiro zapomni ob
 * naslednjem obisku. Prikaže jezik, V KATEREGA boš preklopil (toggle).
 */
export default function JezikPreklop({
  base,
  className,
  napisClassName,
  style,
  role,
}: {
  base: string;
  className?: string;
  napisClassName?: string;
  style?: CSSProperties;
  role?: string;
}) {
  const jeEn = base === '/en';
  const pathname = usePathname() || '/';
  const brezPredpone = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const cilj = jeEn ? brezPredpone : `/en${brezPredpone}`;
  const napis = jeEn ? '🇸🇮 Slovenščina' : '🇬🇧 English';

  const klik = () => {
    try {
      document.cookie = `NEXT_LOCALE=${jeEn ? 'sl' : 'en'}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* piškotki onemogočeni — preklop prek poti še vedno deluje */
    }
  };

  return (
    <Link
      href={cilj}
      onClick={klik}
      className={className}
      style={style}
      role={role}
      aria-label={jeEn ? 'Preklopi v slovenščino' : 'Switch to English'}
    >
      {napisClassName ? <span className={napisClassName}>{napis}</span> : napis}
    </Link>
  );
}
