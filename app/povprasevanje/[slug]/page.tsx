'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { VPRASANJA_PO_STORITVI } from '@/lib/vprasanjaPoStoritvi';

const IMENA: Record<string, string> = { logo: 'Logotip', cgp: 'Celostna grafična podoba', web: 'Spletna stran', kampanja: 'Kampanja', publikacija: 'Publikacija', embalaza: 'Embalaža', ilustracija: 'Ilustracija', direkcija: 'Kreativna direkcija', fotografija: 'Fotografija', copy: 'Besedila', interier: 'Interier', arhitektura: 'Arhitektura', razstava: 'Razstava', produktni: 'Produktno oblikovanje', uxui: 'UX/UI', aplikacija: 'Aplikacija', dizajnsistem: 'Design system', smm: 'Družbena omrežja', seo: 'SEO', email: 'E-mail marketing', pr: 'PR', video: 'Video', motion: 'Motion', render3d: '3D-render', strategija: 'Strategija' };

export default function JavnoPovprasevanje() {
  const { slug } = useParams<{ slug: string }>();
  const [studio, setStudio] = useState('');
  const [storitev, setStoritev] = useState('');
  const [ime, setIme] = useState('');
  const [email, setEmail] = useState('');
  const [odgovori, setOdgovori] = useState<Record<string, string | string[]>>({});
  const [status, setStatus] = useState('');
  const vprasanja = useMemo(() => VPRASANJA_PO_STORITVI[storitev] || [], [storitev]);

  useEffect(() => { void fetch(`/api/povprasevanje/${encodeURIComponent(slug)}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.napaka); setStudio(d.studio); }).catch(e => setStatus(e instanceof Error ? e.message : 'Obrazec ni na voljo.')); }, [slug]);
  useEffect(() => {
    const posljiVisino = () => window.parent !== window && window.parent.postMessage({ type: 'pinart-povprasevanje-height', slug, height: document.documentElement.scrollHeight }, '*');
    const observer = new ResizeObserver(posljiVisino); observer.observe(document.body); posljiVisino();
    return () => observer.disconnect();
  }, [slug]);
  const nastavi = (id: string, vrednost: string, vec = false) => setOdgovori(prej => vec ? { ...prej, [id]: (Array.isArray(prej[id]) ? prej[id] as string[] : []).includes(vrednost) ? (prej[id] as string[]).filter(v => v !== vrednost) : [...(Array.isArray(prej[id]) ? prej[id] as string[] : []), vrednost] } : { ...prej, [id]: vrednost });
  const oddaj = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setStatus('Pošiljam …');
    const website = String(new FormData(e.currentTarget).get('website') || '');
    try { const r = await fetch(`/api/povprasevanje/${encodeURIComponent(slug)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ime, email, storitev, odgovori, website }) }); const d = await r.json(); if (!r.ok) throw new Error(d.napaka); setStatus('Hvala — povpraševanje je poslano.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Pošiljanje ni uspelo.'); }
  };

  return <main className="pq"><header><p>POVPRAŠEVANJE</p><h1>{studio || 'Studio'}</h1><span>Opiši projekt. Studio bo v Flowu prejel tvoje odgovore in pripravil ponudbo.</span></header>
    <form onSubmit={oddaj}>
      <label>Ime in priimek<input required value={ime} onChange={e => setIme(e.target.value)} maxLength={160} /></label>
      <label>E-naslov<input required type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} /></label>
      <label>Vrsta storitve<select required value={storitev} onChange={e => { setStoritev(e.target.value); setOdgovori({}); }}><option value="">Izberi …</option>{Object.keys(VPRASANJA_PO_STORITVI).map(id => <option key={id} value={id}>{IMENA[id] || id}</option>)}</select></label>
      <label className="pq-med" aria-hidden>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {vprasanja.map(v => <fieldset key={v.id}><legend>{v.label}</legend>{v.izbire ? <div className="pq-izbire">{v.izbire.map(izbira => <label key={izbira}><input type={v.vec ? 'checkbox' : 'radio'} name={v.id} checked={v.vec ? (Array.isArray(odgovori[v.id]) && odgovori[v.id].includes(izbira)) : odgovori[v.id] === izbira} onChange={() => nastavi(v.id, izbira, v.vec)} /> <span>{izbira}</span></label>)}</div> : <textarea value={typeof odgovori[v.id] === 'string' ? odgovori[v.id] : ''} onChange={e => nastavi(v.id, e.target.value)} placeholder={v.placeholder} maxLength={2000} rows={3} />}{v.svoje && <input value={typeof odgovori[`${v.id}-drugo`] === 'string' ? odgovori[`${v.id}-drugo`] : ''} onChange={e => nastavi(`${v.id}-drugo`, e.target.value)} placeholder={v.svoje} maxLength={600} />}</fieldset>)}
      {storitev && <button type="submit">Pošlji povpraševanje</button>}{status && <p role="status" className={status.startsWith('Hvala') ? 'ok' : ''}>{status}</p>}
    </form>
    <style jsx>{`.pq{--v:#6E4FA6;max-width:760px;margin:auto;padding:clamp(24px,6vw,60px) 18px 70px;color:#29241f;font:16px/1.5 Arial,sans-serif}.pq header{margin-bottom:28px}.pq header p{margin:0;color:var(--v);font-size:12px;font-weight:800;letter-spacing:.14em}.pq h1{margin:.35rem 0;font:500 clamp(34px,8vw,58px)/1.05 Georgia,serif}.pq header span{color:#625b54}.pq form{display:grid;gap:18px}.pq form>label,.pq fieldset{display:grid;gap:7px}.pq input,.pq select,.pq textarea{box-sizing:border-box;width:100%;padding:12px;border:1px solid #8a8177;border-radius:8px;background:#fff;color:#29241f;font:inherit}.pq fieldset{margin:0;padding:18px;border:1px solid #d8d2cb;border-radius:12px}.pq legend{padding:0 8px;font-weight:700}.pq-izbire{display:grid;gap:8px}.pq-izbire label{display:flex;gap:9px;align-items:flex-start}.pq-izbire input{width:auto;margin-top:5px;accent-color:var(--v)}.pq button{justify-self:start;border:0;border-radius:999px;padding:13px 21px;background:var(--v);color:#fff;font-weight:800;cursor:pointer}.pq-med{position:absolute!important;left:-10000px!important}.pq [role=status]{color:#a4342a;font-weight:700}.pq [role=status].ok{color:#2F5D50}@media(max-width:520px){.pq fieldset{padding:14px}}`}</style>
  </main>;
}
