'use client';

/* DOSTOP DO PROJEKTA — logika, ločena od videza.
 *
 * Prej je živela v components/DeliProjekt, ki je risal SVOJO vrstico pod
 * »Na projektu«. Dve vrstici sta govorili o istem — kdo je na projektu — a
 * vsaka o svojem: zgornja o imenih za dodeljevanje nalog, spodnja o pravem
 * dostopu. Uporabnica je morala vedeti razliko in isto osebo po potrebi dodati
 * dvakrat. Zato je logika zdaj tu, vmesnik pa je ena sama vrstica.
 *
 * Ravni (dogovor 19. 8. 2026):
 *   sodelavec — vidi projekt: brief, cilje, naloge, datoteke, komunikacijo
 *   polni     — vidi tudi ponudbe, pogodbe, račune in stroške
 *
 * Oboje stoji na obstoječem sistemu iz Faze 4 (record_shares + sme_videti_zapis):
 *   sodelavec = deljen zapis 'projects'
 *   polni     = deljen 'projects' IN 'clients' — deljena stranka po
 *               sme_videti_zapis odpre svoje ponudbe, račune in pogodbe.
 *               Posledica: polni dostop jih odpre pri VSEH projektih te stranke.
 */

import { useCallback, useEffect, useState } from 'react';
import { preberiEkipo, preberiDeljenja, deliZapis, prekliciDeljenje, type EkipaOblak } from '@/lib/ekipa';
import { dbIdZaZapis } from '@/lib/pinartFlowCloud';

export type Raven = 'brez' | 'sodelavec' | 'polni';

export type ClanDostopa = {
  userId: string;
  ime: string;
  raven: Raven;
};

export function useDostopProjekta(projektId?: string, strankaId?: string) {
  const [ekipa, setEkipa] = useState<EkipaOblak | null>(null);
  const [projektDbId, setProjektDbId] = useState<string | null>(null);
  const [strankaDbId, setStrankaDbId] = useState<string | null>(null);
  const [deljenProjekt, setDeljenProjekt] = useState<string[]>([]);
  const [deljenaStranka, setDeljenaStranka] = useState<string[]>([]);
  const [nalagam, setNalagam] = useState(true);
  const [delam, setDelam] = useState<string | null>(null);
  const [napaka, setNapaka] = useState('');

  const naloziDeljenja = useCallback(async (pid: string | null, sid: string | null) => {
    const [p, s] = await Promise.all([
      pid ? preberiDeljenja('projects', pid) : Promise.resolve([]),
      sid ? preberiDeljenja('clients', sid) : Promise.resolve([]),
    ]);
    setDeljenProjekt(p);
    setDeljenaStranka(s);
  }, []);

  useEffect(() => {
    if (!projektId) { setNalagam(false); return; }
    let ziv = true;
    (async () => {
      setNalagam(true);
      const [e, pid, sid] = await Promise.all([
        preberiEkipo(),
        dbIdZaZapis('projects', projektId),
        strankaId ? dbIdZaZapis('clients', strankaId) : Promise.resolve(null),
      ]);
      if (!ziv) return;
      setEkipa(e); setProjektDbId(pid); setStrankaDbId(sid);
      await naloziDeljenja(pid, sid);
      if (ziv) setNalagam(false);
    })();
    return () => { ziv = false; };
  }, [projektId, strankaId, naloziDeljenja]);

  const ravenZa = useCallback((userId: string): Raven => {
    if (deljenaStranka.includes(userId) && deljenProjekt.includes(userId)) return 'polni';
    if (deljenProjekt.includes(userId)) return 'sodelavec';
    return 'brez';
  }, [deljenProjekt, deljenaStranka]);

  /* Deliti je smiselno le s ČLANI — lastnik in admin vidita vse tako ali tako. */
  const vsiClani = (ekipa?.clani || []).filter(c => c.role === 'member' && !c.isSelf);
  const clani: ClanDostopa[] = vsiClani.map(c => ({
    userId: c.userId,
    ime: c.fullName || c.email,
    raven: ravenZa(c.userId),
  }));

  const nastavi = async (userId: string, ciljna: Raven) => {
    if (!projektDbId) return;
    setDelam(userId); setNapaka('');
    const trenutna = ravenZa(userId);
    try {
      if (ciljna === 'brez' && trenutna !== 'brez') await prekliciDeljenje('projects', projektDbId, userId);
      if (ciljna !== 'brez' && trenutna === 'brez') await deliZapis('projects', projektDbId, userId);

      if (strankaDbId) {
        const imaStranko = deljenaStranka.includes(userId);
        if (ciljna === 'polni' && !imaStranko) await deliZapis('clients', strankaDbId, userId);
        if (ciljna !== 'polni' && imaStranko) await prekliciDeljenje('clients', strankaDbId, userId);
      }
      await naloziDeljenja(projektDbId, strankaDbId);
    } catch {
      setNapaka('napaka');
    } finally {
      setDelam(null);
    }
  };

  return {
    /* člani ekipe s pravim računom (brez tebe) */
    clani,
    /* tisti, ki so na projektu (imajo dostop) */
    naProjektu: clani.filter(c => c.raven !== 'brez'),
    /* tisti, ki jih je mogoče dodati */
    naVoljo: clani.filter(c => c.raven === 'brez'),
    nastavi,
    nalagam,
    delam,
    napaka,
    /* brez pripete stranke polni dostop nima na kaj prijeti */
    polniMozen: Boolean(strankaDbId),
    /* projekt še ni v oblaku -> deliti se ga (še) ne da */
    pripravljen: Boolean(projektDbId),
  };
}
