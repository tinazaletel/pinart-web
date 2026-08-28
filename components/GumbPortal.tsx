'use client';

/* ODPOVED IN RAČUNI — odpre Stripov portal za stranke.
 *
 * Odpoved mora biti vsaj tako preprosta kot naročilo; prej je ta gumb odprl
 * poštni odjemalec, kar je za nekoga, ki je pravkar plačal v treh klikih,
 * razmerje, v katerem je jemanje lahko in vračanje težko (Tina, 28. 8. 2026).
 */

import { useState } from 'react';

export default function GumbPortal({ razred, napis, jeEn = false }: { razred?: string; napis: string; jeEn?: boolean }) {
  const [tece, setTece] = useState(false);
  const [napaka, setNapaka] = useState<string | null>(null);

  const odpri = async () => {
    setTece(true); setNapaka(null);
    try {
      const odgovor = await fetch('/api/stripe/portal', { method: 'POST' });
      const j = await odgovor.json().catch(() => null);
      if (odgovor.ok && j?.url) { window.location.href = j.url; return; }
      setNapaka(j?.napaka || (jeEn ? 'The portal could not be opened.' : 'Portala ni bilo mogoče odpreti.'));
    } catch {
      setNapaka(jeEn ? 'No connection.' : 'Ni povezave.');
    }
    setTece(false);
  };

  return (
    <>
      <button type="button" className={razred} onClick={odpri} disabled={tece}>
        {tece ? (jeEn ? 'Opening…' : 'Odpiram…') : napis}
      </button>
      {napaka && <span role="alert" style={{ display: 'block', marginTop: '.5rem', fontSize: '.82rem', lineHeight: 1.45 }}>{napaka}</span>}
    </>
  );
}
