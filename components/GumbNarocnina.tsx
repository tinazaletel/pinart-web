'use client';

/* GUMB ZA NAROČNINO — odpre Stripovo blagajno.
 *
 * Videza si ne izmišlja: razred dobi od kartice, na kateri stoji, da ostane
 * cenik natanko tak, kot je bil. Edino, kar doda, sta dve stanji, ki ju mora
 * gumb za plačilo imeti — »odpiram« in »ni šlo«. Brez prvega ljudje klikajo
 * dvakrat, brez drugega tiho obtičijo.
 */

import { useState } from 'react';

export default function GumbNarocnina({
  paket, obdobje = 'mesec', razred, napis, jeEn = false,
}: {
  paket: 'premium' | 'pro';
  obdobje?: 'mesec' | 'leto';
  razred?: string;
  napis: string;
  jeEn?: boolean;
}) {
  const [tece, setTece] = useState(false);
  const [napaka, setNapaka] = useState<string | null>(null);

  const odpri = async () => {
    setTece(true);
    setNapaka(null);
    try {
      const odgovor = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paket, obdobje }),
      });
      const j = await odgovor.json().catch(() => null);
      if (odgovor.ok && j?.url) { window.location.href = j.url; return; }
      setNapaka(j?.napaka || (jeEn ? 'Checkout could not be opened.' : 'Blagajne ni bilo mogoče odpreti.'));
    } catch {
      setNapaka(jeEn ? 'No connection.' : 'Ni povezave.');
    }
    /* Gumb sprostimo samo ob napaki — ob uspehu stran že odhaja na Stripe in
       bi ponovno omogočen gumb vabil k drugemu kliku. */
    setTece(false);
  };

  return (
    <>
      <button type="button" className={razred} onClick={odpri} disabled={tece}>
        {tece ? (jeEn ? 'Opening…' : 'Odpiram…') : napis}
      </button>
      {napaka && <span role="alert" style={{ display: 'block', marginTop: '.5rem', fontSize: '.82rem', color: '#b3261e' }}>{napaka}</span>}
    </>
  );
}
