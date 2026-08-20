'use client';

/* NAPIŠI PITCH: isti tok kot BriefAgent, vendar brez izmišljene shrambe.
   Starš prek onSave pove, kam med poslovne dokumente projekta naj gre zapis. */
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { preberiProjekti, type Projekt } from '@/lib/projekti';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

export type PitchPolja = {
  naslov: string;
  problem: string;
  resitev: string;
  zakajMi: string;
  obseg: string;
  okvirnaCena: string;
  naslednjiKorak: string;
};

export type PitchAgentProps = {
  base?: string;
  onSave?: (pitch: PitchPolja, projekt: Projekt) => void | Promise<void>;
};

const NAVODILO = `Si izkušen kreativni strateg. Iz opisa pripravi kratek prodajni pitch.
Odgovori IZKLJUČNO z JSON objektom brez uvoda in brez oznak za kodo:
{"naslov":"…","problem":"…","resitev":"…","zakajMi":"…","obseg":"…","okvirnaCena":"…","naslednjiKorak":"…"}
Piši v slovenščini, konkretno in samozavestno. Ne izmišljaj si dejstev, referenc ali številk.
Okvirno ceno navedi le, če jo uporabnik poda; sicer napiši, da se določi po potrditvi obsega.`;

function izlusciJson(besedilo: string): PitchPolja | null {
  const zac = besedilo.indexOf('{');
  const kon = besedilo.lastIndexOf('}');
  if (zac < 0 || kon <= zac) return null;
  try {
    const v = JSON.parse(besedilo.slice(zac, kon + 1)) as Partial<PitchPolja>;
    const kljuci: Array<keyof PitchPolja> = ['naslov', 'problem', 'resitev', 'zakajMi', 'obseg', 'okvirnaCena', 'naslednjiKorak'];
    if (!ključiVeljavni(v, kljuci)) return null;
    return v as PitchPolja;
  } catch { return null; }
}

function ključiVeljavni(v: Partial<PitchPolja>, kljuci: Array<keyof PitchPolja>): boolean {
  return kljuci.every(k => typeof v[k] === 'string');
}

export default function PitchAgent({ base = '', onSave }: PitchAgentProps) {
  const locale = useLocale();
  const L = (sl: string, en: string) => locale === 'en' ? en : sl;
  const [projekti, setProjekti] = useState<Projekt[]>([]);
  const [projektId, setProjektId] = useState('');
  const [opis, setOpis] = useState('');
  const [izid, setIzid] = useState<PitchPolja | null>(null);
  const [dela, setDela] = useState(false);
  const [napaka, setNapaka] = useState('');
  const [shranjeno, setShranjeno] = useState(false);
  const [agenti, setAgenti] = useState<{ id: string; label: string }[]>([]);
  const [agent, setAgent] = useState('');
  const [orgId, setOrgId] = useState('');
  const projekt = useMemo(() => projekti.find(p => p.id === projektId), [projekti, projektId]);

  useEffect(() => { const p = preberiProjekti(); setProjekti(p); setProjektId(p[0]?.id || ''); }, []);
  useEffect(() => {
    let ziv = true;
    void (async () => {
      try {
        const ctx = await getOrganizationContext(); if (!ctx || !ziv) return;
        setOrgId(ctx.organizationId);
        const res = await fetch(`/api/ai/povezave?organizationId=${ctx.organizationId}`); if (!res.ok) return;
        const d = await res.json();
        setAgenti((d.connections || []).filter((c: { connection_type: string; provider: string; status: string }) => c.connection_type === 'api' && c.provider !== 'custom-mcp' && c.status !== 'disabled').map((c: { id: string; label: string }) => ({ id: c.id, label: c.label })));
      } catch { /* brez povezave piše Pupa */ }
    })();
    return () => { ziv = false; };
  }, []);

  const napisi = async () => {
    if (!opis.trim() || !projekt || dela) return;
    setDela(true); setNapaka(''); setShranjeno(false);
    const poziv = `${NAVODILO}\n\nProjekt: ${projekt.naslov}${projekt.strankaIme ? ` · ${projekt.strankaIme}` : ''}\n\nOpis uporabnice: ${opis.trim()}`;
    try {
      const res = agent && orgId
        ? await fetch('/api/ai/izvedi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId: orgId, connectionId: agent, prompt: poziv }) })
        : await fetch('/api/pupa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vprasanje: poziv, kontekst: '', zgodovina: [] }) });
      const data = await res.json();
      const polja = izlusciJson(String(data.odgovor || data.text || ''));
      if (!polja) throw new Error(String(data.napaka || data.error || 'oblika'));
      setIzid(polja);
    } catch { setNapaka(L('Pitcha ni bilo mogoče pripraviti. Poskusi znova.', 'The pitch could not be prepared. Try again.')); }
    finally { setDela(false); }
  };

  const shrani = async () => {
    if (!izid || !projekt) return;
    if (!onSave) { setNapaka(L('Shramba poslovnih dokumentov še ni povezana.', 'Business document storage is not connected yet.')); return; }
    try { await onSave(izid, projekt); setShranjeno(true); setNapaka(''); }
    catch { setNapaka(L('Pitcha ni bilo mogoče shraniti.', 'The pitch could not be saved.')); }
  };

  const polja: Array<[keyof PitchPolja, string]> = [['naslov', L('Naslov', 'Title')], ['problem', L('Problem stranke', 'Client problem')], ['resitev', L('Predlagana rešitev', 'Proposed solution')], ['zakajMi', L('Zakaj mi', 'Why us')], ['obseg', L('Obseg', 'Scope')], ['okvirnaCena', L('Okvirna cena', 'Indicative price')], ['naslednjiKorak', L('Naslednji korak', 'Next step')]];
  return <div className="pa">
    <header><p className="pa-nad">PITCH</p><h1>{L('Predstavi idejo jasno.', 'Present the idea clearly.')}</h1><p>{L('Pupa ali tvoj agent pripravi osnutek. Pred shranjevanjem ga lahko v celoti urediš.', 'Pupa or your agent drafts it. You can edit everything before saving.')}</p></header>
    {!projekti.length ? <p className="pa-prazno">{L('Najprej potrebuješ projekt.', 'You need a project first.')} <a href={`${base}/kalkulator/nov-projekt`}>{L('Ustvari projekt', 'Create project')}</a></p> : <>
      <div className="pa-vrsta"><label><span>{L('Projekt', 'Project')}</span><select value={projektId} onChange={e => { setProjektId(e.target.value); setIzid(null); }}><option value="">{L('Izberi projekt', 'Choose project')}</option>{projekti.map(p => <option key={p.id} value={p.id}>{p.naslov}{p.strankaIme ? ` · ${p.strankaIme}` : ''}</option>)}</select></label>{agenti.length > 0 && <label><span>{L('Kdo naj napiše', 'Who writes it')}</span><select value={agent} onChange={e => setAgent(e.target.value)}><option value="">Pupa</option>{agenti.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>}</div>
      <label><span>{L('Kaj ponujaš in komu?', 'What are you offering, and to whom?')}</span><textarea rows={5} value={opis} onChange={e => setOpis(e.target.value)} placeholder={L('Opiši priložnost, strankin problem, želeni obseg in morebitni cenovni okvir.', 'Describe the opportunity, client problem, scope, and any price range.')} /></label>
      <div className="pa-akcije"><button type="button" className="pa-glavni" onClick={napisi} disabled={!opis.trim() || !projekt || dela}>{dela ? L('Pišem …', 'Writing …') : L('Napiši pitch', 'Write pitch')}</button>{izid && <button type="button" className="pa-drugi" onClick={shrani}>{L('Shrani', 'Save')}</button>}</div>
      {napaka && <p className="pa-napaka" role="alert">{napaka}</p>}{shranjeno && <p className="pa-ok" role="status">{L('Pitch je shranjen.', 'Pitch saved.')}</p>}
      {izid && <section className="pa-izid">{polja.map(([k, oznaka]) => <label key={k}><span>{oznaka}</span>{k === 'naslov' ? <input value={izid[k]} onChange={e => setIzid({ ...izid, [k]: e.target.value })} /> : <textarea rows={3} value={izid[k]} onChange={e => setIzid({ ...izid, [k]: e.target.value })} />}</label>)}</section>}
    </>}
    <style jsx>{`.pa{max-width:46rem;margin:0 auto;padding:2.2rem 1.2rem 4rem;display:flex;flex-direction:column;gap:1rem}.pa header h1{margin:.2rem 0 .3rem;font:1.9rem var(--font-serif-flow,var(--font-serif)),serif;color:var(--ink,#111)}.pa header>p:last-child,.pa-prazno{margin:0;color:#6b655d;font-size:.88rem;line-height:1.5}.pa-nad{margin:0;color:#6b655d;font-size:.64rem;font-weight:800;letter-spacing:.18em}.pa-vrsta{display:flex;flex-wrap:wrap;gap:.7rem}.pa label{flex:1;min-width:12rem;display:grid;gap:.3rem;color:#6b655d;font-size:.68rem;font-weight:800}.pa select,.pa input,.pa textarea{width:100%;box-sizing:border-box;padding:.65rem .75rem;border:1px solid rgba(17,17,17,.16);border-radius:.7rem;background:#fff;color:var(--ink,#111);font:500 .88rem var(--font-sans),sans-serif;line-height:1.5}.pa textarea{resize:vertical}.pa-akcije{display:flex;gap:.5rem}.pa-akcije button{padding:.65rem 1.1rem;border-radius:999px;font:800 .82rem var(--font-sans),sans-serif;cursor:pointer}.pa-glavni{border:0;background:#6E4FA6;color:#fff}.pa-glavni:disabled{background:#6b655d;cursor:default}.pa-drugi{border:1px solid rgba(17,17,17,.18);background:#fff;color:var(--ink,#111)}.pa-napaka,.pa-ok{margin:0;font-size:.84rem;font-weight:700}.pa-napaka{color:#a4342a}.pa-ok{color:#2F5D50}.pa-izid{display:grid;gap:.75rem;padding:1rem;border:1px solid rgba(17,17,17,.1);border-radius:1rem;background:#fff}.pa-izid label{display:grid;grid-template-columns:9rem 1fr;align-items:start}.pa-izid label span{padding-top:.65rem}@media(max-width:640px){.pa-izid label{grid-template-columns:1fr}.pa-izid label span{padding-top:0}}`}</style>
  </div>;
}
