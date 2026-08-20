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
    setDela(true); setNapaka(''); setIzid(null); setShranjeno(false);
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
              <select value={projektId} onChange={e => { setProjektId(e.target.value); setIzid(null); setShranjeno(false); }}>
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
            {izid && !shranjeno && (
              <button type="button" className="ba-drugi" onClick={shraniNaProjekt}>
                {L('Shrani na projekt', 'Save to project')}
              </button>
            )}
            {shranjeno && projekt && (
              <a className="ba-drugi" href={`${base}/kalkulator/projekti?projekt=${projekt.id}`}>
                {L('Odpri projekt →', 'Open project →')}
              </a>
            )}
          </div>

          {napaka && <p className="ba-napaka" role="alert">{napaka}</p>}
          {shranjeno && <p className="ba-ok" role="status">{L('Brief je na projektu.', 'The brief is on the project.')}</p>}

          {izid && (
            <div className="ba-izid">
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
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .ba { max-width: 46rem; margin: 0 auto; padding: 2.2rem 1.2rem 4rem; display: flex; flex-direction: column; gap: 1rem; }
        .ba-nad { margin: 0; font-size: .64rem; font-weight: 800; letter-spacing: .18em; color: #8a8177; }
        .ba-glava h1 { margin: .2rem 0 .3rem; font-size: 1.9rem; font-family: var(--font-serif-flow, var(--font-serif)), serif; color: var(--ink, #111); }
        .ba-pod { margin: 0; font-size: .88rem; line-height: 1.5; color: #6b655d; }
        .ba-vrsta { display: flex; flex-wrap: wrap; gap: .7rem; }
        .ba-polje { flex: 1; min-width: 12rem; display: grid; gap: .3rem; font-size: .68rem; font-weight: 800; letter-spacing: .02em; color: #6b655d; }
        .ba-ozko { flex: 0 0 12rem; }
        .ba-polje select, .ba-polje textarea { width: 100%; padding: .6rem .7rem; border: 1px solid rgba(17,17,17,.14); border-radius: .7rem; background: #fff; font: 500 .88rem var(--font-sans), sans-serif; color: var(--ink, #111); }
        .ba-polje textarea { resize: vertical; line-height: 1.5; }
        .ba-akcije { display: flex; flex-wrap: wrap; gap: .5rem; }
        .ba-glavni, .ba-drugi { padding: .65rem 1.1rem; border-radius: 999px; font: 800 .82rem var(--font-sans), sans-serif; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
        .ba-glavni { border: 0; background: #6E4FA6; color: #fff; }
        .ba-glavni:disabled { opacity: .5; cursor: default; }
        .ba-drugi { border: 1px solid rgba(17,17,17,.16); background: #fff; color: var(--ink, #111); }
        .ba-napaka { margin: 0; font-size: .84rem; font-weight: 600; color: #a4342a; }
        .ba-ok { margin: 0; font-size: .84rem; font-weight: 600; color: #1a7f4b; }
        .ba-prazno { margin: 0; font-size: .9rem; color: #6b655d; }
        .ba-izid { display: flex; flex-direction: column; gap: .1rem; padding: 1rem 1.1rem; border: 1px solid rgba(17,17,17,.1); border-radius: 1rem; background: #fff; }
        .ba-vrstica { display: grid; grid-template-columns: 9rem 1fr; gap: .8rem; padding: .55rem 0; }
        .ba-vrstica + .ba-vrstica { border-top: 1px solid rgba(17,17,17,.07); }
        .ba-vrstica b { font-size: .74rem; font-weight: 700; color: #6b655d; }
        .ba-vrstica p, .ba-vrstica ul { margin: 0; font-size: .88rem; line-height: 1.5; color: var(--ink, #111); }
        .ba-vrstica ul { padding-left: 1.1rem; display: flex; flex-direction: column; gap: .25rem; }
        @media (max-width: 640px) { .ba-vrstica { grid-template-columns: 1fr; gap: .15rem; } }
      `}</style>
    </div>
  );
}
