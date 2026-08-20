'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { preberiProjekti, shraniProjekt, type Projekt } from '@/lib/projekti';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

export type SwotPolja = { prednosti: string; slabosti: string; priloznosti: string; nevarnosti: string };
export type SwotAgentProps = { base?: string; onSave?: (swot: SwotPolja, projekt: Projekt) => void | Promise<void> };

const NAVODILO = `Si izkušen poslovni strateg. Iz vsakdanjega opisa pripravi jedrnato SWOT analizo.
Odgovori IZKLJUČNO z JSON objektom brez uvoda in brez oznak za kodo:
{"prednosti":"…","slabosti":"…","priloznosti":"…","nevarnosti":"…"}
Piši v slovenščini, konkretno in uporabno. Ne izmišljaj si dejstev. Vsako polje naj vsebuje kratke alineje.`;

const izlusci = (besedilo: string): SwotPolja | null => {
  const zac = besedilo.indexOf('{'); const kon = besedilo.lastIndexOf('}');
  if (zac < 0 || kon <= zac) return null;
  try { const v = JSON.parse(besedilo.slice(zac, kon + 1)) as Partial<SwotPolja>; return ['prednosti', 'slabosti', 'priloznosti', 'nevarnosti'].every(k => typeof v[k as keyof SwotPolja] === 'string') ? v as SwotPolja : null; } catch { return null; }
};

export default function SwotAgent({ base = '', onSave }: SwotAgentProps) {
  const locale = useLocale(); const L = (sl: string, en: string) => locale === 'en' ? en : sl;
  const [projekti, setProjekti] = useState<Projekt[]>([]); const [projektId, setProjektId] = useState('');
  const [opis, setOpis] = useState(''); const [izid, setIzid] = useState<SwotPolja | null>(null);
  const [dela, setDela] = useState(false); const [napaka, setNapaka] = useState(''); const [shranjeno, setShranjeno] = useState(false);
  const [agenti, setAgenti] = useState<{ id: string; label: string }[]>([]); const [agent, setAgent] = useState(''); const [orgId, setOrgId] = useState('');
  const [pot, setPot] = useState<'ai' | 'rocno'>('ai');
  const projekt = useMemo(() => projekti.find(p => p.id === projektId), [projekti, projektId]);
  useEffect(() => { const p = preberiProjekti(); setProjekti(p); setProjektId(p[0]?.id || ''); }, []);
  useEffect(() => { let ziv = true; void (async () => { try { const ctx = await getOrganizationContext(); if (!ctx || !ziv) return; setOrgId(ctx.organizationId); const r = await fetch(`/api/ai/povezave?organizationId=${ctx.organizationId}`); if (!r.ok) return; const d = await r.json(); setAgenti((d.connections || []).filter((c: { connection_type: string; provider: string; status: string }) => c.connection_type === 'api' && c.provider !== 'custom-mcp' && c.status !== 'disabled').map((c: { id: string; label: string }) => ({ id: c.id, label: c.label }))); } catch { /* Pupa ostane privzeta. */ } })(); return () => { ziv = false; }; }, []);

  const napisi = async () => {
    if (!opis.trim() || !projekt || dela) return; setDela(true); setNapaka(''); setShranjeno(false);
    const poziv = `${NAVODILO}\n\nProjekt: ${projekt.naslov}${projekt.strankaIme ? ` · ${projekt.strankaIme}` : ''}\n\nO čem gre in kdo je stranka: ${opis.trim()}`;
    try { const r = agent && orgId ? await fetch('/api/ai/izvedi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId: orgId, connectionId: agent, prompt: poziv }) }) : await fetch('/api/pupa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vprasanje: poziv, kontekst: '', zgodovina: [] }) }); const d = await r.json(); const polja = izlusci(String(d.odgovor || d.text || '')); if (!polja) throw new Error('oblika'); setIzid(polja); }
    catch { setNapaka(L('Pupa trenutno ni dosegljiva — lahko izpolniš sama.', 'Pupa is currently unavailable — you can fill it in yourself.')); setPot('rocno'); setIzid(v => v || { prednosti: '', slabosti: '', priloznosti: '', nevarnosti: '' }); } finally { setDela(false); }
  };
  const shrani = async () => { if (!izid || !projekt) return; try { if (onSave) await onSave(izid, projekt); else shraniProjekt({ ...projekt, swot: izid }); setShranjeno(true); setNapaka(''); } catch { setNapaka(L('SWOT analize ni bilo mogoče shraniti.', 'The SWOT analysis could not be saved.')); } };
  const polja: Array<[keyof SwotPolja, string]> = [['prednosti', L('Prednosti', 'Strengths')], ['slabosti', L('Slabosti', 'Weaknesses')], ['priloznosti', L('Priložnosti', 'Opportunities')], ['nevarnosti', L('Nevarnosti', 'Threats')]];
  return <div className="sa"><header><p>SWOT</p><h1>{L('Poglej posel z vseh strani.', 'See the business from every side.')}</h1><span>{L('Povej po domače, o čem gre in kdo je stranka. Pupa pripravi analizo, ti jo pregledaš in shraniš.', 'Describe the work and client in everyday language. Pupa drafts the analysis; you review and save it.')}</span></header>{!projekti.length ? <p>{L('Najprej potrebuješ projekt.', 'You need a project first.')} <a href={`${base}/kalkulator/nov-projekt`}>{L('Ustvari projekt', 'Create project')}</a></p> : <><div className="sa-vrsta"><label>{L('Projekt', 'Project')}<select value={projektId} onChange={e => { setProjektId(e.target.value); setIzid(null); }}><option value="">{L('Izberi projekt', 'Choose project')}</option>{projekti.map(p => <option key={p.id} value={p.id}>{p.naslov}{p.strankaIme ? ` · ${p.strankaIme}` : ''}</option>)}</select></label>{agenti.length > 0 && <label>{L('Kdo naj napiše', 'Who writes it')}<select value={agent} onChange={e => setAgent(e.target.value)}><option value="">Pupa</option>{agenti.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>}</div><label>{L('O čem gre in kdo je stranka?', 'What is it about, and who is the client?')}<textarea rows={5} value={opis} onChange={e => setOpis(e.target.value)} placeholder={L('Npr. majhen družinski hotel želi privabiti več gostov zunaj glavne sezone …', 'E.g. a small family hotel wants more guests outside the high season …')} /></label><div className="sa-akcije"><button type="button" onClick={napisi} disabled={!opis.trim() || !projekt || dela}>{dela ? L('Pripravljam …', 'Preparing …') : L('Pripravi SWOT', 'Prepare SWOT')}</button>{izid && <button type="button" className="drugi" onClick={shrani}>{L('Shrani', 'Save')}</button>}</div>{napaka && <p role="alert" className="napaka">{napaka}</p>}{shranjeno && <p role="status" className="ok">{L('SWOT je shranjen na projektu.', 'SWOT saved to the project.')}</p>}{izid && <section className="sa-mreza">{polja.map(([k, oznaka]) => <label key={k}><strong>{oznaka}</strong><textarea rows={7} value={izid[k]} onChange={e => setIzid({ ...izid, [k]: e.target.value })} /></label>)}</section>}</>}
  <style jsx>{`.sa{max-width:54rem;margin:0 auto;padding:2.2rem 1.2rem 4rem;display:grid;gap:1rem;color:var(--ink,#111)}.sa header p{margin:0;color:#6b655d;font-size:.64rem;font-weight:800;letter-spacing:.18em}.sa h1{margin:.2rem 0;font:1.9rem var(--font-serif-flow),serif}.sa header span{color:#6b655d;font-size:.88rem}.sa-vrsta{display:flex;gap:.7rem;flex-wrap:wrap}.sa label{display:grid;gap:.35rem;flex:1;min-width:12rem;color:#6b655d;font-size:.72rem;font-weight:800}.sa select,.sa textarea{width:100%;box-sizing:border-box;padding:.7rem;border:1px solid rgba(17,17,17,.18);border-radius:.75rem;background:#fff;color:#111;font:500 .9rem/1.5 var(--font-sans),sans-serif}.sa-akcije{display:flex;gap:.5rem}.sa button{border:0;border-radius:999px;padding:.7rem 1.1rem;background:#6E4FA6;color:#fff;font-weight:800;cursor:pointer}.sa button.drugi{border:1px solid rgba(17,17,17,.18);background:#fff;color:#111}.sa button:disabled{background:#6b655d;cursor:default}.sa-mreza{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}.sa-mreza label{min-width:0;padding:1rem;border:1px solid rgba(17,17,17,.1);border-radius:1rem;background:#fff}.sa-mreza strong{color:#111;text-transform:uppercase;letter-spacing:.1em}.napaka{color:#a4342a}.ok{color:#2F5D50}@media(max-width:650px){.sa-mreza{grid-template-columns:1fr}}@media print{.sa>header,.sa-vrsta,.sa>label,.sa-akcije,.napaka,.ok{display:none}.sa-mreza{display:grid;grid-template-columns:1fr 1fr}.sa-mreza textarea{border:0;resize:none;overflow:visible}}`}</style></div>;
}
