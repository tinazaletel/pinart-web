'use client';

/* Pozdrav na nadzorni plosci — prebere PRAVO ime prijavljenega uporabnika
   (isti vir kot stranska vrstica: auth user_metadata.full_name/name) in ga
   pozdravi NEVTRALNO (»Živjo, Nuša.«) — brez spolno oznacene oblike, da velja
   za vsakega uporabnika. Dokler se ime ne nalozi, pokazemo samo pozdrav. */

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

export default function PozdravPregled({ jeEn }: { jeEn: boolean }) {
  const [ime, setIme] = useState('');

  useEffect(() => {
    let prekinjeno = false;
    void createClient().auth.getUser().then(({ data }) => {
      if (prekinjeno) return;
      const meta = data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      const polno = (meta?.full_name || meta?.name || '').trim();
      setIme(polno ? polno.split(/\s+/)[0] : '');
    });
    return () => { prekinjeno = true; };
  }, []);

  const pozdrav = jeEn ? 'Hi' : 'Živjo';

  return <h1>{pozdrav}{ime ? `, ${ime}` : ''}. <span className={styles.wave} aria-hidden>👋</span></h1>;
}
