'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  jeKoncan, KORAKOV, lokalniOdgovori, potegniZOblaka, sinhronizirajZOblakom, stejOdgovore,
} from '@/lib/onboarding';
import { preberiPredogled } from '@/lib/predogled';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * "Dokoncaj nastavitev 3/4" na nadzorni plosci.
 *
 * Pelje v KALKULATOR, ker uvodni pogovor zivi tam — svojega zaslona za to ni
 * in ga namenoma ne bo.
 *
 * Tu se tudi sprozi zrcaljenje odgovorov v oblak: nadzorna plosca je edina
 * stran, ki jo uporabnik po pogovoru zanesljivo obisce.
 */
export default function OnboardingKartica({ base }: { base: string }) {
  const [narejenih, setNarejenih] = useState<number | null>(null);

  useEffect(() => {
    /* Predogled "Prazno" pomeni nov uporabnik — takrat je kartica na zacetku
       (0/4), ceprav ima naprava tvoje odgovore. Samo na razvoju in samo za
       prikaz: zapisa se ne dotaknemo, zato po vrnitvi na "Moji" vse velja. */
    if (process.env.NODE_ENV !== 'production' && preberiPredogled() === 'empty') {
      setNarejenih(0);
      return;
    }
    const l = lokalniOdgovori();
    void sinhronizirajZOblakom();
    if (jeKoncan(l)) return;
    setNarejenih(stejOdgovore(l));
    /* nova naprava nima lokalnega zapisa, odgovori pa obstajajo v oblaku */
    void potegniZOblaka().then(o => {
      if (!o) return;
      if (o.koncano) { setNarejenih(null); return; }
      setNarejenih(Math.max(stejOdgovore(l), stejOdgovore(o.odgovori)));
    });
  }, []);

  if (narejenih === null) return null;

  return (
    <Link className={styles.onboardKartica} href={`${base}/kalkulator/orodje?uvod=1`}>
      <span>
        <strong>Dokončaj nastavitev</strong>
        <small>{narejenih === 0
          ? 'Nekaj vprašanj v kalkulatorju, in cene bodo tvoje, ne privzete.'
          : 'Nadaljuješ tam, kjer si končala.'}</small>
      </span>
      <b>{narejenih}/{KORAKOV}</b>
    </Link>
  );
}
