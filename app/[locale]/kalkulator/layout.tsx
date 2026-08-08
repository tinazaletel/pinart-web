import type { ReactNode } from 'react';
import Pupa from '@/components/Pupa';
import AuroraBackground from '@/components/AuroraBackground';

/* Ovoj za vsa orodja (/kalkulator/*). Globalna Pupa je priklopljena tu, zato je
   vidna na VSEH orodjih. AuroraBackground = skupno živo ozadje za VSE strani
   (en kos). Kontekst ponudbe poda kalkulator prek lib/pupaBridge. */
export default function KalkulatorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuroraBackground />
      {children}
      <Pupa />
    </>
  );
}
