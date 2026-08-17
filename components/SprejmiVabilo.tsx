'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

/* Accept stran za vabilo v ekipo (Faza 2).
   Bere ?token=… iz e-poštne povezave in ga unovči prek RPC
   accept_organization_invitation (security definer). Če povabljenec še ni
   prijavljen, ga pošljemo na prijavo z ?next= nazaj sem — po prijavi se vabilo
   samodejno sprejme. */
type Stanje = 'nalagam' | 'prijava' | 'sprejemam' | 'uspeh' | 'napaka';

export default function SprejmiVabilo({ base }: { base: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const token = (params.get('token') || '').trim();
  const [stanje, setStanje] = useState<Stanje>('nalagam');
  const [napaka, setNapaka] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setNapaka('Manjka žeton vabila.'); setStanje('napaka'); return; }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { setStanje('prijava'); return; }
      setStanje('sprejemam');
      const { data, error } = await supabase.rpc('accept_organization_invite', { invite_token: token });
      if (cancelled) return;
      if (error || !data) {
        /* Najpogostejši vzrok: prijava z DRUGIM e-naslovom, kot je bilo vabilo.
           Funkcija to zavrne ("belongs to another account"). Pokaži slovensko. */
        const sporocilo = /another account/i.test(error?.message || '')
          ? 'To vabilo je za drug e-naslov. Prijavi se z e-naslovom, na katerega si prejel/a vabilo.'
          : 'Vabilo ni veljavno ali je poteklo.';
        setNapaka(sporocilo);
        setStanje('napaka');
        return;
      }
      setStanje('uspeh');
      setTimeout(() => { router.push(`${base}/kalkulator/pregled`); }, 1800);
    })();
    return () => { cancelled = true; };
  }, [token, base, router]);

  function naPrijavo() {
    const cilj = `${base}/kalkulator/ekipa/sprejmi?token=${encodeURIComponent(token)}`;
    router.push(`${base}/kalkulator/prijava?next=${encodeURIComponent(cilj)}`);
  }

  return (
    <main className="sv-ovoj">
      <div className="sv-kartica">
        <span className="sv-znak" aria-hidden="true">Pinart Flow</span>

        {stanje === 'nalagam' && <p className="sv-tekst">Preverjam vabilo …</p>}
        {stanje === 'sprejemam' && <p className="sv-tekst">Te dodajam v ekipo …</p>}

        {stanje === 'prijava' && (
          <>
            <h1 className="sv-naslov">Povabljen/a si v ekipo</h1>
            <p className="sv-tekst">Za sprejem se prijavi z istim e-naslovom, na katerega si prejel/a vabilo — z Googlom ali z geslom. Vabilo se nato sprejme samo.</p>
            <button type="button" className="sv-gumb" onClick={naPrijavo}>Prijava in sprejem</button>
          </>
        )}

        {stanje === 'uspeh' && (
          <>
            <h1 className="sv-naslov">Dobrodošel/a v ekipi 🎉</h1>
            <p className="sv-tekst">Vabilo je sprejeto. Preusmerjam v Pinart Flow …</p>
          </>
        )}

        {stanje === 'napaka' && (
          <>
            <h1 className="sv-naslov">Vabila ni bilo mogoče sprejeti</h1>
            <p className="sv-tekst">{napaka}</p>
            <button type="button" className="sv-gumb sv-gumb-tih" onClick={() => router.push(`${base}/kalkulator/pregled`)}>Nazaj v Flow</button>
          </>
        )}
      </div>

      <style jsx>{`
        .sv-ovoj { min-height: 100dvh; display: grid; place-items: center; padding: 2rem 1.2rem; background: var(--paper, #f6f4f0); }
        .sv-kartica { width: min(28rem, 100%); background: var(--paper, #fff); border: 1px solid var(--line, rgba(20,16,30,.1)); border-radius: 20px; padding: 2.4rem 2rem; text-align: center; box-shadow: 0 24px 60px -30px rgba(20,16,30,.35); }
        .sv-znak { display: inline-block; font-weight: 700; letter-spacing: .01em; color: var(--accent, #2a2035); margin-bottom: 1.2rem; font-size: .95rem; }
        .sv-naslov { font-size: 1.5rem; line-height: 1.2; margin: 0 0 .7rem; color: var(--ink, #1a1420); }
        .sv-tekst { font-size: .98rem; line-height: 1.55; color: var(--ink, #1a1420); opacity: .82; margin: 0 0 1.4rem; }
        .sv-gumb { display: inline-block; border: none; cursor: pointer; background: var(--accent, #2a2035); color: #fff; font-weight: 600; font-size: .98rem; padding: .8rem 1.5rem; border-radius: 12px; transition: transform .15s ease, filter .15s ease; }
        .sv-gumb:hover { transform: translateY(-1px); filter: brightness(1.08); }
        .sv-gumb:active { transform: translateY(0); }
        .sv-gumb-tih { background: transparent; color: var(--accent, #2a2035); border: 1px solid var(--line, rgba(20,16,30,.15)); }
      `}</style>
    </main>
  );
}
