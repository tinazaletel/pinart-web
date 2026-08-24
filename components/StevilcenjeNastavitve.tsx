'use client';

import { useEffect, useMemo, useState } from 'react';
import { HashStraight } from '@phosphor-icons/react';
import Toast from '@/components/Toast';
import { getMembershipRole } from '@/lib/pinartFlowEntitlements';
import { PRIVZETI_VZORCI, napakaVzorca, nastaviStevilcenje, preberiStevilcenje, sestaviStevilko } from '@/lib/stevilcenje';
import styles from './SettingsWorkspace.module.css';

export default function StevilcenjeNastavitve({ jeEn = false }: { jeEn?: boolean }) {
  const L = (sl: string, en: string) => jeEn ? en : sl;
  /* Leto se izracuna sele PO montazi: new Date() med renderjem da na
     strezniku in v brskalniku lahko razlicen izid (DESIGN.md, tocka 10). */
  const [leto, setLeto] = useState(0);
  useEffect(() => setLeto(new Date().getFullYear()), []);
  const [vloga, setVloga] = useState<string | null | undefined>(undefined);
  const [zadnja, setZadnja] = useState(0);
  const [najmanjsa, setNajmanjsa] = useState(0);
  const [vzorec, setVzorec] = useState(PRIVZETI_VZORCI.racun);
  const [nalaganje, setNalaganje] = useState(true);
  const [shranjevanje, setShranjevanje] = useState(false);
  const [toast, setToast] = useState<{ sporocilo: string; napaka?: boolean }>({ sporocilo: '' });

  useEffect(() => {
    let ziv = true;
    void Promise.all([getMembershipRole(), preberiStevilcenje(leto)]).then(([role, vrstice]) => {
      if (!ziv) return;
      setVloga(role);
      const racun = vrstice.find(v => v.vrsta === 'racun');
      if (racun) { setZadnja(racun.zadnja); setNajmanjsa(racun.zadnja); setVzorec(racun.vzorec); }
      setNalaganje(false);
    }).catch(() => { if (ziv) { setVloga(null); setNalaganje(false); } });
    return () => { ziv = false; };
  }, [leto]);

  const vzorecNapaka = napakaVzorca(vzorec);
  const stevilkaNapaka = !Number.isInteger(zadnja) || zadnja < najmanjsa;
  const predogled = useMemo(() => {
    if (vzorecNapaka || stevilkaNapaka) return '—';
    try { return sestaviStevilko(vzorec, leto, zadnja + 1); } catch { return '—'; }
  }, [vzorec, leto, zadnja, vzorecNapaka, stevilkaNapaka]);
  const trenutna = useMemo(() => {
    if (!najmanjsa || vzorecNapaka) return L('še ni izdane številke', 'no number has been issued yet');
    try { return sestaviStevilko(vzorec, leto, najmanjsa); } catch { return '—'; }
  }, [vzorec, leto, najmanjsa, vzorecNapaka]);

  const shrani = async () => {
    if (vzorecNapaka || stevilkaNapaka) return;
    setShranjevanje(true);
    try {
      await nastaviStevilcenje('racun', leto, zadnja, vzorec);
      setNajmanjsa(zadnja);
      setToast({ sporocilo: L('Številčenje računov je shranjeno.', 'Invoice numbering has been saved.') });
    } catch (e) {
      setToast({ sporocilo: e instanceof Error ? e.message : L('Številčenja ni bilo mogoče shraniti.', 'Could not save invoice numbering.'), napaka: true });
    } finally { setShranjevanje(false); }
  };

  if (nalaganje) return <section className={styles.card} aria-hidden><div className={styles.nastavitevSkelet} /></section>;
  const lahkoUreja = vloga === 'owner' || vloga === 'admin';
  return <section className={styles.card}>
    <h2 className={styles.naslovZIkono}><HashStraight size={20} /> {L('Številčenje računov', 'Invoice numbering')}</h2>
    <p>{L('Nadaljuj obstoječo serijo računov. Številke se ne smejo ponoviti, zato shranjene vrednosti ni mogoče znižati.', 'Continue your existing invoice series. Numbers must not repeat, so a saved value cannot be lowered.')}</p>
    {!lahkoUreja ? <p className={styles.mirnaRazlaga}>{L('Številčenje lahko spremeni samo skrbnik ali lastnik organizacije.', 'Only an organisation admin or owner can change numbering.')}</p> : <>
      <div className={styles.stevilcenjePolja}>
        <label>{L('Zadnja izdana številka', 'Last issued number')}
          <input type="number" min={najmanjsa} step="1" value={zadnja} onChange={e => setZadnja(Number(e.target.value))} aria-invalid={stevilkaNapaka} />
          <small>{stevilkaNapaka
            ? L(`Trenutna zadnja številka je ${trenutna}. Nižje ni mogoče nastaviti, ker bi se številka ponovila. Ponovljena številka je hujša od preskočene.`, `The current last number is ${trenutna}. It cannot be lowered because a number could repeat. A repeated number is worse than a skipped one.`)
            : L(`Trenutna zadnja: ${trenutna}. Številke ni mogoče nastaviti nazaj.`, `Current last number: ${trenutna}. Numbering cannot be moved backwards.`)}</small>
        </label>
        <label>{L('Oblika številke', 'Number format')}
          <input value={vzorec} onChange={e => setVzorec(e.target.value)} aria-invalid={Boolean(vzorecNapaka)} />
          <small>{vzorecNapaka || L('Uporabi {leto} in obvezno {zaporedna}.', 'Use {leto} and the required {zaporedna}.')}</small>
        </label>
      </div>
      <p className={styles.stevilcenjePredogled}>{L('Naslednji račun bo', 'The next invoice will be')} <strong>{predogled}</strong></p>
      <button type="button" className={styles.gumb} disabled={shranjevanje || Boolean(vzorecNapaka) || stevilkaNapaka} onClick={() => void shrani()}>{shranjevanje ? L('Shranjujem …', 'Saving …') : L('Shrani številčenje', 'Save numbering')}</button>
    </>}
    <Toast sporocilo={toast.sporocilo} ton={toast.napaka ? 'napaka' : 'uspeh'} onClose={() => setToast({ sporocilo: '' })} />
  </section>;
}
