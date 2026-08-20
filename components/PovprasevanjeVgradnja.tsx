'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

export default function PovprasevanjeVgradnja() {
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { void fetch('/api/povprasevanje/nastavitve').then(r => r.json()).then(d => setSlug(d.slug || '')).catch(() => setStatus('Nastavitev ni bilo mogoče naložiti.')); }, []);
  const povezava = typeof window === 'undefined' || !slug ? '' : `${window.location.origin}/povprasevanje/${slug}`;
  const izsek = useMemo(() => povezava ? `<iframe id="pinart-povprasevanje" src="${povezava}" style="width:100%;height:780px;border:0" title="Povpraševanje"></iframe>\n<script>window.addEventListener('message',function(e){if(e.origin!==new URL('${povezava}').origin||!e.data||e.data.type!=='pinart-povprasevanje-height')return;document.getElementById('pinart-povprasevanje').style.height=e.data.height+'px';});</script>` : '', [povezava]);
  const shrani = async (e: FormEvent) => { e.preventDefault(); setStatus('Shranjujem …'); const r = await fetch('/api/povprasevanje/nastavitve', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug }) }); const d = await r.json(); setStatus(r.ok ? 'Shranjeno.' : d.napaka || 'Shranjevanje ni uspelo.'); };
  return <section style={{ display: 'grid', gap: 16 }}><div><h2>Obrazec za povpraševanje</h2><p>Deljiva povezava ali obrazec za vgradnjo na tvojo spletno stran.</p></div><form onSubmit={shrani} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><label style={{ display: 'grid', gap: 5, flex: '1 1 260px' }}>Oznaka studia<input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="moj-studio" /></label><button type="submit">Shrani</button></form>{status && <p role="status">{status}</p>}{povezava && <><label style={{ display: 'grid', gap: 5 }}>Deljiva povezava<input readOnly value={povezava} /></label><label style={{ display: 'grid', gap: 5 }}>Iframe izsek<textarea readOnly value={izsek} rows={7} /></label><button type="button" onClick={() => void navigator.clipboard?.writeText(izsek)}>Kopiraj iframe</button></>}</section>;
}
