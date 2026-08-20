'use client';

/* DELOVNA TABLA — več nalog hkrati, vsaka s svojim stanjem.
 *
 * Tinina bolečina (20. 8. 2026): »Moram pisati v več oken in ne vidim, kdaj je
 * kateri agent končal — vse moram prebrati ali pa ga kar vprašam.« Več agentov
 * ljudje ne uporabljajo zaradi raznolikosti, ampak zaradi HITROSTI: da ni treba
 * čakati enega.
 *
 * Zato tu ni sestavljanja botov. Napišeš naloge, izbereš izvajalca, oddaš.
 *
 * Delo NE teče v brskalniku. Naloga se zapiše v vrsto (app/api/agent-naloge),
 * opravi jo urnik na strežniku (app/api/cron/agent-naloge). Zavihek lahko
 * zapreš, računalnik ugasneš — odgovori te počakajo. Ta stran je zato v resnici
 * dvoje: zgoraj oddajni obrazec, spodaj okno v vrsto.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

type Stanje = 'caka' | 'dela' | 'gotovo' | 'napaka' | 'preklicano';

/* Vrstica, ki jo uporabnica šele piše. Živi samo v brskalniku. */
type Osnutek = { id: string; besedilo: string; izvajalec: string };

/* Naloga, kot jo vrne strežnik. */
type Naloga = {
  id: string;
  besedilo: string;
  connection_id: string | null;
  stanje: Stanje;
  odgovor: string | null;
  napaka: string | null;
  model: string | null;
  created_at: string;
  zacetek: string | null;
  konec: string | null;
};

const novOsnutek = (): Osnutek => ({ id: crypto.randomUUID(), besedilo: '', izvajalec: '' });

const cas = (s: string | null) => (s ? new Date(s).getTime() : 0);

/* Koliko časa je naloga tekla (ali teče). Pri čakajoči nima smisla. */
const trajanje = (n: Naloga, zdaj: number) => {
  const od = cas(n.zacetek);
  if (!od) return '';
  const sek = Math.max(0, Math.round(((cas(n.konec) || zdaj) - od) / 1000));
  return sek < 60 ? `${sek} s` : `${Math.floor(sek / 60)} min ${sek % 60} s`;
};

const uraDneva = (s: string | null) =>
  s ? new Date(s).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }) : '';

export default function AgentTabla() {
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);

  const [osnutki, setOsnutki] = useState<Osnutek[]>([novOsnutek(), novOsnutek()]);
  const [vrsta, setVrsta] = useState<Naloga[]>([]);
  const [nalagam, setNalagam] = useState(true);
  const [oddajam, setOddajam] = useState(false);
  const [napaka, setNapaka] = useState('');
  const [zdaj, setZdaj] = useState(() => Date.now());
  const [agenti, setAgenti] = useState<{ id: string; label: string }[]>([]);
  const [kopiran, setKopiran] = useState('');
  const orgRef = useRef('');

  const nedokoncane = vrsta.filter(n => n.stanje === 'caka' || n.stanje === 'dela');

  const nalozi = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-naloge');
      if (!res.ok) return;
      const d = await res.json();
      if (Array.isArray(d?.naloge)) setVrsta(d.naloge);
    } catch { /* tiho: naslednji obhod bo morda uspel */ }
    finally { setNalagam(false); }
  }, []);

  useEffect(() => { void nalozi(); }, [nalozi]);

  /* Poizvedujemo samo, dokler je kaj nedokončanega. Ko je vse gotovo, se
     stran umiri in ne trka več po strežniku. */
  useEffect(() => {
    if (!nedokoncane.length) return;
    const id = window.setInterval(() => { setZdaj(Date.now()); void nalozi(); }, 4000);
    /* Vrnitev na zavihek je najpogostejši trenutek, ko uporabnica hoče vedeti,
       kaj se je zgodilo v njeni odsotnosti. */
    const obVrnitvi = () => { if (!document.hidden) void nalozi(); };
    document.addEventListener('visibilitychange', obVrnitvi);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', obVrnitvi); };
  }, [nedokoncane.length, nalozi]);

  /* Ura za prikazani čas teče hitreje kot poizvedbe, da števec ne skače. */
  useEffect(() => {
    if (!vrsta.some(n => n.stanje === 'dela')) return;
    const id = window.setInterval(() => setZdaj(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [vrsta]);

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

  const posodobi = (id: string, delno: Partial<Osnutek>) =>
    setOsnutki(prej => prej.map(o => (o.id === id ? { ...o, ...delno } : o)));

  const oddaj = async () => {
    const zaOddajo = osnutki.filter(o => o.besedilo.trim());
    if (!zaOddajo.length || oddajam) return;
    setOddajam(true); setNapaka('');
    try {
      const res = await fetch('/api/agent-naloge', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          naloge: zaOddajo.map(o => ({ besedilo: o.besedilo.trim(), connectionId: o.izvajalec })),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setNapaka(d?.napaka || L('Nalog ni bilo mogoče oddati.', 'The tasks could not be submitted.'));
        return;
      }
      /* Obrazec spraznimo šele ob potrjeni oddaji — sicer bi ob napaki
         uporabnica izgubila, kar je napisala. */
      setOsnutki([novOsnutek(), novOsnutek()]);
      setVrsta(prej => [...(d.naloge || []), ...prej]);
      setZdaj(Date.now());
    } catch {
      setNapaka(L('Ne morem do zaledja. Poskusi znova.', 'Cannot reach the backend. Try again.'));
    } finally {
      setOddajam(false);
    }
  };

  const ukrepaj = async (id: string, dejanje: 'preklici' | 'izbrisi') => {
    /* Pokažemo takoj, potrdimo pozneje: čakanje na strežnik pri brisanju
       vrstice se bere kot zataknjen vmesnik. */
    setVrsta(prej => dejanje === 'izbrisi'
      ? prej.filter(n => n.id !== id)
      : prej.map(n => (n.id === id ? { ...n, stanje: 'preklicano' as Stanje } : n)));
    try {
      await fetch('/api/agent-naloge', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, dejanje }),
      });
    } catch { void nalozi(); }
  };

  const kopiraj = (n: Naloga) => {
    navigator.clipboard?.writeText(n.odgovor || '').then(() => {
      setKopiran(n.id);
      window.setTimeout(() => setKopiran(''), 2000);
    }).catch(() => { });
  };

  const imeIzvajalca = (id: string | null) =>
    (id ? agenti.find(a => a.id === id)?.label : '') || 'Pupa';

  const pripravljenih = osnutki.filter(o => o.besedilo.trim()).length;
  const gotovih = vrsta.filter(n => n.stanje === 'gotovo').length;

  return (
    <div className="at">
      <header>
        <p className="at-nad">{L('DELOVNA TABLA', 'WORK BOARD')}</p>
        <h1>{L('Napiši, kaj naj se naredi. Vse hkrati.', 'Write what needs doing. All at once.')}</h1>
        <p className="at-pod">
          {L('Naloge oddaš in greš. Delo teče na strežniku, tudi če zapreš okno — ko se vrneš, so odgovori tu.',
             'Submit and walk away. The work runs on the server even if you close the window — the answers are here when you return.')}
        </p>
      </header>

      <div className="at-seznam">
        {osnutki.map((o, i) => (
          <article key={o.id} className="at-vrstica">
            <span className="at-pika" aria-hidden />
            <div className="at-vsebina">
              <textarea rows={2} value={o.besedilo}
                onChange={e => posodobi(o.id, { besedilo: e.target.value })}
                placeholder={i === 0
                  ? L('npr. Napiši tri predloge imena za kavarno v Ljubljani', 'e.g. Write three name ideas for a café')
                  : L('… naslednja naloga', '… next task')} />
              <div className="at-nadzor">
                <span className="at-stanje">{L('ni oddana', 'not submitted')}</span>
                {agenti.length > 0 && (
                  <select value={o.izvajalec}
                    onChange={e => posodobi(o.id, { izvajalec: e.target.value })}
                    aria-label={L('Kdo naj to naredi', 'Who should do this')}>
                    <option value="">Pupa</option>
                    {agenti.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                )}
                {osnutki.length > 1 && (
                  <button type="button" className="at-x" aria-label={L('Odstrani nalogo', 'Remove task')}
                    onClick={() => setOsnutki(prej => prej.filter(x => x.id !== o.id))}>×</button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="at-akcije">
        <button type="button" className="at-dodaj" onClick={() => setOsnutki(prej => [...prej, novOsnutek()])}>
          + {L('Dodaj nalogo', 'Add task')}
        </button>
        <button type="button" className="at-glavni" disabled={!pripravljenih || oddajam} onClick={oddaj}>
          {oddajam
            ? L('Oddajam …', 'Submitting …')
            : pripravljenih > 1
              ? L(`Oddaj vse (${pripravljenih})`, `Submit all (${pripravljenih})`)
              : L('Oddaj', 'Submit')}
        </button>
      </div>

      {napaka && <p className="at-napaka" role="alert">{napaka}</p>}

      {!nalagam && vrsta.length > 0 && (
        <section className="at-vrsta">
          <p className="at-nad">
            {L('V VRSTI', 'IN QUEUE')}
            {nedokoncane.length > 0
              ? ` · ${nedokoncane.length} ${L('v delu', 'running')}`
              : gotovih > 0 ? ` · ${L('vse gotovo', 'all done')}` : ''}
          </p>

          {vrsta.map(n => (
            <article key={n.id} className={`at-vrstica at-${n.stanje}`}>
              <span className="at-pika" aria-hidden />
              <div className="at-vsebina">
                <p className="at-besedilo">{n.besedilo}</p>

                <div className="at-nadzor">
                  <span className="at-stanje">
                    {n.stanje === 'caka' && L('v vrsti', 'queued')}
                    {n.stanje === 'dela' && `${L('dela', 'working')} · ${trajanje(n, zdaj)}`}
                    {n.stanje === 'gotovo' && `${L('gotovo ob', 'done at')} ${uraDneva(n.konec)} · ${trajanje(n, zdaj)}`}
                    {n.stanje === 'napaka' && L('ni uspelo', 'failed')}
                    {n.stanje === 'preklicano' && L('preklicano', 'cancelled')}
                  </span>
                  <span className="at-kdo">{imeIzvajalca(n.connection_id)}</span>
                  {n.stanje === 'caka' && (
                    <button type="button" className="at-drobni" onClick={() => ukrepaj(n.id, 'preklici')}>
                      {L('Prekliči', 'Cancel')}
                    </button>
                  )}
                  {n.stanje !== 'dela' && n.stanje !== 'caka' && (
                    <button type="button" className="at-x" aria-label={L('Odstrani z table', 'Remove from board')}
                      onClick={() => ukrepaj(n.id, 'izbrisi')}>×</button>
                  )}
                </div>

                {n.napaka && <p className="at-napaka" role="alert">{n.napaka}</p>}
                {n.odgovor && (
                  <div className="at-odgovor">
                    <p>{n.odgovor}</p>
                    <button type="button" onClick={() => kopiraj(n)}>
                      {kopiran === n.id ? L('Kopirano ✓', 'Copied ✓') : L('Kopiraj', 'Copy')}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      <p className="at-tiho">
        {L('Naloge tečejo na strežniku, zato lahko zavihek mirno zapreš. Vsako minuto jih pobere urnik, tri hkrati; daljša vrsta se odvije v več obhodih.',
           'Tasks run on the server, so you can safely close the tab. A scheduler picks them up every minute, three at a time; a longer queue takes several rounds.')}
      </p>

      <style jsx>{`
        .at { max-width: 52rem; margin: 0 auto; padding: 2.2rem 1.2rem 4rem; display: flex; flex-direction: column; gap: 1rem; }
        .at-nad { margin: 0; font-size: .64rem; font-weight: 800; letter-spacing: .18em; color: #8a8177; }
        h1 { margin: .2rem 0 .3rem; font-size: 1.9rem; font-family: var(--font-serif-flow, var(--font-serif)), serif; color: var(--ink, #111); }
        .at-pod { margin: 0; font-size: .88rem; line-height: 1.5; color: #6b655d; }
        .at-seznam { display: flex; flex-direction: column; gap: .55rem; }
        .at-vrsta { display: flex; flex-direction: column; gap: .55rem; margin-top: 1.4rem; padding-top: 1.2rem; border-top: 1px solid var(--line, rgba(17,17,17,.1)); }
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
        .at-besedilo { margin: .1rem 0; font-size: .92rem; font-weight: 500; line-height: 1.5; color: var(--ink, #111); white-space: pre-wrap; }
        .at-nadzor { display: flex; align-items: center; gap: .5rem; }
        .at-stanje { font-size: .72rem; font-weight: 700; color: #6b655d; }
        .at-dela .at-stanje { color: #6E4FA6; }
        .at-gotovo .at-stanje { color: #2F5D50; }
        .at-napaka .at-stanje { color: #a4342a; }
        .at-kdo { margin-left: auto; font-size: .72rem; font-weight: 600; color: #8a8177; }
        .at-nadzor select { margin-left: auto; padding: .25rem .4rem; border: 1px solid rgba(17,17,17,.14); border-radius: .5rem; background: #fff; font: 600 .74rem inherit; }
        .at-drobni { padding: .25rem .6rem; border: 1px solid rgba(17,17,17,.16); border-radius: 999px; background: #fff; font: 700 .72rem inherit; color: #6b655d; cursor: pointer; }
        .at-drobni:hover { border-color: #a4342a; color: #a4342a; }
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
        .at-tiho { margin: 0; font-size: .74rem; line-height: 1.45; color: #6b655d; }
      `}</style>
    </div>
  );
}
