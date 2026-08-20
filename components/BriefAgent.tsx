'use client';

/* NAPIŠI BRIEF — prva pot, kjer se pogovor konča z ZAPISOM v Flowu.
 *
 * Doslej je Pupa svetovala, ustvarjala pa ni nič: povedala ti je, kateri gumb
 * klikniti. Tu je drugače — poveš, kaj gradiš, in brief pristane na projektu,
 * urejen po istih poljih, kot jih ima projekt (»BRIEF · ŽELJE STRANKE«).
 *
 * Napiše ga Pupa ALI uporabničin povezan agent (»Moj AI«) — v drugem primeru
 * porabo plača svojemu ponudniku. Model vrne JSON, ker mora vsak odstavek
 * pristati v svojem polju; prosto besedilo bi zahtevalo ugibanje pri razrezu.
 */

import { useEffect, useMemo, useState } from 'react';
import DokPanel from '@/components/DokPanel';
import { useLocale } from 'next-intl';
import { preberiProjekti, shraniProjekt, type Projekt } from '@/lib/projekti';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

type Polja = {
  opisStranke?: string;
  panoga?: string;
  ciljnaSkupina?: string;
  dizajnZelje?: string;
  voice?: string;
  konkurenca?: string;
  cilji?: string[];
};

const NAVODILO = `Si izkušen kreativni vodja. Iz uporabnikovega opisa sestavi PROJEKTNI BRIEF.
Odgovori IZKLJUČNO z JSON objektom, brez uvoda in brez oznak za kodo. Oblika:
{"opisStranke":"…","panoga":"…","ciljnaSkupina":"…","dizajnZelje":"…","voice":"…","konkurenca":"…","cilji":["…","…"]}
Pravila: piši v slovenščini, vsako polje 1–3 povedi, konkretno in brez fraz.
Če česa iz opisa ne veš, na kratko predlagaj smiselno možnost — ne izmišljaj si dejstev o stranki (imena, številk, dosežkov).
"cilji" naj bo 2–4 merljivi cilji projekta.`;

/* Model rad ovije JSON v razlago ali v ```json blok — vzamemo prvi objekt. */
function izlusciJson(besedilo: string): Polja | null {
  const zac = besedilo.indexOf('{');
  const kon = besedilo.lastIndexOf('}');
  if (zac === -1 || kon <= zac) return null;
  try {
    return JSON.parse(besedilo.slice(zac, kon + 1)) as Polja;
  } catch {
    return null;
  }
}

export default function BriefAgent({ base = '' }: { base?: string }) {
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);
  /* Panel se odpre SAM, ko brief pride — rezultat, ki ga moras se poiskati,
     je pol rezultata. Zapre se s krizcem ali Esc in ga lahko odpres nazaj. */
  const [odprtPanel, setOdprtPanel] = useState(false);

  const [projekti, setProjekti] = useState<Projekt[]>([]);
  const [projektId, setProjektId] = useState('');
  const [opis, setOpis] = useState('');
  const [dela, setDela] = useState(false);
  const [napaka, setNapaka] = useState('');
  const [izid, setIzid] = useState<Polja | null>(null);
  const [shranjeno, setShranjeno] = useState(false);

  const [agenti, setAgenti] = useState<{ id: string; label: string }[]>([]);
  const [agent, setAgent] = useState('');
  const [orgId, setOrgId] = useState('');

  useEffect(() => {
    const p = preberiProjekti();
    setProjekti(p);
    if (p.length) setProjektId(p[0].id);
  }, []);

  useEffect(() => {
    let ziv = true;
    (async () => {
      try {
        const ctx = await getOrganizationContext();
        if (!ctx || !ziv) return;
        setOrgId(ctx.organizationId);
        const res = await fetch(`/api/ai/povezave?organizationId=${ctx.organizationId}`);
        if (!res.ok) return;
        const d = await res.json();
        const upor = (d?.connections || [])
          .filter((c: { connection_type: string; provider: string; status: string }) =>
            c.connection_type === 'api' && c.provider !== 'custom-mcp' && c.status !== 'disabled')
          .map((c: { id: string; label: string }) => ({ id: c.id, label: c.label }));
        if (ziv) setAgenti(upor);
      } catch { /* brez povezav piše Pupa */ }
    })();
    return () => { ziv = false; };
  }, []);

  const projekt = useMemo(() => projekti.find(p => p.id === projektId), [projekti, projektId]);

  const napisi = async () => {
    if (!opis.trim() || dela) return;
    setDela(true); setNapaka(''); setIzid(null); setShranjeno(false); setOdprtPanel(false);
    const poziv = [
      NAVODILO,
      projekt ? `Projekt: ${projekt.naslov}${projekt.strankaIme ? ` · stranka: ${projekt.strankaIme}` : ''}` : '',
      `Opis od uporabnika: ${opis.trim()}`,
    ].filter(Boolean).join('\n\n');

    try {
      const res = agent && orgId
        ? await fetch('/api/ai/izvedi', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ organizationId: orgId, connectionId: agent, prompt: poziv }),
        })
        : await fetch('/api/pupa', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ vprasanje: poziv, kontekst: '', zgodovina: [] }),
        });
      const data = await res.json();
      const besedilo: string = data.odgovor || data.text || '';
      if (!besedilo) { setNapaka(data.napaka || data.error || L('Odgovora ni bilo.', 'No answer came back.')); return; }
      const polja = izlusciJson(besedilo);
      if (!polja) { setNapaka(L('Odgovor ni bil v pričakovani obliki. Poskusi znova.', 'The answer was not in the expected shape. Try again.')); return; }
      setIzid(polja);
      setOdprtPanel(true);
    } catch {
      setNapaka(L('Ne morem do zaledja. Poskusi znova.', 'Cannot reach the backend. Try again.'));
    } finally {
      setDela(false);
    }
  };

  const shraniNaProjekt = () => {
    if (!izid || !projekt) return;
    const posodobljen: Projekt = {
      ...projekt,
      opisStranke: izid.opisStranke || projekt.opisStranke,
      panoga: izid.panoga || projekt.panoga,
      ciljnaSkupina: izid.ciljnaSkupina || projekt.ciljnaSkupina,
      dizajnZelje: izid.dizajnZelje || projekt.dizajnZelje,
      voice: izid.voice || projekt.voice,
      konkurenca: izid.konkurenca || projekt.konkurenca,
      cilji: (izid.cilji || []).length
        ? (izid.cilji || []).map(b => ({ id: crypto.randomUUID(), besedilo: b }))
        : projekt.cilji,
    };
    shraniProjekt(posodobljen);
    setShranjeno(true);
  };

  return (
    <div className="ba">
      <header className="ba-glava">
        <p className="ba-nad">{L('BRIEF', 'BRIEF')}</p>
        <h1>{L('Povej, kaj gradiva.', 'Tell me what we are building.')}</h1>
        <p className="ba-pod">{L('Brief napiše Pupa ali tvoj agent — nato ga shraniš na projekt in urediš.', 'Pupa or your agent writes the brief — then you save it to the project and edit it.')}</p>
      </header>

      {projekti.length === 0 ? (
        <p className="ba-prazno">
          {L('Najprej potrebuješ projekt. Ustvari ga in se vrni sem.', 'You need a project first. Create one and come back.')}
          {' '}<a href={`${base}/kalkulator/nov-projekt`}>{L('Ustvari projekt', 'Create a project')}</a>
        </p>
      ) : (
        <>
          <div className="ba-vrsta">
            <label className="ba-polje">
              <span>{L('Za kateri projekt', 'For which project')}</span>
              <select value={projektId} onChange={e => { setProjektId(e.target.value); setIzid(null); setShranjeno(false); setOdprtPanel(false); }}>
                {projekti.map(p => <option key={p.id} value={p.id}>{p.naslov}{p.strankaIme ? ` · ${p.strankaIme}` : ''}</option>)}
              </select>
            </label>
            {agenti.length > 0 && (
              <label className="ba-polje ba-ozko">
                <span>{L('Kdo naj napiše', 'Who writes it')}</span>
                <select value={agent} onChange={e => setAgent(e.target.value)}>
                  <option value="">Pupa</option>
                  {agenti.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </label>
            )}
          </div>

          <label className="ba-polje">
            <span>{L('Kaj gradiva in za koga?', 'What are we building and for whom?')}</span>
            <textarea rows={4} value={opis} onChange={e => setOpis(e.target.value)}
              placeholder={L('npr. Nova spletna stran za kavarno Luna v Ljubljani. Mlada ekipa, specialty kava, hočejo videti bolj resno kot zdaj, a ne dolgočasno.',
                             'e.g. New website for Luna café. Young team, specialty coffee, they want to look more serious but not boring.')} />
          </label>

          <div className="ba-akcije">
            <button type="button" className="ba-glavni" onClick={napisi} disabled={!opis.trim() || dela}>
              {dela ? L('Pišem …', 'Writing …') : L('Napiši brief', 'Write the brief')}
            </button>
            {izid && !odprtPanel && (
              <button type="button" className="ba-drugi" onClick={() => setOdprtPanel(true)}>
                {L('Pokaži brief', 'Show the brief')}
              </button>
            )}
          </div>

          {napaka && <p className="ba-napaka" role="alert">{napaka}</p>}

          <DokPanel
            odprt={odprtPanel && !!izid}
            jeEn={locale === 'en'}
            nadnaslov={L('Brief', 'Brief')}
            naslov={projekt?.naslov || L('Brief', 'Brief')}
            podnaslov={projekt?.strankaIme || undefined}
            onZapri={() => setOdprtPanel(false)}
            dejanja={<>
              {!shranjeno && (
                <button type="button" className="ba-glavni" onClick={shraniNaProjekt}>
                  {L('Shrani na projekt', 'Save to project')}
                </button>
              )}
              {shranjeno && projekt && (
                <a className="ba-drugi" href={`${base}/kalkulator/projekti?projekt=${projekt.id}`}>
                  {L('Odpri projekt →', 'Open project →')}
                </a>
              )}
              {shranjeno && <span className="ba-ok" role="status">{L('Brief je na projektu.', 'The brief is on the project.')}</span>}
            </>}
          >
            {izid && <>
              {([
                [L('Stranka', 'Client'), izid.opisStranke],
                [L('Panoga', 'Industry'), izid.panoga],
                [L('Ciljna publika', 'Target audience'), izid.ciljnaSkupina],
                [L('Dizajn želje', 'Design direction'), izid.dizajnZelje],
                [L('Ton / glas', 'Tone of voice'), izid.voice],
                [L('Konkurenca', 'Competitors'), izid.konkurenca],
              ] as [string, string | undefined][]).filter(([, v]) => v && v.trim()).map(([k, v]) => (
                <div key={k} className="ba-vrstica"><b>{k}</b><p>{v}</p></div>
              ))}
              {(izid.cilji || []).length > 0 && (
                <div className="ba-vrstica">
                  <b>{L('Cilji', 'Goals')}</b>
                  <ul>{(izid.cilji || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
            </>}
          </DokPanel>
        </>
      )}

      <style jsx>{`
        .ba { max-width: 46rem; margin: 0 auto; padding: 2.2rem 1.2rem 4rem; display: flex; flex-direction: column; gap: 1rem; }
        .ba-nad { margin: 0 0 .15rem; font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .18em; color: var(--purple, oklch(60% .2 297)); }
        .ba-glava h1 { margin: 0; font: 500 clamp(1.45rem, 3.4vw, 2.05rem)/1.1 var(--font-serif), Georgia, serif; font-synthesis: none; letter-spacing: -.01em; color: var(--ink, #1a1a1a); text-wrap: balance; }
        .ba-pod { margin: .35rem 0 0; font: 500 .98rem/1.5 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); }
        .ba-vrsta { display: flex; flex-wrap: wrap; gap: .7rem; }

        /* Polje = mehko steklo, isto kot Pupin vnos. Brez belih skatel. */
        .ba-polje { flex: 1; min-width: 12rem; display: grid; gap: .35rem; font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .1em; text-transform: uppercase; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        .ba-ozko { flex: 0 0 12rem; }
        .ba-polje select, .ba-polje textarea { width: 100%; box-sizing: border-box; padding: .8rem .95rem; border: 1px solid rgba(255,255,255,.6); border-radius: 1.1rem;
          background: rgba(255,255,255,.55); backdrop-filter: blur(22px) saturate(1.45); -webkit-backdrop-filter: blur(22px) saturate(1.45);
          box-shadow: 0 8px 30px oklch(40% .08 300 / .1), inset 0 1px 0 rgba(255,255,255,.5);
          font: 500 1rem/1.5 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); text-transform: none; letter-spacing: normal; }
        .ba-polje textarea { resize: vertical; min-height: 5.4rem; }
        .ba-polje textarea::placeholder { color: color-mix(in oklch, var(--ink, #1a1a1a) 42%, transparent); }
        .ba-polje select:focus, .ba-polje textarea:focus { outline: none; border-color: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 55%, transparent);
          box-shadow: 0 0 0 3px color-mix(in oklch, var(--purple, oklch(66% .2 297)) 16%, transparent), 0 18px 50px oklch(40% .08 300 / .16); }

        .ba-akcije { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
        /* Glavni gumb je Pupina temna pilula z odsevom — isti kot »Zacni«. */
        .ba-glavni { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: .45rem; border: 0; border-radius: 999px; padding: .65rem 1.35rem;
          background: var(--ink, #2a2620); color: var(--paper, #faf7f2); font: 700 .85rem var(--font-sans), sans-serif; cursor: pointer;
          transition: transform .15s ease, box-shadow .2s ease; }
        .ba-glavni:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 9px 24px oklch(30% .05 300 / .32); }
        .ba-glavni::after { content: ''; position: absolute; top: 0; left: -160%; width: 90%; height: 100%; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.9) 50%, transparent 100%); transform: skewX(-18deg); transition: left .6s cubic-bezier(.19,1,.22,1); pointer-events: none; }
        .ba-glavni:hover:not(:disabled)::after { left: 160%; }
        .ba-glavni:disabled { opacity: .45; cursor: default; }
        /* Drugi gumb je stekleni mehurcek, ne bel gumb. */
        .ba-drugi { display: inline-flex; align-items: center; gap: .4rem; padding: .6rem 1.1rem; border: 1px solid rgba(255,255,255,.6); border-radius: 999px;
          background: color-mix(in oklch, oklch(72% .14 285) 14%, rgba(255,255,255,.6)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          font: 700 .8rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); text-decoration: none; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
        .ba-drugi:hover { transform: translateY(-1px); box-shadow: 0 8px 20px oklch(55% .12 285 / .2); }

        .ba-napaka { margin: 0; font: 600 .84rem var(--font-sans), sans-serif; color: #a4342a; }
        .ba-ok { font: 600 .82rem var(--font-sans), sans-serif; color: #2F5D50; }
        .ba-prazno { margin: 0; font: 500 .92rem/1.5 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); }

        /* Vrstice dokumenta so v panelu (bel papir), zato tu brez stekla. */
        .ba-vrstica { display: grid; grid-template-columns: 9rem 1fr; gap: 1rem; padding: .7rem 0; }
        .ba-vrstica + .ba-vrstica { border-top: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 8%, transparent); }
        .ba-vrstica b { font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .1em; text-transform: uppercase; color: color-mix(in oklch, var(--ink, #1a1a1a) 52%, transparent); }
        .ba-vrstica p, .ba-vrstica ul { margin: 0; font: 500 .95rem/1.6 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .ba-vrstica ul { padding-left: 1.1rem; display: flex; flex-direction: column; gap: .3rem; }
        @media (max-width: 640px) { .ba-vrstica { grid-template-columns: 1fr; gap: .2rem; } }
      `}</style>
    </div>
  );
}
