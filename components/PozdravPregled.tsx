'use client';

/* Pozdrav na nadzorni plosci — prebere PRAVO ime prijavljenega uporabnika
   (isti vir kot stranska vrstica: auth user_metadata.full_name/name) in loci
   PRVI obisk od vrnitve:
     - prvi obisk  -> »Dobrodošla, Nuša.«       (brez »nazaj«)
     - vrnitev     -> »Dobrodošla nazaj, Nuša.«
   Prvi obisk zaznamo z lokalno zastavico (per brskalnik/naprava — dovolj za
   pozdrav). Dokler se ime ne nalozi, ne pokazemo napacnega imena. */

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

const KLJUC = 'pinart-pregled-viden';

export default function PozdravPregled({ jeEn }: { jeEn: boolean }) {
  const [ime, setIme] = useState('');
  const [prvi, setPrvi] = useState(false);

  useEffect(() => {
    let prekinjeno = false;
    void createClient().auth.getUser().then(({ data }) => {
      if (prekinjeno) return;
      const meta = data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      const polno = (meta?.full_name || meta?.name || '').trim();
      setIme(polno ? polno.split(/\s+/)[0] : '');
    });
    try {
      if (!localStorage.getItem(KLJUC)) { setPrvi(true); localStorage.setItem(KLJUC, new Date().toISOString()); }
    } catch { /* zaseben nacin brez localStorage */ }
    return () => { prekinjeno = true; };
  }, []);

  const pozdrav = prvi
    ? (jeEn ? 'Welcome' : 'Dobrodošla')
    : (jeEn ? 'Welcome back' : 'Dobrodošla nazaj');

  return <h1>{pozdrav}{ime ? `, ${ime}` : ''}. <span className={styles.wave} aria-hidden>👋</span></h1>;
}
