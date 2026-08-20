'use client';

/* DELOVNA TABLA — več nalog hkrati, vsaka s svojim stanjem.
 *
 * Tinina bolečina (20. 8. 2026): »Moram pisati v več oken in ne vidim, kdaj je
 * kateri agent končal — vse moram prebrati ali pa ga kar vprašam.« Več agentov
 * ljudje ne uporabljajo zaradi raznolikosti, ampak zaradi HITROSTI: da ni treba
 * čakati enega.
 *
 * Zato tu ni sestavljanja botov. Napišeš naloge, izbereš izvajalca, pritisneš
 * enkrat — in gledaš, kdo kdaj konča.
 *
 * Omejitev, ki jo je treba poznati: brskalnik nima ozadja. Naloge tečejo,
 * dokler je zavihek odprt. Za pravo ozadje bi rabili strežniško vrsto, kar je
 * svoj projekt; to je namenoma napisano tudi v vmesniku, da nihče ne zapre
 * zavihka v prepričanju, da delo teče naprej.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

type Stanje = 'caka' | 'dela' | 'gotovo' | 'napaka';

type Naloga = {
  id: string;
  besedilo: string;
  izvajalec: string;      /* '' = Pupa, sicer id povezave */
  stanje: Stanje;
  odgovor: string;
  napaka: string;
  zacetek: number;
  konec: number;
};

/* Koliko nalog teče hkrati. Trije so dovolj: ponudniki omejujejo pogostost,
   pri več pa se čakanje samo prestavi v njihovo vrsto. */
const HKRATI = 3;

const nova = (): Naloga => ({
  id: crypto.randomUUID(), besedilo: '', izvajalec: '',
  stanje: 'caka', odgovor: '', napaka: '', zacetek: 0, konec: 0,
});

const trajanje = (n: Naloga, zdaj: number) => {
  if (!n.zacetek) return '';
  const s = Math.round(((n.konec || zdaj) - n.zacetek) / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
};

export default function AgentTabla() {
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);

  const [naloge, setNaloge] = useState<Naloga[]>([nova(), nova()]);
  const [tece, setTece] = useState(false);
  const [zdaj, setZdaj] = useState(Date.now());
  const [agenti, setAgenti] = useState<{ id: string; label: string }[]>([]);
  const orgRef = useRef('');
  const prekiniRef = useRef(false);

  /* Ura teče samo med delom — da se prikazani čas premika. */
  useEffect(() => {
    if (!tece) return;
    const id = window.setInterval(() => setZdaj(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [tece]);

  useEffect(() => {
    let ziv = true;
    (async () => {
      try {
        const ctx = await getOrganizationContext();
        if (!ctx || !ziv) return;
        orgRef.current = ctx.organizationId;
        const res = await fetch(`/api/ai/povezave?organizationId=${ctx.organizationId}`);
        if (!res.ok) return;
        const d = await res.json();
        const upor = (d?.connections || [])
          .filter((c: { connection_type: string; provider: string; status: string }) =>
            c.connection_type === 'api' && c.provider !== 'custom-mcp' && c.status !== 'disabled')
          .map((c: { id: string; label: string }) => ({ id: c.id, label: c.label }));
        if (ziv) setAgenti(upor);
      } catch { /* brez povezav vse opravi Pupa */ }
    })();
    return () => { ziv = false; };
  }, []);

  const posodobi = (id: string, delno: Partial<Naloga>) =>
    setNaloge(prej => prej.map(n => (n.id === id ? { ...n, ...delno } : n)));

  const opravi = async (n: Naloga) => {
    posodobi(n.id, { stanje: 'dela', zacetek: Date.now(), konec: 0, odgovor: '', napaka: '' });
    try {
      const res = n.izvajalec && orgRef.current
        ? await fetch('/api/ai/izvedi', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ organizationId: orgRef.current, connectionId: n.izvajalec, prompt: n.besedilo }),
        })
        : await fetch('/api/pupa', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ vprasanje: n.besedilo, kontekst: '', zgodovina: [] }),
        });
      const d = await res.json();
      const odg: string = d.odgovor || d.text || '';
      if (!odg) {
        posodobi(n.id, { stanje: 'napaka', napaka: d.napaka || d.error || L('Odgovora ni bilo.', 'No answer.'), konec: Date.now() });
        return;
      }
      posodobi(n.id, { stanje: 'gotovo', odgovor: odg, konec: Date.now() });
    } catch {
      posodobi(n.id, { stanje: 'napaka', napaka: L('Ne morem do zaledja.', 'Cannot reach the backend.'), konec: Date.now() });
    }
  };

  /* Preprosta vrsta s tremi mesti: ko se eno sprosti, vstopi naslednja naloga. */
  const zazeni = async () => {
    const zaDelo = naloge.filter(n => n.besedilo.trim() && n.stanje !== 'dela');
    if (!zaDelo.length || tece) return;
    setTece(true);
    prekiniRef.current = false;
    const vrsta = [...zaDelo];
    const delavec = async () => {
      while (vrsta.length && !prekiniRef.current) {
        const n = vrsta.shift();
        if (n) await opravi(n);
      }
    };
    await Promise.all(Array.from({ length: Math.min(HKRATI, vrsta.length) }, delavec));
    setTece(false);
  };

  const koncanih = naloge.filter(n => n.stanje === 'gotovo').length;
  const zaDelo = naloge.filter(n => n.besedilo.trim()).length;

  return (
    <div className="at">
      <header>
        <p className="at-nad">{L('DELOVNA TABLA', 'WORK BOARD')}</p>
        <h1>{L('Napiši, kaj naj se naredi. Vse hkrati.', 'Write what needs doing. All at once.')}</h1>
        <p className="at-pod">
          {L('Naloge tečejo vzporedno, tri hkrati. Vidiš, katera dela in katera je gotova — ni ti treba spraševati.',
             'Tasks run in parallel, three at a time. You see which is running and which is done — no need to ask.')}
        </p>
      </header>

      <div className="at-seznam">
        {naloge.map((n, i) => (
          <article key={n.id} className={`at-vrstica at-${n.stanje}`}>
            <span className="at-pika" aria-hidden />
            <div className="at-vsebina">
              <textarea rows={2} value={n.besedilo} disabled={n.stanje === 'dela'}
                onChange={e => posodobi(n.id, { besedilo: e.target.value })}
                placeholder={i === 0
                  ? L('npr. Napiši tri predloge imena za kavarno v Ljubljani', 'e.g. Write three name ideas for a café')
                  : L('… naslednja naloga', '… next task')} />

              <div className="at-nadzor">
                <span className="at-stanje">
                  {n.stanje === 'caka' && L('čaka', 'waiting')}
                  {n.stanje === 'dela' && `${L('dela', 'working')} · ${trajanje(n, zdaj)}`}
                  {n.stanje === 'gotovo' && `${L('gotovo', 'done')} · ${trajanje(n, zdaj)}`}
                  {n.stanje === 'napaka' && L('ni uspelo', 'failed')}
                </span>
                {agenti.length > 0 && (
                  <select value={n.izvajalec} disabled={n.stanje === 'dela'}
                    onChange={e => posodobi(n.id, { izvajalec: e.target.value })}
                    aria-label={L('Kdo naj to naredi', 'Who should do this')}>
                    <option value="">Pupa</option>
                    {agenti.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                )}
                {naloge.length > 1 && n.stanje !== 'dela' && (
                  <button type="button" className="at-x" aria-label={L('Odstrani nalogo', 'Remove task')}
                    onClick={() => setNaloge(prej => prej.filter(x => x.id !== n.id))}>×</button>
                )}
              </div>

              {n.napaka && <p className="at-napaka" role="alert">{n.napaka}</p>}
              {n.odgovor && (
                <div className="at-odgovor">
                  <p>{n.odgovor}</p>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(n.odgovor).catch(() => { })}>
                    {L('Kopiraj', 'Copy')}
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="at-akcije">
        <button type="button" className="at-dodaj" onClick={() => setNaloge(prej => [...prej, nova()])}>
          + {L('Dodaj nalogo', 'Add task')}
        </button>
        {tece ? (
          <button type="button" className="at-glavni" onClick={() => { prekiniRef.current = true; }}>
            {L('Ustavi', 'Stop')}
          </button>
        ) : (
          <button type="button" className="at-glavni" disabled={!zaDelo} onClick={zazeni}>
            {zaDelo > 1 ? L(`Zaženi vse (${zaDelo})`, `Run all (${zaDelo})`) : L('Zaženi', 'Run')}
          </button>
        )}
        {koncanih > 0 && <span className="at-stevec">{koncanih} / {zaDelo} {L('končanih', 'done')}</span>}
      </div>

      <p className="at-tiho">
        {L('Naloge tečejo, dokler je ta zavihek odprt. Če ga zapreš, se ustavijo — Flow še nima strežnika, ki bi delal v ozadju.',
           'Tasks run while this tab is open. Closing it stops them — Flow does not have a background worker yet.')}
      </p>

      <style jsx>{`
        .at { max-width: 52rem; margin: 0 auto; padding: 2.2rem 1.2rem 4rem; display: flex; flex-direction: column; gap: 1rem; }
        .at-nad { margin: 0; font-size: .64rem; font-weight: 800; letter-spacing: .18em; color: #8a8177; }
        h1 { margin: .2rem 0 .3rem; font-size: 1.9rem; font-family: var(--font-serif-flow, var(--font-serif)), serif; color: var(--ink, #111); }
        .at-pod { margin: 0; font-size: .88rem; line-height: 1.5; color: #6b655d; }
        .at-seznam { display: flex; flex-direction: column; gap: .55rem; }
        .at-vrstica { display: flex; gap: .7rem; padding: .8rem .9rem; border: 1px solid rgba(17,17,17,.1); border-radius: .9rem; background: #fff; }
        .at-pika { flex: none; width: .6rem; height: .6rem; margin-top: .55rem; border-radius: 50%; background: rgba(17,17,17,.18); }
        .at-dela .at-pika { background: #6E4FA6; animation: at-utrip 1.1s ease-in-out infinite; }
        .at-gotovo .at-pika { background: #2F5D50; }
        .at-napaka .at-pika { background: #a4342a; }
        @keyframes at-utrip { 50% { opacity: .3; } }
        @media (prefers-reduced-motion: reduce) { .at-dela .at-pika { animation: none; } }
        .at-vsebina { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .4rem; }
        .at-vsebina textarea { width: 100%; padding: .35rem 0; border: 0; background: transparent; font: 500 .92rem var(--font-sans), sans-serif; line-height: 1.5; color: var(--ink, #111); resize: vertical; }
        .at-vsebina textarea:focus { outline: none; }
        .at-nadzor { display: flex; align-items: center; gap: .5rem; }
        .at-stanje { font-size: .72rem; font-weight: 700; color: #6b655d; }
        .at-dela .at-stanje { color: #6E4FA6; }
        .at-gotovo .at-stanje { color: #2F5D50; }
        .at-napaka .at-stanje { color: #a4342a; }
        .at-nadzor select { margin-left: auto; padding: .25rem .4rem; border: 1px solid rgba(17,17,17,.14); border-radius: .5rem; background: #fff; font: 600 .74rem inherit; }
        .at-x { width: 1.6rem; height: 1.6rem; border: 1px solid rgba(17,17,17,.14); border-radius: 50%; background: #fff; color: #6b655d; cursor: pointer; }
        .at-odgovor { padding: .6rem .7rem; border-radius: .6rem; background: #F5F2EA; display: flex; flex-direction: column; gap: .4rem; }
        .at-odgovor p { margin: 0; font-size: .86rem; line-height: 1.55; white-space: pre-wrap; color: #2a2520; }
        .at-odgovor button { align-self: flex-start; padding: .3rem .7rem; border: 1px solid rgba(17,17,17,.16); border-radius: 999px; background: #fff; font: 700 .72rem inherit; cursor: pointer; }
        .at-napaka { margin: 0; font-size: .8rem; font-weight: 600; color: #a4342a; }
        .at-akcije { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
        .at-dodaj, .at-glavni { padding: .6rem 1.1rem; border-radius: 999px; font: 800 .82rem var(--font-sans), sans-serif; cursor: pointer; }
        .at-dodaj { border: 1px dashed rgba(17,17,17,.25); background: transparent; color: var(--ink, #111); }
        .at-dodaj:hover { border-color: #6E4FA6; color: #6E4FA6; }
        .at-glavni { border: 0; background: #6E4FA6; color: #fff; }
        .at-glavni:disabled { opacity: .5; cursor: default; }
        .at-stevec { font-size: .8rem; font-weight: 700; color: #2F5D50; }
        .at-tiho { margin: 0; font-size: .74rem; line-height: 1.45; color: #6b655d; }
      `}</style>
    </div>
  );
}
