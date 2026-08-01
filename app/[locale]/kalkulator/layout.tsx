import type { ReactNode } from 'react';
import Pupa from '@/components/Pupa';

/* Ovoj za vsa orodja (/kalkulator/*). Globalna Pupa je priklopljena tu, zato je
   vidna na VSEH orodjih. Kontekst ponudbe ji poda kalkulator prek lib/pupaBridge. */
export default function KalkulatorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Pupa />
    </>
  );
}
