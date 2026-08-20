'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import DokPanel from '@/components/DokPanel';
import { preberiProjekti, shraniProjekt, type Projekt } from '@/lib/projekti';

export type PregledKonkurence = { panoga: string; konkurenti: Array<{ ime: string; pozicioniranje: string; poudarki: string }>; vrzel: string };
const NAVODILO = `Primerjaj navedene konkurente v panogi. Ne izmišljaj podatkov ali cen. Če česa ne veš, to jasno napiši; cen sploh ne navajaj brez preverljivega podatka. Vrni samo JSON:
{"panoga":"…","konkurenti":[{"ime":"…","pozicioniranje":"…","poudarki":"…"}],"vrzel":"…"}`;
const izlusci = (s: string): PregledKonkurence | null => { try { const v = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)) as PregledKonkurence; return typeof v.panoga === 'string' && typeof v.vrzel === 'string' && Array.isArray(v.konkurenti) && v.konkurenti.every(k => typeof k.ime === 'string' && typeof k.pozicioniranje === 'string' && typeof k.poudarki === 'string') ? v : null; } catch { return null; } };

export default function PreglejKonkurencoAgent({ base = '' }: { base?: string }) {
  const jeEn = useLocale() === 'en'; const L = (sl: string, en: string) => jeEn ? en : sl;
  const [projekti, setProjekti] = useState<Projekt[]>([]); const [projektId, setProjektId] = useState('');
  const [panoga, setPanoga] = useState(''); const [imena, setImena] = useState('');
  const [izid, setIzid] = useState<PregledKonkurence | null>(null); const [dela, setDela] = useState(false); const [napaka, setNapaka] = useState('');
  const projekt = useMemo(() => projekti.find(p => p.id === projektId), [projekti, projektId]);
  useEffect(() => { const p = preberiProjekti(); setProjekti(p); setProjektId(p[0]?.id || ''); setPanoga(p[0]?.panoga || ''); setImena(p[0]?.konkurenca || ''); }, []);
  const pripravi = async () => { if (!projekt || !panoga.trim() || !imena.trim() || dela) return; setDela(true); setNapaka(''); try { const res = await fetch('/api/pupa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vprasanje: `${NAVODILO}\n\nPanoga: ${panoga.trim()}\nKonkurenti: ${imena.trim()}\nProjekt: ${projekt.naslov}`, kontekst: '', zgodovina: [] }) }); const d = await res.json(); const v = izlusci(String(d.odgovor || d.text || '')); if (!res.ok || !v) throw new Error('oblika'); setIzid(v); } catch { setNapaka(L('Pregleda trenutno ni bilo mogoče pripraviti.', 'The review could not be prepared right now.')); } finally { setDela(false); } };
  const shrani = () => { if (!projekt || !izid) return; shraniProjekt({ ...projekt, pregledKonkurence: { ...izid, createdAt: new Date().toISOString() } }); setIzid(null); };
  return <div className="pka"><p className="pka-nad">{L('PREGLEJ KONKURENCO', 'REVIEW COMPETITORS')}</p><h1>{L('Poišči prostor, ki ga drugi puščajo.', 'Find the space others leave open.')}</h1>
    {!projekti.length ? <p>{L('Najprej potrebuješ projekt.', 'You need a project first.')} <a href={`${base}/kalkulator/nov-projekt`}>{L('Ustvari projekt', 'Create project')}</a></p> : <>
      <label>{L('Projekt', 'Project')}<select value={projektId} onChange={e => { const p = projekti.find(x => x.id === e.target.value); setProjektId(e.target.value); setPanoga(p?.panoga || ''); setImena(p?.konkurenca || ''); }}><option value="">{L('Izberi projekt', 'Choose project')}</option>{projekti.map(p => <option key={p.id} value={p.id}>{p.naslov}</option>)}</select></label>
      <label>{L('Panoga', 'Industry')}<input value={panoga} onChange={e => setPanoga(e.target.value)} /></label><label>{L('Imena konkurentov', 'Competitor names')}<textarea rows={4} value={imena} onChange={e => setImena(e.target.value)} placeholder={L('Vsako ime v novo vrstico ali ločeno z vejico.', 'One name per line or separated by commas.')} /></label>
      <button type="button" onClick={pripravi} disabled={!projekt || !panoga.trim() || !imena.trim() || dela}>{dela ? L('Primerjam …', 'Comparing …') : L('Pripravi pregled', 'Prepare review')}</button>{napaka && <p role="alert" className="pka-napaka">{napaka}</p>}
    </>}
    <DokPanel odprt={!!izid} naslov={L('Pregled konkurence', 'Competitor review')} nadnaslov={projekt?.naslov} podnaslov={panoga} onZapri={() => setIzid(null)} jeEn={jeEn} dejanja={<button type="button" onClick={shrani}>{L('Shrani na projekt', 'Save to project')}</button>}>{izid && <div className="pka-dok">{izid.konkurenti.map((k, i) => <section key={`${k.ime}-${i}`}><h2>{k.ime}</h2><p><b>{L('Pozicioniranje:', 'Positioning:')}</b> {k.pozicioniranje}</p><p><b>{L('Poudarki:', 'Emphasis:')}</b> {k.poudarki}</p></section>)}<section><h2>{L('Vrzel', 'Gap')}</h2><p>{izid.vrzel}</p></section></div>}</DokPanel>
    <style jsx>{`.pka{max-width:42rem;margin:0 auto;padding:2rem 1.2rem;display:grid;gap:1rem}.pka h1{margin:0;font:1.9rem var(--font-serif),serif}.pka-nad{margin:0;color:#655f58;font-size:.65rem;font-weight:800;letter-spacing:.16em}.pka label{display:grid;gap:.35rem;color:#655f58;font-size:.72rem;font-weight:800}.pka select,.pka input,.pka textarea{padding:.7rem;border:1px solid rgba(17,17,17,.18);border-radius:.7rem;background:#fff;font:inherit}.pka>button,.pka :global(.dp-noga button){justify-self:start;border:0;border-radius:999px;padding:.7rem 1.1rem;background:#6E4FA6;color:#fff;font-weight:800;cursor:pointer}.pka>button:disabled{background:#655f58}.pka-napaka{color:#a4342a;font-weight:700}.pka-dok section+section{margin-top:1.4rem}.pka-dok h2{font-size:.78rem;color:#655f58}.pka-dok p{line-height:1.6}`}</style>
  </div>;
}
