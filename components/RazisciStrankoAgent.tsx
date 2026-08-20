'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import DokPanel from '@/components/DokPanel';
import IskalnikPodjetij from '@/components/IskalnikPodjetij';
import { preberiProjekti, shraniProjekt, type Projekt } from '@/lib/projekti';

export type RaziskavaStranke = {
  kajDela: string; njihoveStranke: string; predstavitev: string;
  kajPonuditi: string; vprasanja: string[];
};

const NAVODILO = `Pripravi kratko raziskavo podjetja pred prvim sestankom. Ne izmišljaj dejstev; kjer podatka nimaš, to jasno napiši. Vrni samo JSON:
{"kajDela":"…","njihoveStranke":"…","predstavitev":"…","kajPonuditi":"…","vprasanja":["…","…","…"]}
Polje vprasanja mora imeti natanko tri konkretna vprašanja za prvi sestanek.`;

const izlusci = (s: string): RaziskavaStranke | null => {
  try {
    const v = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)) as Partial<RaziskavaStranke>;
    return ['kajDela', 'njihoveStranke', 'predstavitev', 'kajPonuditi'].every(k => typeof v[k as keyof RaziskavaStranke] === 'string') && Array.isArray(v.vprasanja) && v.vprasanja.length === 3 ? v as RaziskavaStranke : null;
  } catch { return null; }
};

export default function RazisciStrankoAgent({ base = '' }: { base?: string }) {
  const jeEn = useLocale() === 'en';
  const L = (sl: string, en: string) => jeEn ? en : sl;
  const [projekti, setProjekti] = useState<Projekt[]>([]);
  const [projektId, setProjektId] = useState('');
  const [podjetje, setPodjetje] = useState('');
  const [izid, setIzid] = useState<RaziskavaStranke | null>(null);
  const [dela, setDela] = useState(false);
  const [napaka, setNapaka] = useState('');
  const projekt = useMemo(() => projekti.find(p => p.id === projektId), [projekti, projektId]);
  useEffect(() => { const p = preberiProjekti(); setProjekti(p); setProjektId(p[0]?.id || ''); setPodjetje(p[0]?.strankaIme || ''); }, []);

  const pripravi = async () => {
    if (!projekt || !podjetje.trim() || dela) return;
    setDela(true); setNapaka('');
    try {
      const res = await fetch('/api/pupa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vprasanje: `${NAVODILO}\n\nPodjetje: ${podjetje.trim()}\nProjekt: ${projekt.naslov}`, kontekst: '', zgodovina: [] }) });
      const data = await res.json();
      const rezultat = izlusci(String(data.odgovor || data.text || ''));
      if (!res.ok || !rezultat) throw new Error('oblika');
      setIzid(rezultat);
    } catch { setNapaka(L('Raziskave trenutno ni bilo mogoče pripraviti.', 'The research could not be prepared right now.')); }
    finally { setDela(false); }
  };
  const shrani = () => {
    if (!projekt || !izid) return;
    shraniProjekt({ ...projekt, raziskavaStranke: { ...izid, createdAt: new Date().toISOString() } });
    setNapaka(''); setIzid(null);
  };

  return <div className="rsa">
    <p className="rsa-nad">{L('RAZIŠČI STRANKO', 'RESEARCH A CLIENT')}</p><h1>{L('Na sestanek pripravljena.', 'Ready for the meeting.')}</h1>
    {!projekti.length ? <p>{L('Najprej potrebuješ projekt.', 'You need a project first.')} <a href={`${base}/kalkulator/nov-projekt`}>{L('Ustvari projekt', 'Create project')}</a></p> : <>
      <label>{L('Projekt', 'Project')}<select value={projektId} onChange={e => { const id = e.target.value; setProjektId(id); setPodjetje(projekti.find(p => p.id === id)?.strankaIme || ''); }}><option value="">{L('Izberi projekt', 'Choose project')}</option>{projekti.map(p => <option key={p.id} value={p.id}>{p.naslov}{p.strankaIme ? ` · ${p.strankaIme}` : ''}</option>)}</select></label>
      <label>{L('Podjetje', 'Company')}<IskalnikPodjetij vrednost={podjetje} naVrednost={setPodjetje} naIzbiro={p => setPodjetje(p.ime)} lastne={projekti.filter(p => p.strankaIme).map(p => ({ ime: p.strankaIme! }))} jeEn={jeEn} /></label>
      <button type="button" onClick={pripravi} disabled={!projekt || !podjetje.trim() || dela}>{dela ? L('Raziskujem …', 'Researching …') : L('Pripravi raziskavo', 'Prepare research')}</button>
      {napaka && <p role="alert" className="rsa-napaka">{napaka}</p>}
    </>}
    <DokPanel odprt={!!izid} naslov={podjetje} nadnaslov={L('Raziskava stranke', 'Client research')} podnaslov={projekt?.naslov} onZapri={() => setIzid(null)} jeEn={jeEn} dejanja={<button type="button" onClick={shrani}>{L('Shrani na projekt', 'Save to project')}</button>}>
      {izid && <div className="rsa-dok">{([['kajDela', L('Kaj podjetje dela', 'What the company does')], ['njihoveStranke', L('Njihove stranke', 'Their customers')], ['predstavitev', L('Kako se predstavljajo', 'How they present themselves')], ['kajPonuditi', L('Kaj bi jim lahko ponudili', 'What we could offer')]] as const).map(([k, o]) => <section key={k}><h2>{o}</h2><p>{izid[k]}</p></section>)}<section><h2>{L('Vprašanja za prvi sestanek', 'First-meeting questions')}</h2><ol>{izid.vprasanja.map((v, i) => <li key={i}>{v}</li>)}</ol></section></div>}
    </DokPanel>
    <style jsx>{`.rsa{max-width:42rem;margin:0 auto;padding:2rem 1.2rem;display:grid;gap:1rem}.rsa h1{margin:0;font:1.9rem var(--font-serif),serif}.rsa-nad{margin:0;color:#655f58;font-size:.65rem;font-weight:800;letter-spacing:.16em}.rsa label{display:grid;gap:.35rem;color:#655f58;font-size:.72rem;font-weight:800}.rsa select{padding:.7rem;border:1px solid rgba(17,17,17,.18);border-radius:.7rem;background:#fff}.rsa>button,.rsa :global(.dp-noga button){justify-self:start;border:0;border-radius:999px;padding:.7rem 1.1rem;background:#6E4FA6;color:#fff;font-weight:800;cursor:pointer}.rsa>button:disabled{background:#655f58}.rsa-napaka{color:#a4342a;font-weight:700}.rsa-dok section+section{margin-top:1.4rem}.rsa-dok h2{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#655f58}.rsa-dok p,.rsa-dok li{line-height:1.6}`}</style>
  </div>;
}
