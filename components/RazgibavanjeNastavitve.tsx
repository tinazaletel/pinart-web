'use client';

/* ŠTOPARICA ZA RAZGIBAVANJE — kartica ob glavni štoparici na strani Čas.
 *
 * Zakaj tu in ne na Profilu (Tina, 30. 8. 2026): nastavitve se ne iščejo po
 * lastništvu podatka, ampak po temi. Kdor razmišlja o tem, da predolgo sedi,
 * gre na Čas — na Profil gre enkrat, ko vpiše ime podjetja, in nikoli več.
 *
 * Zakaj je videti kot štoparica in ne kot nastavitve: ker to JE štoparica —
 * druga ura na isti strani, le da meri, kdaj vstati. Zato si sposodi glavo,
 * preliv, cifre in gumb od štoparice iz istega modula (Tina, 30. 8. 2026:
 * »zelo podoben dizajn kot štoparica, velika ura, gradient ozadje«).
 *
 * Opomnik sam pa deluje po VSEJ aplikaciji (glej OpomnikRazgibavanje) — kje
 * živi nastavitev in kje se opomnik pokaže, ni ista stvar.
 */

import { useEffect, useState } from 'react';
import styles from './BusinessPlanWorkspace.module.css';
import { pokMehurcka } from '@/lib/zvokMehurcek';
import { steviloClanov } from '@/lib/razgibavanjeSkupaj';
import {
  DOGODEK_EKIPA, DOGODEK_SPREMEMBA, DOGODEK_TIK, DOGODEK_ZACNI, INTERVALI, INTERVAL_MAX, INTERVAL_MIN,
  PRIVZETE, PUPA_MIRUJE, STEVILO_VAJ, TRAJANJA, TRAJANJE_MAX, TRAJANJE_MIN, VAJE, preberiNastavitve,
  preberiStanje, shraniNastavitve, tedenskiPregled, vajaVKrogu, veljavenInterval, veljavnoTrajanje,
  type RazgibavanjeNastavitve, type Stanje, type Tik,
} from '@/lib/razgibavanje';

const PRAZNO: Stanje = { sekunde: 0, neDanes: null, opravljeno: [] };

export default function RazgibavanjeNastavitve({ jeEn = false }: { jeEn?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [n, setN] = useState<RazgibavanjeNastavitve>(PRIVZETE);
  const [stanje, setStanje] = useState<Stanje>(PRAZNO);
  const [tik, setTik] = useState<Tik | null>(null);

  const [rocno, setRocno] = useState(false);
  const [rocnoTrajanje, setRocnoTrajanje] = useState(false);
  /* Gumb za skupno vajo ima smisel šele, ko nisi sam v ekipi. */
  const [vEkipi, setVEkipi] = useState(false);
  /* Pol minute pišemo po slovensko z vejico, v angleščini s piko. */
  const stevilka = (v: number) => (jeEn ? String(v) : String(v).replace('.', ','));

  /* Branje iz localStorage in ura šele po montaži — med strežniškim izrisom
     ju ni in bi se HTML razšel z odjemalčevim. */
  useEffect(() => {
    const osvezi = () => { setN(preberiNastavitve()); setStanje(preberiStanje()); };
    osvezi();
    void steviloClanov().then(n => setVEkipi(n > 1));
    const naTik = (e: Event) => setTik((e as CustomEvent<Tik>).detail);
    window.addEventListener(DOGODEK_SPREMEMBA, osvezi);
    window.addEventListener(DOGODEK_TIK, naTik);
    return () => {
      window.removeEventListener(DOGODEK_SPREMEMBA, osvezi);
      window.removeEventListener(DOGODEK_TIK, naTik);
    };
  }, []);

  const spremeni = (delno: Partial<RazgibavanjeNastavitve>) => {
    const novo = { ...n, ...delno };
    setN(novo);
    shraniNastavitve(novo);
  };

  const telovadi = tik?.telovadba != null && tik.telovadba > 0;
  /* Dokler opomnik ne pošlje prve sekunde, ura miruje na dogovorjenem intervalu
     — enako kot glavna štoparica, ki v mirovanju kaže 00:00:00. */
  const sekunde = telovadi ? tik!.telovadba! : (tik?.doNaslednjega ?? n.interval * 60);
  const ura = `${String(Math.floor(sekunde / 60)).padStart(2, '0')}:${String(Math.round(sekunde) % 60).padStart(2, '0')}`;
  const teden = tedenskiPregled(stanje);
  const vaja = vajaVKrogu(tik?.telovadba ?? 0, n.trajanje);
  const imeVaje = jeEn ? VAJE[vaja].imeEn : VAJE[vaja].ime;

  return (
    <section className={`${styles.timer} ${styles.razgib}`}>
      <header>
        <p>02 · {L('RAZGIBAVANJE', 'MOVE BREAKS')}</p>
        {/* Opomnik in zvok sta ikoni v kotu, ne kljukici med nastavitvami
            (Tina, 30. 8.): sta preklopa, ki ju zavrtiš mimogrede, ne odločitvi
            v obrazcu. Spodaj ostane le, na koliko časa in koliko časa. */}
        <div className={styles.razPreklopi}>
        <button
          type="button"
          className={styles.razZvok}
          aria-pressed={n.vklopljeno}
          onClick={() => spremeni({ vklopljeno: !n.vklopljeno })}
          title={n.vklopljeno ? L('Opomnik je vklopljen', 'Reminder is on') : L('Opomnik je izklopljen', 'Reminder is off')}
          aria-label={n.vklopljeno ? L('Izklopi opomnik', 'Turn the reminder off') : L('Vklopi opomnik', 'Turn the reminder on')}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8.6a6 6 0 1 0-12 0c0 5-2 6.4-2 6.4h16s-2-1.4-2-6.4Z" />
            <path d="M13.7 19a2 2 0 0 1-3.4 0" />
            {!n.vklopljeno && <path d="M4 4.5 20 19.5" />}
          </svg>
        </button>
        <button
          type="button"
          className={styles.razZvok}
          aria-pressed={n.zvok}
          disabled={!n.vklopljeno}
          onClick={() => { const vklop = !n.zvok; spremeni({ zvok: vklop }); if (vklop) pokMehurcka(); }}
          title={n.zvok ? L('Glasba med vajo je vklopljena', 'Music during the exercise is on') : L('Glasba med vajo je izklopljena', 'Music during the exercise is off')}
          aria-label={n.zvok ? L('Izklopi glasbo med vajo', 'Turn exercise music off') : L('Vklopi glasbo med vajo', 'Turn exercise music on')}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6.5 8.8H3v6.4h3.5L11 19z" />
            {n.zvok
              ? <><path d="M15.4 9.3a3.8 3.8 0 0 1 0 5.4" /><path d="M18 6.7a7.4 7.4 0 0 1 0 10.6" /></>
              : <><path d="m16.5 9.8 4.5 4.4" /><path d="m21 9.8-4.5 4.4" /></>}
          </svg>
        </button>
        </div>
      </header>

      <div className={`${styles.startGlava} ${styles.razGlava}`}>
        <div className={styles.razStolpec}>
          <b className={styles.startUra}>{ura}</b>
          <span className={styles.startDatum}>
            {!n.vklopljeno
              ? L('opomnik je ugasnjen', 'the reminder is off')
              : telovadi
                ? L(`${imeVaje} — kar z mano`, `${imeVaje} — along with me`)
                : L(`do razgibavanja · ${STEVILO_VAJ} vaje`, `until your break · ${STEVILO_VAJ} exercises`)}
          </span>
        </div>

        {/* Pupa miruje, dokler ne telovadiš: kartica, ki ves dan skače v kotu
            očesa, se ugasne (Tina, 30. 8. 2026: »naj stoji na miru«). */}
        <img className={styles.razPupa} src={telovadi ? VAJE[vaja].slika : PUPA_MIRUJE} alt=""
          /* Če animacije za to vajo (še) ni, naj Pupa raje skače kot da bi
             ostala prazna luknja sredi kartice. */
          onError={e => { (e.currentTarget as HTMLImageElement).src = VAJE.skoki.slika; }} />

        <button
          type="button"
          className={styles.startGumb}
          disabled={!n.vklopljeno}
          onClick={() => window.dispatchEvent(new CustomEvent(DOGODEK_ZACNI))}
        >
          {telovadi ? L('Telovadba teče', 'Break running') : L('Začni razgibavanje', 'Start a break')}
        </button>

      </div>

      {/* Skupaj z ekipo stoji POD prelivom: v prelivu bi podaljšal sklad in
          gumb ne bi bil več v isti črti kot v štoparici (Tina, 30. 8. 2026).
          Povabilo se v hipu pokaže vsem v ekipi, ki imajo opomnik vklopljen. */}
      {vEkipi && !telovadi && (
        <button
          type="button"
          className={styles.razSkupaj}
          disabled={!n.vklopljeno}
          onClick={() => window.dispatchEvent(new CustomEvent(DOGODEK_EKIPA))}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3.1" /><path d="M3.4 19a5.8 5.8 0 0 1 11.2 0" />
            <path d="M16.2 5.6a3.1 3.1 0 0 1 0 5.6" /><path d="M18.4 13.6a5.8 5.8 0 0 1 2.2 4.6" />
          </svg>
          {L('Skupaj z ekipo', 'Together with the team')}
        </button>
      )}

      {/* TEDEN: kljukica na dan, ko je bilo razgibavanje odšteto do konca. */}
      <div className={styles.razTeden}>
        <div className={styles.razTedenGlava}>
          <strong>{L('Ta teden', 'This week')}</strong>
          <span>{teden.filter(d => d.opravljeno).length} / 7</span>
        </div>
        <div className={styles.razDnevi}>
          {teden.map(d => (
            <span
              key={d.kljuc}
              className={`${styles.razDan} ${d.opravljeno ? styles.razDanOk : ''} ${d.danes ? styles.razDanDanes : ''} ${d.prihodnost ? styles.razDanNaprej : ''}`}
              title={d.kljuc}
            >
              {d.opravljeno
                ? <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 13 5 5L19 7" /></svg>
                : (jeEn ? d.crkaEn : d.crka)}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.razNastavitve}>
        <div className={styles.razPolje}>
          <span className={styles.razOznaka}>{L('Na koliko časa', 'How often')}</span>
          <div className={styles.razIzbire}>
            {INTERVALI.map(m => (
              <button key={m} type="button" disabled={!n.vklopljeno}
                className={n.interval === m ? styles.razIzbran : ''}
                onClick={() => { setRocno(false); spremeni({ interval: m }); }}>{m}</button>
            ))}
            {/* Svoja številka za tiste, ki delajo po pomodoru (Tina, 30. 8.).
                Ko je vpisana, stoji med izbirami kot vsaka druga možnost. */}
            {!INTERVALI.includes(n.interval as never) && !rocno && (
              <button type="button" className={styles.razIzbran} disabled={!n.vklopljeno}
                onClick={() => setRocno(true)}>{n.interval}</button>
            )}
            {rocno ? (
              <input
                className={styles.razVnos}
                type="number" min={INTERVAL_MIN} max={INTERVAL_MAX} step={1}
                defaultValue={n.interval} autoFocus
                aria-label={L('Poljuben interval v minutah', 'Custom interval in minutes')}
                onBlur={e => { setRocno(false); spremeni({ interval: veljavenInterval(e.target.value) }); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              />
            ) : (
              <button type="button" disabled={!n.vklopljeno} onClick={() => setRocno(true)}
                aria-label={L('Vpiši svoj interval', 'Enter your own interval')}
                title={L('Vpiši svoj interval', 'Enter your own interval')}>+</button>
            )}
            <small>min</small>
          </div>
        </div>

        <div className={styles.razPolje}>
          <span className={styles.razOznaka}>{L('Koliko časa', 'How long')}</span>
          <div className={styles.razIzbire}>
            {TRAJANJA.map(m => (
              <button key={m} type="button" disabled={!n.vklopljeno}
                className={n.trajanje === m ? styles.razIzbran : ''}
                onClick={() => { setRocnoTrajanje(false); spremeni({ trajanje: m }); }}>
                {stevilka(m)}
              </button>
            ))}
            {!TRAJANJA.includes(n.trajanje as never) && !rocnoTrajanje && (
              <button type="button" className={styles.razIzbran} disabled={!n.vklopljeno}
                onClick={() => setRocnoTrajanje(true)}>{stevilka(n.trajanje)}</button>
            )}
            {rocnoTrajanje ? (
              <input
                className={styles.razVnos}
                type="number" min={TRAJANJE_MIN} max={TRAJANJE_MAX} step={0.5}
                defaultValue={n.trajanje} autoFocus
                aria-label={L('Poljubno trajanje v minutah', 'Custom length in minutes')}
                onBlur={e => { setRocnoTrajanje(false); spremeni({ trajanje: veljavnoTrajanje(e.target.value) }); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              />
            ) : (
              <button type="button" disabled={!n.vklopljeno} onClick={() => setRocnoTrajanje(true)}
                aria-label={L('Vpiši svoje trajanje', 'Enter your own length')}
                title={L('Vpiši svoje trajanje', 'Enter your own length')}>+</button>
            )}
            <small>min</small>
          </div>
        </div>
      </div>

      <p className={styles.razDrobno}>
        {L('Šteje se čas, ko si res za računalnikom — ko odideš, se štetje ustavi samo. Opomnik se pokaže kjerkoli v Flowu, nastavitev pa ostane v tem brskalniku in se nikamor ne pošilja.',
           'Only time you are actually at the computer counts — when you step away, the count pauses itself. The reminder shows up anywhere in Flow; the setting stays in this browser and is never sent anywhere.')}
      </p>
    </section>
  );
}
