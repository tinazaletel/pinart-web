import type { ReactNode } from 'react';
import Pupa from '@/components/Pupa';
import AuroraBackground from '@/components/AuroraBackground';
import OpomnikRazgibavanje from '@/components/OpomnikRazgibavanje';

/* Ovoj za vsa orodja (/kalkulator/*). Globalna Pupa je priklopljena tu, zato je
   vidna na VSEH orodjih. AuroraBackground = skupno živo ozadje za VSE strani
   (en kos). Kontekst ponudbe poda kalkulator prek lib/pupaBridge. */
export default function KalkulatorLayout(
  { children, params }: { children: ReactNode; params: { locale: string } },
) {
  return (
    <>
      <AuroraBackground />
      {children}
      <Pupa />
      {/* Opomnik za razgibavanje je TU in ne v stranski vrstici: vrstica se ob
          vsakem prehodu med stranmi postavi na novo in odprt opomnik je izginil
          (Tina, 30. 8. 2026). Ovoj preživi prehode, zato ura teče naprej. */}
      <OpomnikRazgibavanje jeEn={params.locale === 'en'} />
    </>
  );
}
