'use client';

/* Komunikacija — vpogled »klepeti deljeni z mano«. Deluje za KATEREGA KOLI
   prijavljenega uporabnika (tudi povabljenega sodelavca), ker bere niti prek RLS
   (mojeNiti). Levi stolpec = seznam niti; desni = klepet (bubbli + vnos + realtime).
   To je vstopna tocka, ki je manjkala, da sodelavec odpre skupno nit s svoje strani. */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PaperPlaneRight, ChatsCircle, Paperclip, EnvelopeSimple, ChatCircle, MagnifyingGlass, Tray, NotePencil, Trash, FolderSimplePlus, Tag, CheckSquare, Sparkle, Printer, Star, ArrowBendUpLeft, ArrowBendUpRight, Smiley, Plus, UserPlus, List, FunnelSimple } from '@phosphor-icons/react';
import { mojeNiti, mojEmail, nalozSporocila, posljiSporocilo, narociSporocila, dodajUdelezenca, type OblacnaNit, type OblacnoSporocilo } from '@/lib/klepetCloud';
import { usePredogled } from '@/lib/predogled';
import { preberiVsePoste, premakniPosto, nastaviOznakePoste, dodajPosto, oznaciPostoPrebrano, type PostaVnos } from '@/lib/postaDnevnik';
import { oznaciNitVideno, javiSpremembo } from '@/lib/komObvestila';
import { preberiNaloge, shraniNaloge, type Naloga } from '@/lib/naloge';
import { posljiMail } from '@/lib/posta';
import { loadFlowData } from '@/lib/pinartFlowStore';
import Toast from '@/components/Toast';

/* Demo pošta (»polno poslovanje«) — projektni maili na enem mestu, brez šuma. */
const DEMO_POSTA: PostaVnos[] = [
  { id: 'dp1', projectId: 'demo-portal', smer: 'prejeto', prejemniki: ['info@rokusklett.si'], zadeva: 'Re: Prenova portala — potrditev obsega', datum: '2026-08-04T08:40:00Z', telo: 'Pozdravljeni,\n\nhvala za predlog. Obseg nam ustreza, lahko nadaljujete. Veselimo se sodelovanja.\n\nLep pozdrav,\nRokus Klett' },
  { id: 'dp2', projectId: 'demo-portal', smer: 'poslano', prejemniki: ['info@rokusklett.si'], zadeva: 'Prenova portala — osnutek za pregled', datum: '2026-08-02T12:10:00Z', telo: 'Pozdravljeni,\n\nv prilogi je prvi osnutek. Prosim za komentarje do konca tedna.\n\nLep pozdrav' },
  { id: 'dp3', projectId: 'demo-portal', smer: 'poslano', prejemniki: ['ana@rokusklett.si', 'racuni@rokusklett.si'], zadeva: 'Pogodba o sodelovanju', datum: '2026-07-27T09:00:00Z', telo: 'Pozdravljeni,\n\nv prilogi pošiljam pogodbo v pregled in podpis.\n\nLep pozdrav' },
  { id: 'dp4', projectId: 'demo-portal', smer: 'prejeto', prejemniki: ['ana@rokusklett.si'], zadeva: 'Gradiva in dostopi', datum: '2026-07-25T15:30:00Z', telo: 'Pozdravljeni,\n\npošiljam dostope do mape z gradivi in obstoječimi datotekami.\n\nLep pozdrav' },
];

/* Demo klepeti za način »polno poslovanje« (predogled) — da vidiš, kako izgleda polno. */
const DEMO_EMAIL = 'tina@pinart.si';
const DEMO_NITI: OblacnaNit[] = [
  { threadId: 'demo-k-1', projectId: 'demo-portal', udelezenci: [{ email: DEMO_EMAIL, ime: 'Tina' }, { email: 'luka.mancini@gmail.com', ime: 'Luka Beg' }] },
  { threadId: 'demo-k-2', projectId: 'demo-portal', udelezenci: [{ email: DEMO_EMAIL, ime: 'Tina' }, { email: 'eva.kralj@studio.si', ime: 'Eva Kralj' }, { email: 'marko.zupan@studio.si', ime: 'Marko Zupan' }] },
];
const DEMO_SPOROCILA: Record<string, OblacnoSporocilo[]> = {
  'demo-k-1': [
    { id: 'd1', threadId: 'demo-k-1', body: 'Živjo Luka, ti delim mail stranke — poglej obseg.', senderEmail: DEMO_EMAIL, senderName: 'Tina', odMaila: 'Re: Prenova portala — potrditev obsega', createdAt: '2026-08-04T09:12:00Z' },
    { id: 'd2', threadId: 'demo-k-1', body: 'Super, obseg je jasen. Jaz prevzamem wireframe ključnih strani.', senderEmail: 'luka.mancini@gmail.com', senderName: 'Luka Beg', createdAt: '2026-08-04T09:20:00Z' },
    { id: 'd3', threadId: 'demo-k-1', body: 'Odlično. Do srede rabim prvi osnutek navigacije. 🙌', senderEmail: DEMO_EMAIL, senderName: 'Tina', createdAt: '2026-08-04T09:22:00Z' },
    { id: 'd4', threadId: 'demo-k-1', body: 'Velja. Bom sproti torku poslal Figmo.', senderEmail: 'luka.mancini@gmail.com', senderName: 'Luka Beg', createdAt: '2026-08-04T09:25:00Z' },
  ],
  'demo-k-2': [
    { id: 'd5', threadId: 'demo-k-2', body: 'Ekipa, dostopi do gradiv so v Drive mapi. Eva, ti prevzameš tipografijo?', senderEmail: DEMO_EMAIL, senderName: 'Tina', createdAt: '2026-08-05T11:02:00Z' },
    { id: 'd6', threadId: 'demo-k-2', body: 'Ja, začnem danes. Marko, rabim tvoje ikone za sistem.', senderEmail: 'eva.kralj@studio.si', senderName: 'Eva Kralj', createdAt: '2026-08-05T11:10:00Z' },
    { id: 'd7', threadId: 'demo-k-2', body: 'Pošljem set do jutri zjutraj.', senderEmail: 'marko.zupan@studio.si', senderName: 'Marko Zupan', createdAt: '2026-08-05T11:14:00Z' },
  ],
};

export default function KomunikacijaWorkspace({ jeEn = false }: { jeEn?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [nacin] = usePredogled();
  /* demo ostane 'nacin !== mine' (samo-za-ogled: gating pisanja v pravo shrambo).
     prazno = nov uporabnik: nobenih demo mailov/klepetov — vse prazno. */
  const prazno = nacin === 'empty';
  const demo = nacin !== 'mine';
  const [email, setEmail] = useState<string | null>(null);
  const [niti, setNiti] = useState<OblacnaNit[]>([]);
  const [izbrana, setIzbrana] = useState<string | null>(null);
  const [sporocila, setSporocila] = useState<OblacnoSporocilo[]>([]);
  const [vnos, setVnos] = useState('');
  const [nalaganje, setNalaganje] = useState(true);
  const [zavihek, setZavihek] = useState<'klepet' | 'posta'>('posta');
  const [posta, setPosta] = useState<PostaVnos[]>([]);
  const [mapa, setMapa] = useState<'prejeto' | 'poslano' | 'osnutki' | 'kos'>('prejeto');
  const [mapeOdprt, setMapeOdprt] = useState(false);
  const [iskOdprt, setIskOdprt] = useState(false);
  const [filterOdprt, setFilterOdprt] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  /* Ko je odprta Komunikacija (z mobilno nogo), skrij Pupo, da ne prekriva noge */
  useEffect(() => { document.body.classList.add('km-noga-on'); return () => document.body.classList.remove('km-noga-on'); }, []);
  /* Ko je odprt drawer map ali slide-up prejemnikov, skrij Pupo (da ne prekriva menija) */
  useEffect(() => {
    document.body.classList.toggle('pw-sheet-open', mapeOdprt || filterOdprt);
    return () => document.body.classList.remove('pw-sheet-open');
  }, [mapeOdprt, filterOdprt]);
  const [postaIsk, setPostaIsk] = useState('');
  const [beriMail, setBeriMail] = useState<PostaVnos | null>(null);
  const [postaStran, setPostaStran] = useState(1);
  const [projMapa, setProjMapa] = useState<Record<string, string>>({});
  const projIme = (id?: string) => (id && projMapa[id]) || '';
  /* deterministična barva projekta (da jih v seznamu ločiš) */
  const projBarva = (id?: string) => { const h = (id ? [...id].reduce((a, c) => a + c.charCodeAt(0), 0) : 0) % 360; return `oklch(62% .17 ${h})`; };
  const [postaOseba, setPostaOseba] = useState('');   /* filter po prejemniku */
  const prejemnikiVsi = Array.from(new Set(posta.flatMap(v => v.prejemniki))).sort();
  const [premakniOdprt, setPremakniOdprt] = useState(false);
  const [oznakaOdprt, setOznakaOdprt] = useState(false);
  const [oznakaVnos, setOznakaVnos] = useState('');
  const [aiOdprt, setAiOdprt] = useState(false);
  const [aiNalaganje, setAiNalaganje] = useState(false);
  const [aiPovzetek, setAiPovzetek] = useState('');
  const [aiOdgovor, setAiOdgovor] = useState('');
  const [pisiVrsta, setPisiVrsta] = useState<false | 'odgovor' | 'posreduj'>(false);
  const [pisiZa, setPisiZa] = useState('');
  const [pisiZadeva, setPisiZadeva] = useState('');
  const [pisiTelo, setPisiTelo] = useState('');
  const [pisiStatus, setPisiStatus] = useState('');
  const [pisiPosiljam, setPisiPosiljam] = useState(false);
  const [toast, setToast] = useState('');
  const [vabiOdprt, setVabiOdprt] = useState(false);
  const [vabiEmail, setVabiEmail] = useState('');
  const [vabiTece, setVabiTece] = useState(false);
  useEffect(() => {
    if (prazno) { setPosta([]); setProjMapa({}); return; }
    const vsi = demo ? DEMO_POSTA : preberiVsePoste();
    setPosta([...vsi].sort((a, b) => b.datum.localeCompare(a.datum)));
    if (demo) { setProjMapa({ 'demo-portal': 'Prenova portala · Rokus Klett' }); return; }
    try {
      const m: Record<string, string> = {};
      loadFlowData().offers.forEach(o => { m[o.id] = `${o.title || 'Projekt'}${o.client ? ' · ' + o.client : ''}`; });
      setProjMapa(m);
    } catch { setProjMapa({}); }
  }, [demo, prazno]);
  const odjavaRef = useRef<(() => void) | null>(null);
  const dnoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prazno) { setEmail(null); setNiti([]); setIzbrana(null); setSporocila([]); setNalaganje(false); return; }
    if (demo) { setEmail(DEMO_EMAIL); setNiti(DEMO_NITI); setIzbrana(DEMO_NITI[0].threadId); setNalaganje(false); return; }
    let ustavljeno = false;
    void (async () => {
      const [e, n] = await Promise.all([mojEmail(), mojeNiti()]);
      if (ustavljeno) return;
      setEmail(e);
      setNiti(n);
      if (n[0]) setIzbrana(n[0].threadId);
      setNalaganje(false);
    })();
    return () => { ustavljeno = true; };
  }, [demo, prazno]);

  useEffect(() => {
    odjavaRef.current?.(); odjavaRef.current = null;
    if (!izbrana) { setSporocila([]); return; }
    if (demo) { setSporocila(DEMO_SPOROCILA[izbrana] || []); return; }
    let ustavljeno = false;
    void (async () => {
      const msgs = await nalozSporocila(izbrana);
      if (!ustavljeno) { setSporocila(msgs); if (msgs.length) { oznaciNitVideno(izbrana, msgs[msgs.length - 1].createdAt); } }
    })();
    odjavaRef.current = narociSporocila(izbrana, m => { setSporocila(prev => (prev.some(p => p.id === m.id) ? prev : [...prev, m])); if (izbrana) oznaciNitVideno(izbrana, m.createdAt); });
    return () => { ustavljeno = true; odjavaRef.current?.(); odjavaRef.current = null; };
  }, [izbrana, demo]);

  useEffect(() => { dnoRef.current?.scrollIntoView({ block: 'end' }); }, [sporocila]);

  const poslji = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = vnos.trim();
    if (!t || !izbrana) return;
    setVnos('');
    if (demo) {
      setSporocila(prev => [...prev, { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `d-${prev.length}`), threadId: izbrana, body: t, senderEmail: DEMO_EMAIL, senderName: 'Tina', createdAt: new Date().toISOString() }]);
      return;
    }
    await posljiSporocilo(izbrana, t);
  };

  const drugi = (n: OblacnaNit) => n.udelezenci.filter(u => u.email !== (email || '')).map(u => u.ime || u.email);
  const nazivNiti = (n: OblacnaNit) => { const d = drugi(n); return d.length ? d.join(', ') : L('Klepet', 'Chat'); };
  const iniciala = (s: string) => (s || '?').trim().charAt(0).toUpperCase();
  const datum = (iso: string) => { try { return new Date(iso).toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI'); } catch { return ''; } };
  const izbranaNit = niti.find(n => n.threadId === izbrana) || null;

  /* ── funkcije na branju pošte (uporabijo skupne knjižnice) ── */
  const posodobiMail = (id: string, sprem: Partial<PostaVnos>) => { setPosta(prev => prev.map(v => v.id === id ? { ...v, ...sprem } : v)); setBeriMail(m => m && m.id === id ? { ...m, ...sprem } : m); };
  const toggleZvezda = (m: PostaVnos) => posodobiMail(m.id, { zvezda: !m.zvezda });
  const premakniMail = (m: PostaVnos, pid: string) => { if (!demo) premakniPosto(m.id, pid); posodobiMail(m.id, { projectId: pid }); setPremakniOdprt(false); setToast(`${L('Premaknjeno v', 'Moved to')} ${projMapa[pid] || L('projekt', 'project')}.`); };
  const dodajOznako = (m: PostaVnos) => { const t = oznakaVnos.trim(); if (!t) return; const nove = [...(m.oznake || []), t]; if (!demo) nastaviOznakePoste(m.id, nove); posodobiMail(m.id, { oznake: nove }); setOznakaVnos(''); };
  const odstraniOznako = (m: PostaVnos, i: number) => { const nove = (m.oznake || []).filter((_, j) => j !== i); if (!demo) nastaviOznakePoste(m.id, nove); posodobiMail(m.id, { oznake: nove }); };
  const vNalogo = (m: PostaVnos) => { const opis = (m.telo || m.povzetek || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (!demo) { const nova: Naloga = { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `n-${Date.now()}`), naslov: m.zadeva || L('Naloga iz maila', 'Task from mail'), opis: opis || undefined, stolpec: 'todo', created: new Date().toISOString(), projectId: m.projectId }; shraniNaloge([...preberiNaloge(), nova]); } setToast(L('Naloga ustvarjena iz maila.', 'Task created from mail.')); };
  const pozeniAi = async (m: PostaVnos) => {
    setAiOdprt(true); setAiNalaganje(true); setAiPovzetek(''); setAiOdgovor('');
    const telo = (m.telo || m.povzetek || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const vpr = `${m.smer === 'poslano' ? 'To sporočilo sem poslala jaz.' : 'To sporočilo mi je poslala stranka.'} Zadeva: "${m.zadeva || ''}". Besedilo: """${telo}""".\n\nOdgovori TOČNO v obliki, brez uvoda:\nPOVZETEK: (1–2 povedi)\nODGOVOR: (kratek osnutek mojega odgovora brez pozdrava in podpisa)`;
    try { const r = await fetch('/api/pupa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vprasanje: vpr }) }); const d = await r.json(); const txt = String(d.odgovor || d.napaka || ''); const mp = txt.match(/POVZETEK:\s*([\s\S]*?)(?:\n\s*ODGOVOR:|$)/i); const mo = txt.match(/ODGOVOR:\s*([\s\S]*)$/i); setAiPovzetek((mp?.[1] || txt).trim()); setAiOdgovor((mo?.[1] || '').trim()); } catch { setAiPovzetek(L('Napaka pri klicu Pupe.', 'Pupa request failed.')); }
    setAiNalaganje(false);
  };
  const odpriPisanje = (m: PostaVnos, vrsta: 'odgovor' | 'posreduj') => { setPisiVrsta(vrsta); setPisiZa(vrsta === 'odgovor' ? (m.prejemniki[0] || '') : ''); setPisiZadeva(`${vrsta === 'odgovor' ? 'Re' : 'Fwd'}: ${(m.zadeva || '').replace(/^(Re|Fwd):\s*/i, '')}`); setPisiTelo(vrsta === 'posreduj' ? `\n\n--- ${L('Posredovano', 'Forwarded')} ---\n${(m.telo || m.povzetek || '').replace(/<[^>]+>/g, ' ')}` : ''); setPisiStatus(''); };
  const posljiPisanje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (demo) { setPisiVrsta(false); setToast(L('V predogledu se ne pošilja.', 'Not sent in preview.')); return; }
    const za = pisiZa.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(za)) { setPisiStatus(L('Vpiši veljaven e-naslov.', 'Enter a valid email.')); return; }
    setPisiPosiljam(true);
    let replyTo = ''; try { replyTo = String(JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}').ponudnik?.email || ''); } catch { /* brez profila */ }
    const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">${pisiTelo.replace(/\n/g, '<br>')}</div>`;
    const rez = await posljiMail({ to: [za], subject: pisiZadeva.trim(), html, replyTo: replyTo || undefined });
    setPisiPosiljam(false);
    if (rez.ok) { const nov = dodajPosto({ projectId: beriMail?.projectId, smer: 'poslano', prejemniki: [za], zadeva: pisiZadeva.trim(), telo: pisiTelo, povzetek: pisiTelo.replace(/\s+/g, ' ').trim().slice(0, 160) }); setPosta(prev => [nov, ...prev].sort((a, b) => b.datum.localeCompare(a.datum))); setPisiVrsta(false); setToast(L('Poslano.', 'Sent.')); } else { setPisiStatus(L('Napaka: ', 'Error: ') + (rez.napaka || '')); }
  };
  const deliVKlepet = () => { setZavihek('klepet'); setToast(L('Izberi sodelavca (+) in deli sporočilo.', 'Choose a collaborator (+) and share.')); };
  const povabiVKlepet = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = vabiEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setToast(L('Vpiši veljaven e-naslov.', 'Enter a valid email.')); return; }
    if (demo || !izbrana) { setVabiOdprt(false); setVabiEmail(''); setToast(L('V predogledu ne povabiš.', 'Not available in preview.')); return; }
    setVabiTece(true);
    const ok = await dodajUdelezenca(izbrana, em);
    if (!ok) { setVabiTece(false); setToast(L('Ni uspelo. Poskusi znova.', 'Failed. Try again.')); return; }
    /* pošlji e-mail vabilo z linkom za prijavo (RLS: vidi klepet, ko se prijavi s tem naslovom) */
    const povezava = `https://www.pinartflow.com${jeEn ? '/en' : ''}/kalkulator/komunikacija`;
    const kdo = email || (jeEn ? 'A Pinart Flow user' : 'Uporabnik Pinart Flow');
    const zadeva = jeEn ? 'You have been added to a chat — Pinart Flow' : 'Dodani ste v klepet — Pinart Flow';
    const html = jeEn
      ? `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a"><p>Hi,</p><p><b>${kdo}</b> added you to a shared chat in <b>Pinart Flow</b>.</p><p>Sign in with this email (<b>${em}</b>) and open Communication to see the conversation and reply:</p><p><a href="${povezava}" style="display:inline-block;background:#2A2035;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Open chat in Flow</a></p><p style="color:#666;font-size:13px">If the button doesn't work, open: ${povezava}</p></div>`
      : `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a"><p>Živjo,</p><p><b>${kdo}</b> te je dodal(a) v skupni klepet na <b>Pinart Flow</b>.</p><p>Prijavi se s tem e-naslovom (<b>${em}</b>) — z Googlom ali z geslom (gumb »Nov račun«) — in odpri Komunikacijo, da vidiš pogovor in odgovoriš:</p><p><a href="${povezava}" style="display:inline-block;background:#2A2035;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Odpri klepet v Flow</a></p><p style="color:#666;font-size:13px">Če gumb ne dela, odpri: ${povezava}</p></div>`;
    const rez = await posljiMail({ to: [em], subject: zadeva, html });
    setVabiTece(false);
    setVabiOdprt(false); setVabiEmail('');
    setToast(rez.ok ? `${em} ${L('dodan + vabilo poslano.', 'added + invite sent.')}` : `${em} ${L('dodan (vabilo ni šlo).', 'added (invite failed).')}`);
  };

  return (
    <div className="km">
      <header className="km-glava">
        <p className="km-eyebrow">{L('Komunikacija', 'Communication')}</p>
        <h1>{L('Vsa komunikacija na enem mestu.', 'All communication in one place.')}</h1>
        <p className="km-uvod">{L('Klepeti s sodelavci in projektni maili — brez brskanja po projektih in brez šuma.', 'Team chats and project mail — no digging through projects, no noise.')}</p>
      </header>

      <div className="km-zavihki" role="tablist">
        <button type="button" role="tab" aria-selected={zavihek === 'posta'} className={zavihek === 'posta' ? 'on' : ''} onClick={() => setZavihek('posta')}><EnvelopeSimple size={15} weight="bold" /> {L('Pošta', 'Mail')}{posta.length ? ` · ${posta.length}` : ''}</button>
        <button type="button" role="tab" aria-selected={zavihek === 'klepet'} className={zavihek === 'klepet' ? 'on' : ''} onClick={() => setZavihek('klepet')}><ChatCircle size={15} weight="bold" /> {L('Klepet', 'Chat')}</button>
      </div>

      {/* Mobilna spodnja noga (Gmail slog): Pošta / Klepet — fiksno spodaj, prek portala na body
          (da je transformiran prednik ne ujame). Namizje = zgornji km-zavihki. */}
      {mounted && createPortal(
        <nav className="km-noga" aria-label={L('Pošta / Klepet', 'Mail / Chat')}>
          <button type="button" className={zavihek === 'posta' ? 'on' : ''} aria-current={zavihek === 'posta'} onClick={() => setZavihek('posta')}>
            <EnvelopeSimple size={21} weight={zavihek === 'posta' ? 'fill' : 'regular'} /><span>{L('Pošta', 'Mail')}</span>{posta.length > 0 && <b>{posta.length}</b>}
          </button>
          <button type="button" className={zavihek === 'klepet' ? 'on' : ''} aria-current={zavihek === 'klepet'} onClick={() => setZavihek('klepet')}>
            <ChatCircle size={21} weight={zavihek === 'klepet' ? 'fill' : 'regular'} /><span>{L('Klepet', 'Chat')}</span>
          </button>
        </nav>, document.body)}

      {zavihek === 'posta' ? (
        <div className="km-posta-ovoj">
          <div className="km-posta-vrh">
            <button type="button" className="km-mape-trig" onClick={() => setMapeOdprt(true)} aria-label={L('Mape', 'Folders')} aria-expanded={mapeOdprt}><List size={16} weight="bold" /> <span>{mapa === 'prejeto' ? L('Prejeto', 'Inbox') : mapa === 'poslano' ? L('Poslano', 'Sent') : mapa === 'osnutki' ? L('Osnutki', 'Drafts') : L('Koš', 'Trash')}</span></button>
            <button type="button" className="km-isk-krog" onClick={() => setIskOdprt(true)} aria-label={L('Išči', 'Search')}><MagnifyingGlass size={16} weight="bold" /></button>
            <div className={'km-iskalnik' + (iskOdprt ? ' odprt' : '')}><MagnifyingGlass size={15} weight="bold" /><input value={postaIsk} onChange={e => { setPostaIsk(e.target.value); setPostaStran(1); }} placeholder={L('Išči po pošti …', 'Search mail …')} aria-label={L('Išči', 'Search')} /><button type="button" className="km-isk-zapri" onClick={() => { setPostaIsk(''); setIskOdprt(false); }} aria-label={L('Zapri iskanje', 'Close search')}>✕</button></div>
            <select className="km-prejemniki km-hide-mob" value={postaOseba} onChange={e => { setPostaOseba(e.target.value); setPostaStran(1); setBeriMail(null); }} aria-label={L('Vsi prejemniki', 'All recipients')} title={L('Vsi prejemniki', 'All recipients')}>
              <option value="">{L('Vsi prejemniki', 'All recipients')}</option>
              {prejemnikiVsi.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button type="button" className={'km-filter-krog' + (postaOseba ? ' aktiv' : '')} onClick={() => setFilterOdprt(true)} aria-label={L('Prejemniki', 'Recipients')} title={L('Prejemniki', 'Recipients')}><FunnelSimple size={16} weight={postaOseba ? 'fill' : 'bold'} /></button>
            <button type="button" className="km-nova" title={L('Nova pošta z huba: najprej izbereš projekt, nato pišeš (pride z enotnim klijentom)', 'New mail from the hub: first pick a project, then compose (comes with the unified client)')} aria-label={L('Nova pošta', 'New mail')}><PaperPlaneRight className="km-nova-ik" size={14} weight="fill" /> <span className="km-nova-txt">{L('Nova pošta', 'New mail')}</span><Plus className="km-nova-plus" size={18} weight="bold" /></button>
          </div>
          {filterOdprt && <>
            <div className="km-sheet-back" onClick={() => setFilterOdprt(false)} aria-hidden />
            <div className="km-sheet" role="dialog" aria-label={L('Prejemniki', 'Recipients')}>
              <div className="km-sheet-glava"><b>{L('Prejemniki', 'Recipients')}</b><button type="button" className="km-sheet-x" onClick={() => setFilterOdprt(false)} aria-label={L('Zapri', 'Close')}>✕</button></div>
              <div className="km-sheet-telo">
                <button type="button" className={postaOseba === '' ? 'on' : ''} onClick={() => { setPostaOseba(''); setPostaStran(1); setBeriMail(null); setFilterOdprt(false); }}>{L('Vsi prejemniki', 'All recipients')}</button>
                {prejemnikiVsi.map(p => <button type="button" key={p} className={postaOseba === p ? 'on' : ''} onClick={() => { setPostaOseba(p); setPostaStran(1); setBeriMail(null); setFilterOdprt(false); }}>{p}</button>)}
              </div>
            </div>
          </>}
          <div className="km-posta-body">
            {mapeOdprt && <div className="km-mape-back" onClick={() => setMapeOdprt(false)} aria-hidden />}
            <aside className={'km-mape' + (mapeOdprt ? ' odprt' : '')} aria-label={L('Mape', 'Folders')}>
              {([{ id: 'prejeto', ime: L('Prejeto', 'Inbox'), I: Tray }, { id: 'poslano', ime: L('Poslano', 'Sent'), I: PaperPlaneRight }, { id: 'osnutki', ime: L('Osnutki', 'Drafts'), I: NotePencil }, { id: 'kos', ime: L('Koš', 'Trash'), I: Trash }] as const).map(({ id, ime, I }) => {
                const st = posta.filter(v => (v.izbrisano ? 'kos' : v.osnutek ? 'osnutki' : v.smer === 'poslano' ? 'poslano' : 'prejeto') === id).length;
                return <button type="button" key={id} className={mapa === id ? 'on' : ''} onClick={() => { setMapa(id); setPostaStran(1); setBeriMail(null); setMapeOdprt(false); }}><I size={16} weight={mapa === id ? 'fill' : 'regular'} /> <span className="km-mapa-ime">{ime}</span>{st ? <b>{st}</b> : null}</button>;
              })}
            </aside>
            <div className="km-posta-desno">
          {beriMail ? (
            <div className="km-branje">
              <div className="km-branje-vrh">
                <button type="button" className="km-nazaj" onClick={() => { setBeriMail(null); setAiOdprt(false); setPremakniOdprt(false); setOznakaOdprt(false); setPisiVrsta(false); }}><ArrowBendUpLeft size={14} weight="bold" /> {L('Nazaj', 'Back')}</button>
                <div className="km-orodja">
                  <span className="km-ik-w">
                    <button type="button" className={`km-ikonca${premakniOdprt ? ' on' : ''}`} aria-expanded={premakniOdprt} title={L('Premakni na drug projekt', 'Move to another project')} aria-label={L('Premakni', 'Move')} onClick={() => { setPremakniOdprt(o => !o); setOznakaOdprt(false); }}><FolderSimplePlus size={16} /></button>
                    {premakniOdprt && (
                      <div className="km-meni" role="menu">
                        <p className="km-meni-h">{L('Premakni na projekt', 'Move to project')}</p>
                        {Object.keys(projMapa).length ? Object.entries(projMapa).map(([pid, ime]) => (
                          <button type="button" key={pid} role="menuitem" onClick={() => premakniMail(beriMail, pid)}><i aria-hidden style={{ background: projBarva(pid) }} />{ime}</button>
                        )) : <p className="km-meni-prazno">{L('Ni projektov.', 'No projects.')}</p>}
                      </div>
                    )}
                  </span>
                  <span className="km-ik-w">
                    <button type="button" className={`km-ikonca${oznakaOdprt ? ' on' : ''}`} aria-expanded={oznakaOdprt} title={L('Oznaka', 'Label')} aria-label={L('Oznaka', 'Label')} onClick={() => { setOznakaOdprt(o => !o); setPremakniOdprt(false); }}><Tag size={16} /></button>
                    {oznakaOdprt && (
                      <div className="km-meni" role="menu">
                        <p className="km-meni-h">{L('Oznake', 'Labels')}</p>
                        {(beriMail.oznake || []).length > 0 && <div className="km-oznake">{(beriMail.oznake || []).map((oz, i) => <span key={i} className="km-oznaka">{oz}<button type="button" aria-label={L('Odstrani', 'Remove')} onClick={() => odstraniOznako(beriMail, i)}>×</button></span>)}</div>}
                        <form onSubmit={e => { e.preventDefault(); dodajOznako(beriMail); }}><input value={oznakaVnos} onChange={e => setOznakaVnos(e.target.value)} placeholder={L('Nova oznaka …', 'New label …')} /><button type="submit">{L('Dodaj', 'Add')}</button></form>
                      </div>
                    )}
                  </span>
                  <button type="button" className="km-ikonca" title={L('V nalogo', 'Add to task')} aria-label={L('V nalogo', 'Add to task')} onClick={() => vNalogo(beriMail)}><CheckSquare size={16} /></button>
                  <button type="button" className={`km-ikonca${aiOdprt ? ' on' : ''}`} title={L('Pupa AI', 'Pupa AI')} aria-label="Pupa" onClick={() => pozeniAi(beriMail)}><Sparkle size={16} /></button>
                  <button type="button" className="km-ikonca" title={L('Natisni', 'Print')} aria-label={L('Natisni', 'Print')} onClick={() => { if (typeof window !== 'undefined') window.print(); }}><Printer size={16} /></button>
                  <button type="button" className={`km-ikonca${beriMail.zvezda ? ' zvezda' : ''}`} title={L('Zvezdica', 'Star')} aria-label={L('Zvezdica', 'Star')} onClick={() => toggleZvezda(beriMail)}><Star size={16} weight={beriMail.zvezda ? 'fill' : 'regular'} /></button>
                </div>
              </div>
              <div className="km-branje-glava"><b>{beriMail.zadeva || L('(brez zadeve)', '(no subject)')}</b><small>{beriMail.prejemniki.join(', ')} · {datum(beriMail.datum)} · {beriMail.smer === 'poslano' ? L('Poslano', 'Sent') : L('Prejeto', 'Received')}</small>{projIme(beriMail.projectId) && <span className="km-mail-proj" style={{ color: projBarva(beriMail.projectId), background: `color-mix(in oklch, ${projBarva(beriMail.projectId)} 12%, transparent)`, marginTop: '.4rem' }}><i aria-hidden style={{ background: projBarva(beriMail.projectId) }} />{projIme(beriMail.projectId)}</span>}{(beriMail.oznake || []).length > 0 && <span className="km-glava-oznake">{(beriMail.oznake || []).map((oz, i) => <span key={i} className="km-oznaka mala">{oz}</span>)}</span>}</div>
              <div className="km-branje-telo">{(beriMail.telo || beriMail.povzetek || L('(brez besedila)', '(no text)')).replace(/<[^>]+>/g, ' ')}</div>
              {aiOdprt && (
                <div className="km-ai">
                  <div className="km-ai-glava"><Sparkle size={15} weight="fill" /> {L('Pupa o tem sporočilu', 'Pupa on this message')}<button type="button" aria-label={L('Zapri', 'Close')} onClick={() => setAiOdprt(false)}>×</button></div>
                  {aiNalaganje ? <p className="km-ai-nalaganje">{L('Pupa bere sporočilo …', 'Pupa is reading …')}</p> : (
                    <>
                      <h5>{L('Povzetek', 'Summary')}</h5>
                      <p className="km-ai-tekst">{aiPovzetek || L('—', '—')}</p>
                      {aiOdgovor && (<>
                        <h5>{L('Predlog odgovora', 'Suggested reply')}</h5>
                        <textarea className="km-ai-odg" value={aiOdgovor} onChange={e => setAiOdgovor(e.target.value)} rows={5} />
                        <div className="km-ai-akc">
                          <button type="button" onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(aiOdgovor); setToast(L('Kopirano.', 'Copied.')); }}>{L('Kopiraj', 'Copy')}</button>
                          <button type="button" className="prim" onClick={() => { setPisiVrsta('odgovor'); setPisiZa(beriMail.prejemniki[0] || ''); setPisiZadeva(`Re: ${(beriMail.zadeva || '').replace(/^Re:\s*/i, '')}`); setPisiTelo(aiOdgovor); setPisiStatus(''); setAiOdprt(false); }}>{L('Uporabi kot odgovor', 'Use as reply')}</button>
                        </div>
                      </>)}
                    </>
                  )}
                </div>
              )}
              {pisiVrsta ? (
                <form className="km-pisi" onSubmit={posljiPisanje}>
                  <div className="km-pisi-glava"><b>{pisiVrsta === 'odgovor' ? L('Odgovori', 'Reply') : L('Posreduj', 'Forward')}</b><button type="button" aria-label={L('Zapri', 'Close')} onClick={() => setPisiVrsta(false)}>×</button></div>
                  <label>{L('Za', 'To')}<input type="email" value={pisiZa} onChange={e => setPisiZa(e.target.value)} placeholder="ime@domena.si" /></label>
                  <label>{L('Zadeva', 'Subject')}<input value={pisiZadeva} onChange={e => setPisiZadeva(e.target.value)} /></label>
                  <label>{L('Sporočilo', 'Message')}<textarea value={pisiTelo} onChange={e => setPisiTelo(e.target.value)} rows={6} /></label>
                  {pisiStatus && <p className="km-pisi-status">{pisiStatus}</p>}
                  <div className="km-pisi-akc"><button type="button" onClick={() => setPisiVrsta(false)}>{L('Prekliči', 'Cancel')}</button><button type="submit" className="prim" disabled={pisiPosiljam}>{pisiPosiljam ? L('Pošiljam …', 'Sending …') : L('Pošlji', 'Send')}</button></div>
                </form>
              ) : (
                <div className="km-branje-akcije">
                  <button type="button" className="km-akcija primarna" onClick={() => odpriPisanje(beriMail, 'odgovor')}><ArrowBendUpLeft size={15} weight="bold" /> {L('Odgovori', 'Reply')}</button>
                  <button type="button" className="km-akcija" onClick={() => odpriPisanje(beriMail, 'posreduj')}><ArrowBendUpRight size={15} weight="bold" /> {L('Posreduj', 'Forward')}</button>
                  <button type="button" className="km-akcija km-akcija-ikona" onClick={deliVKlepet} title={L('Deli v klepet', 'Share in chat')} aria-label={L('Deli v klepet', 'Share in chat')}><ChatCircle size={15} weight="bold" /> <span className="km-akcija-txt">{L('Deli v klepet', 'Share in chat')}</span></button>
                </div>
              )}
            </div>
          ) : (() => {
            const q = postaIsk.trim().toLowerCase();
            const seznam = posta.filter(v => (v.izbrisano ? 'kos' : v.osnutek ? 'osnutki' : v.smer === 'poslano' ? 'poslano' : 'prejeto') === mapa).filter(v => !postaOseba || v.prejemniki.includes(postaOseba)).filter(v => !q || `${v.zadeva} ${v.prejemniki.join(' ')} ${projIme(v.projectId)}`.toLowerCase().includes(q));
            const NA = 12; const strani = Math.max(1, Math.ceil(seznam.length / NA)); const stran = Math.min(Math.max(1, postaStran), strani); const prikaz = seznam.slice((stran - 1) * NA, stran * NA);
            return seznam.length ? (<>
              <div className="km-posta">
                {prikaz.map(v => (
                  <button type="button" key={v.id} className={`km-mail-vrsta km-mail-btn${v.smer === 'prejeto' && !v.prebrano ? ' neprebran' : ''}`} onClick={() => { setBeriMail(v); if (!v.prebrano) { if (!demo) oznaciPostoPrebrano(v.id); posodobiMail(v.id, { prebrano: true }); javiSpremembo(); } }}>
                    <span className="km-mail-check" aria-hidden />
                    <span className="km-mail-info"><b>{v.prejemniki.join(', ') || '—'}</b><span className="km-mail-zad">{v.zadeva || L('(brez zadeve)', '(no subject)')}</span>{projIme(v.projectId) && <span className="km-mail-proj" style={{ color: projBarva(v.projectId), background: `color-mix(in oklch, ${projBarva(v.projectId)} 12%, transparent)` }}><i aria-hidden style={{ background: projBarva(v.projectId) }} />{projIme(v.projectId)}</span>}</span>
                    <span className="km-mail-meta"><span className="km-mail-datum">{datum(v.datum)}</span><span className={`km-mail-smer ${v.smer}`}>{v.smer === 'poslano' ? L('Poslano', 'Sent') : L('Prejeto', 'Received')}</span></span>
                  </button>
                ))}
              </div>
              {strani > 1 && (
                <nav className="km-strani" aria-label={L('Strani', 'Pages')}>
                  <button type="button" disabled={stran <= 1} onClick={() => setPostaStran(stran - 1)} aria-label={L('Prejšnja', 'Previous')}>‹</button>
                  {Array.from({ length: strani }, (_, i) => i + 1).map(s => <button type="button" key={s} className={s === stran ? 'on' : ''} aria-current={s === stran ? 'page' : undefined} onClick={() => setPostaStran(s)}>{s}</button>)}
                  <button type="button" disabled={stran >= strani} onClick={() => setPostaStran(stran + 1)} aria-label={L('Naslednja', 'Next')}>›</button>
                </nav>
              )}
            </>) : <div className="km-prazno-box"><EnvelopeSimple size={30} weight="light" /><b>{L('Prazno', 'Empty')}</b><p>{mapa === 'prejeto' ? L('Ni prejete pošte v tej mapi.', 'No received mail in this folder.') : mapa === 'poslano' ? L('Ni poslane pošte.', 'No sent mail.') : mapa === 'osnutki' ? L('Ni osnutkov.', 'No drafts.') : L('Koš je prazen.', 'Trash is empty.')}</p></div>;
          })()}
            </div>
          </div>
        </div>
      ) : nalaganje ? (
        <p className="km-prazno">{L('Nalagam …', 'Loading …')}</p>
      ) : !niti.length ? (
        <div className="km-prazno-box">
          <ChatsCircle size={34} weight="light" />
          <b>{L('Še ni klepetov', 'No chats yet')}</b>
          <p>{L('Ko sodelavec deli mail ali ti napiše na projektu, se pogovor pojavi tukaj. Če nisi prijavljen, se najprej prijavi.', 'When a collaborator shares a mail or messages you on a project, the conversation appears here. If you are not signed in, sign in first.')}</p>
        </div>
      ) : (
        <div className="km-mreza">
          <aside className="km-seznam" aria-label={L('Seznam klepetov', 'Chat list')}>
            {niti.map(n => (
              <button type="button" key={n.threadId} className={`km-nit${izbrana === n.threadId ? ' on' : ''}`} onClick={() => setIzbrana(n.threadId)}>
                <span className="km-av" aria-hidden>{iniciala(nazivNiti(n))}</span>
                <span className="km-nit-txt"><b>{nazivNiti(n)}</b><small>{n.udelezenci.length} {L('udeležencev', 'participants')}</small></span>
              </button>
            ))}
          </aside>
          <section className="km-klepet" aria-label={L('Klepet', 'Chat')}>
            {izbranaNit && (
              <div className="km-klepet-glava">
                <span className="km-av" aria-hidden>{iniciala(nazivNiti(izbranaNit))}</span>
                <b>{nazivNiti(izbranaNit)}</b>
                <span className="km-klepet-plus-w">
                  <button type="button" className={`km-klepet-plus${vabiOdprt ? ' on' : ''}`} aria-expanded={vabiOdprt} title={L('Dodaj sodelavca', 'Add collaborator')} aria-label={L('Dodaj sodelavca', 'Add collaborator')} onClick={() => setVabiOdprt(o => !o)}><Plus size={16} weight="bold" /></button>
                  {vabiOdprt && (
                    <form className="km-vabi" onSubmit={povabiVKlepet}>
                      <p className="km-meni-h"><UserPlus size={13} weight="bold" style={{ marginRight: '.3rem', verticalAlign: '-2px' }} />{L('Dodaj sodelavca', 'Add collaborator')}</p>
                      <div className="km-vabi-vrsta">
                        <input type="email" value={vabiEmail} onChange={e => setVabiEmail(e.target.value)} placeholder="ime@domena.si" />
                        <button type="submit" disabled={vabiTece}>{vabiTece ? '…' : L('Dodaj', 'Add')}</button>
                      </div>
                      <p className="km-vabi-op">{L('Pošljemo mu vabilo z linkom. E-naslov mora biti enak njegovemu prijavnemu.', 'We send them an invite with a link. The email must match their login.')}</p>
                    </form>
                  )}
                </span>
              </div>
            )}
            <div className="km-tok">
              {sporocila.length ? sporocila.map(m => m.odMaila ? (
                <div key={m.id} className={`km-pri${m.senderEmail === (email || '') ? ' jaz' : ''}`}>
                  <div className="km-pri-glava"><Paperclip size={12} weight="bold" /> {L('Deljen mail', 'Shared mail')}</div>
                  <div className="km-pri-zad">{m.odMaila}</div>
                  <div className="km-pri-telo">{m.body}</div>
                </div>
              ) : (
                <div key={m.id} className={`km-b${m.senderEmail === (email || '') ? ' jaz' : ''}`}>{m.senderEmail !== (email || '') && <span className="km-b-kdo">{m.senderName || m.senderEmail}</span>}{m.body}</div>
              )) : <p className="km-prazno">{L('Ni sporočil. Napiši prvo.', 'No messages. Write the first one.')}</p>}
              <div ref={dnoRef} />
            </div>
            <form className="km-vnos" onSubmit={poslji}>
              <button type="button" className="km-vnos-ik" title={L('Priponka (kmalu)', 'Attachment (soon)')} aria-label={L('Priponka', 'Attachment')}><Paperclip size={16} /></button>
              <button type="button" className="km-vnos-ik" title={L('Emoji (kmalu)', 'Emoji (soon)')} aria-label="Emoji"><Smiley size={16} /></button>
              <input value={vnos} onChange={e => setVnos(e.target.value)} placeholder={L('Napiši sporočilo …', 'Write a message …')} aria-label={L('Sporočilo', 'Message')} disabled={!izbrana} />
              <button type="submit" className="km-poslji" disabled={!vnos.trim() || !izbrana} aria-label={L('Pošlji', 'Send')}><PaperPlaneRight size={16} weight="fill" /></button>
            </form>
          </section>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .km{--k-ink:var(--ink,oklch(19% .014 55));--k-line:var(--line,oklch(93% .007 82));--k-purple:var(--purple,oklch(66% .2 297));max-width:1180px;margin:0 auto;padding:.2rem 1.2rem 1.4rem}
        .km-eyebrow{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,var(--k-purple));margin:0 0 .3rem}
        .km-glava h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(1.7rem,3.4vw,2.4rem);line-height:1;letter-spacing:-.012em;margin:0 0 .6rem;color:var(--k-ink)}
        .km-uvod{font-size:1rem;line-height:1.55;color:rgba(17,17,17,.72);margin:0 0 2rem;max-width:38rem}
        .km-prazno{color:color-mix(in oklch,var(--k-ink) 50%,transparent);font:500 .9rem var(--font-sans),sans-serif}
        .km-prazno-box{display:flex;flex-direction:column;align-items:center;gap:.5rem;text-align:center;padding:3rem 1rem;color:color-mix(in oklch,var(--k-ink) 55%,transparent)}
        .km-prazno-box b{font:700 1.05rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-prazno-box p{max-width:34ch;font:500 .85rem var(--font-sans),sans-serif;line-height:1.5}
        .km-mreza{display:grid;grid-template-columns:18rem 1fr;gap:1rem;height:min(72vh,640px)}
        .km-seznam{overflow-y:auto;display:flex;flex-direction:column;gap:.3rem;background:rgba(255,255,255,.5);backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3);border:1px solid rgba(255,255,255,.55);border-radius:1rem;padding:.5rem}
        .km-nit{display:flex;align-items:center;gap:.6rem;width:100%;text-align:left;border:0;background:none;border-radius:.7rem;padding:.6rem .7rem;cursor:pointer}
        .km-nit:hover{background:color-mix(in oklch,var(--k-purple) 7%,transparent)}
        .km-nit.on{background:color-mix(in oklch,var(--k-purple) 12%,transparent)}
        .km-nit-txt{min-width:0}
        .km-nit-txt b{display:block;font:700 .86rem var(--font-sans),sans-serif;color:var(--k-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .km-nit-txt small{font:500 .7rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 48%,transparent)}
        .km-av{flex:none;width:2.1rem;height:2.1rem;border-radius:50%;display:grid;place-items:center;background:linear-gradient(140deg,oklch(72% .13 297),oklch(62% .2 297));color:#fff;font:700 .82rem var(--font-sans),sans-serif}
        .km-av.sm{width:1.9rem;height:1.9rem;font-size:.76rem}
        .km-zavihki{display:inline-flex;gap:.3rem;margin:0 0 1.1rem;padding:.25rem;background:#fff;border:1px solid var(--k-line);border-radius:999px}
        .km-zavihki button{display:inline-flex;align-items:center;gap:.4rem;border:0;background:none;border-radius:999px;padding:.5rem 1.1rem;font:700 .78rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 60%,transparent);cursor:pointer}
        .km-zavihki button.on{background:var(--k-ink,#2a2620);color:#fff}
        .km-noga{display:none}
        @media (max-width:760px){
          .km-zavihki{display:none}
          .km{padding-bottom:5rem}
          .km-noga{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:90;background:#fff;border-top:1px solid var(--k-line);padding:.35rem .5rem calc(.35rem + env(safe-area-inset-bottom,0px));box-shadow:0 -6px 24px color-mix(in oklch,var(--k-ink) 10%,transparent)}
          .km-noga button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.12rem;position:relative;border:0;background:none;padding:.4rem;color:color-mix(in oklch,var(--k-ink) 55%,transparent);font:700 .66rem var(--font-sans),sans-serif;cursor:pointer}
          .km-noga button.on{color:var(--k-purple)}
          .km-noga b{position:absolute;top:.05rem;left:calc(50% + .5rem);min-width:1.05rem;height:1.05rem;padding:0 .25rem;border-radius:999px;background:var(--k-purple);color:#fff;font-size:.58rem;display:grid;place-items:center;line-height:1}
        }
        @media (max-width:760px){ body.km-noga-on .pupa-fab{ display:none !important } }
        .km-posta{display:flex;flex-direction:column;gap:.4rem;max-width:52rem}
        .km-posta .km-mail-vrsta{display:flex;align-items:center;gap:.75rem;width:100%;text-align:left;background:rgba(255,255,255,.5);backdrop-filter:blur(14px) saturate(1.3);-webkit-backdrop-filter:blur(14px) saturate(1.3);border:1px solid rgba(255,255,255,.5);border-radius:.85rem;padding:.7rem .9rem;cursor:pointer;transition:background .16s ease,box-shadow .16s ease,transform .16s ease}
        .km-posta .km-mail-vrsta:hover{background:#fff;box-shadow:0 8px 22px oklch(20% .03 55/.1);transform:translateY(-1px)}
        .km-posta .km-mail-vrsta:hover{background:color-mix(in oklch,var(--k-purple) 5%,transparent);border-color:color-mix(in oklch,var(--k-purple) 25%,transparent)}
        .km-mail-check{flex:none;width:1.15rem;height:1.15rem;border:1.5px solid color-mix(in oklch,var(--k-ink) 22%,transparent);border-radius:.32rem}
        .km-mail-vrsta.neprebran{border-color:color-mix(in oklch,var(--k-purple) 30%,transparent)}
        .km-mail-vrsta.neprebran .km-mail-check{background:var(--k-purple);border-color:var(--k-purple);box-shadow:inset 0 0 0 2px #fff}
        .km-mail-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:.1rem}
        .km-mail-info b{font:700 .86rem var(--font-sans),sans-serif;color:var(--k-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .km-mail-zad{font:500 .8rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 62%,transparent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .km-mail-meta{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:.3rem;white-space:nowrap}
        .km-mail-datum{font:500 .72rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 48%,transparent);font-variant-numeric:tabular-nums}
        .km-mail-smer{font:700 .58rem var(--font-sans),sans-serif;letter-spacing:.05em;text-transform:uppercase;color:color-mix(in oklch,var(--k-ink) 45%,transparent)}
        .km-mail-smer.prejeto{color:oklch(48% .13 160)}
        .km-mail-proj{display:inline-flex;align-items:center;gap:.3rem;align-self:flex-start;margin-top:.1rem;max-width:100%;font:700 .64rem var(--font-sans),sans-serif;padding:.12rem .5rem .12rem .38rem;border-radius:999px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .km-mail-proj i{flex:none;width:.4rem;height:.4rem;border-radius:50%}
        .km-posta-vrh{position:relative;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem}
        .km-isk-krog{display:none}
        .km-isk-zapri{display:none}
        .km-nova-plus{display:none}
        .km-filter-krog{display:none}
        .km-sheet-back{position:fixed;inset:0;z-index:199;background:color-mix(in oklch,var(--k-ink) 34%,transparent);animation:kmFade .2s ease both}
        .km-sheet{position:fixed;left:0;right:0;bottom:0;z-index:200;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -16px 44px color-mix(in oklch,var(--k-ink) 22%,transparent);max-height:70dvh;display:flex;flex-direction:column;animation:kmUp .3s cubic-bezier(.2,.8,.3,1) both}
        @keyframes kmUp{from{transform:translateY(100%)}to{transform:none}}
        .km-sheet-glava{position:relative;display:flex;align-items:center;justify-content:space-between;padding:1.3rem 1.2rem .7rem;border-bottom:1px solid var(--k-line)}
        .km-sheet-glava::before{content:'';position:absolute;top:.5rem;left:50%;transform:translateX(-50%);width:2.4rem;height:.3rem;border-radius:999px;background:color-mix(in oklch,var(--k-ink) 18%,transparent)}
        .km-sheet-glava b{font:700 1.02rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-sheet-x{width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:color-mix(in oklch,var(--k-ink) 6%,transparent);color:var(--k-ink);font-size:1rem;line-height:1;cursor:pointer}
        .km-sheet-telo{overflow-y:auto;padding:.5rem .8rem calc(1rem + env(safe-area-inset-bottom,0px))}
        .km-sheet-telo button{display:block;width:100%;text-align:left;border:0;background:transparent;border-radius:12px;padding:.85rem .8rem;font:600 .9rem var(--font-sans),sans-serif;color:var(--k-ink);cursor:pointer}
        .km-sheet-telo button:hover{background:color-mix(in oklch,var(--k-purple) 6%,transparent)}
        .km-sheet-telo button.on{background:color-mix(in oklch,var(--k-purple) 12%,transparent);color:var(--k-ink)}
        .km-posta-vrh .km-iskalnik,.km-posta-vrh .km-prejemniki,.km-posta-vrh .km-nova{height:2.55rem;box-sizing:border-box;padding-top:0;padding-bottom:0}
        .km-posta-vrh .km-iskalnik{flex:1 1 15rem;margin-bottom:0}
        .km-prejemniki{flex:none;border:1px solid var(--k-line);border-radius:999px;padding:.5rem .9rem;font:600 .8rem var(--font-sans),sans-serif;color:var(--k-ink);background:#fff;cursor:pointer}
        .km-nova{flex:none;display:inline-flex;align-items:center;gap:.4rem;border:0;border-radius:999px;padding:.55rem 1.1rem;font:700 .8rem var(--font-sans),sans-serif;color:#fff;background:color-mix(in oklch,var(--k-ink) 42%,transparent);cursor:pointer}
        .km-nova:hover{background:color-mix(in oklch,var(--k-ink) 60%,transparent)}
        .km-mail-telo{padding:.2rem 1rem 1rem 3.6rem;font:500 .84rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 80%,transparent);line-height:1.55;white-space:pre-wrap}
        .km-posta-ovoj{max-width:62rem}
        .km-iskalnik{display:flex;align-items:center;gap:.5rem;background:#fff;border:1px solid var(--k-line);border-radius:999px;padding:.38rem .9rem;margin-bottom:1rem;color:color-mix(in oklch,var(--k-ink) 55%,transparent)}
        .km-iskalnik input{flex:1;min-width:0;border:0;background:none;outline:none;font:500 .85rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-posta-body{display:flex;gap:1.3rem;align-items:flex-start}
        .km-mape{flex:none;width:11rem;display:flex;flex-direction:column;gap:.15rem}
        .km-mape button{display:flex;align-items:center;gap:.55rem;width:100%;text-align:left;border:0;background:none;border-radius:.6rem;padding:.6rem .7rem;font:700 .82rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 62%,transparent);cursor:pointer}
        .km-mape button:hover{background:color-mix(in oklch,var(--k-purple) 6%,transparent)}
        .km-mape button.on{background:color-mix(in oklch,var(--k-purple) 12%,transparent);color:var(--k-ink)}
        .km-mapa-ime{flex:1;min-width:0}
        .km-mape button b{font-size:.72rem;font-weight:700;opacity:.55}
        .km-posta-desno{flex:1;min-width:0}
        .km-mape-trig{display:none}
        @media (max-width:760px){
          .km-posta-vrh{flex-wrap:nowrap;gap:.45rem;justify-content:flex-start}
          .km-isk-krog{display:inline-flex;align-items:center;justify-content:center;flex:none;width:2.9rem;height:2.9rem;border-radius:50%;border:1px solid var(--k-line);background:#fff;color:var(--k-ink);cursor:pointer}
          .km-iskalnik{display:none;margin-bottom:0}
          .km-iskalnik.odprt{display:flex;position:absolute;left:0;right:0;top:0;z-index:6;margin:0;height:2.9rem;box-sizing:border-box}
          .km-iskalnik.odprt input{font-size:16px}
          .km-isk-zapri{display:inline-flex;align-items:center;justify-content:center;flex:none;border:0;background:none;color:var(--k-ink);font-size:1rem;line-height:1;cursor:pointer;padding:.2rem .3rem}
          .km-hide-mob{display:none}
          .km-filter-krog{display:inline-flex;align-items:center;justify-content:center;flex:none;width:2.9rem;height:2.9rem;border-radius:50%;border:1px solid var(--k-line);background:#fff;color:var(--k-ink);cursor:pointer}
          .km-filter-krog.aktiv{border-color:var(--k-purple);color:var(--k-purple)}
          .km-nova{flex:none;width:2.9rem;height:2.9rem;padding:0;gap:0;justify-content:center}
          .km-nova-ik,.km-nova-txt{display:none}
          .km-nova-plus{display:inline-flex}
          .km{padding-left:.35rem;padding-right:.35rem}
          .km-posta-body{flex-direction:column;align-items:stretch}
          .km-branje{padding:1rem}
          .km-posta .km-mail-vrsta{padding:.7rem .8rem}
          .km-akcija-ikona{padding:.55rem}
          .km-akcija-ikona .km-akcija-txt{display:none}
          .km-mape-trig{display:inline-flex;align-items:center;gap:.4rem;flex:none;height:2.9rem;box-sizing:border-box;margin-right:auto;border:1px solid var(--k-line);border-radius:999px;padding:0 1rem;background:#fff;color:var(--k-ink);font:700 .78rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
          .km-mape-back{position:fixed;inset:0;z-index:199;background:color-mix(in oklch,var(--k-ink) 34%,transparent);animation:kmFade .2s ease both}
          .km-mape{position:fixed;left:0;top:0;bottom:0;z-index:200;width:min(78%,15rem);flex-direction:column;flex-wrap:nowrap;gap:.15rem;padding:calc(1.15rem + env(safe-area-inset-top,0px)) .8rem calc(1.15rem + env(safe-area-inset-bottom,0px));background:var(--k-paper,#fff);box-shadow:8px 0 40px color-mix(in oklch,var(--k-ink) 22%,transparent);transform:translateX(-100%);transition:transform .3s cubic-bezier(.2,.8,.3,1);overflow-y:auto}
          .km-mape.odprt{transform:none}
          .km-mape button{width:100%}
        }
        @keyframes kmFade{from{opacity:0}to{opacity:1}}
        .km-mail-btn{width:100%;text-align:left;border:1px solid var(--k-line);cursor:pointer}
        .km-mail-btn:hover{background:color-mix(in oklch,var(--k-purple) 5%,transparent)}
        .km-mail-kazalec{margin-left:.5rem;opacity:.4}
        .km-branje{max-width:52rem;background:rgba(255,255,255,.5);backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3);border:1px solid rgba(255,255,255,.55);border-radius:1rem;padding:1.2rem 1.3rem}
        .km-nazaj{display:inline-flex;align-items:center;border:1px solid var(--k-line);background:#fff;border-radius:999px;padding:.4rem .9rem;font:700 .74rem var(--font-sans),sans-serif;color:var(--k-ink);cursor:pointer;margin-bottom:.8rem}
        .km-nazaj:hover{background:var(--k-ink,#2a2620);color:#fff;border-color:transparent}
        .km-branje-glava b{display:block;font:700 1rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-branje-glava small{display:block;margin-top:.2rem;font:500 .74rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 50%,transparent)}
        .km-branje-telo{margin-top:.8rem;font:500 .88rem var(--font-sans),sans-serif;color:var(--k-ink);line-height:1.6;white-space:pre-wrap}
        .km-branje-op{margin-top:1rem;padding-top:.8rem;border-top:1px solid var(--k-line);font:500 .72rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 40%,transparent)}
        .km-branje-vrh{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-bottom:.9rem}
        .km-orodja{display:flex;gap:.4rem;flex-wrap:wrap}
        .km-ikonca{display:grid;place-items:center;width:2.3rem;height:2.3rem;border:1px solid var(--k-line);border-radius:50%;background:#fff;color:color-mix(in oklch,var(--k-ink) 68%,transparent);cursor:pointer;transition:background .14s,color .14s}
        .km-ikonca:hover{background:color-mix(in oklch,var(--k-ink) 6%,transparent);color:var(--k-ink)}
        .km-branje-akcije{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.1rem}
        .km-akcija{display:inline-flex;align-items:center;gap:.4rem;border:1px solid var(--k-line);border-radius:999px;padding:.55rem 1.1rem;font:700 .8rem var(--font-sans),sans-serif;color:var(--k-ink);background:#fff;cursor:pointer}
        .km-akcija:hover{background:color-mix(in oklch,var(--k-ink) 6%,transparent)}
        .km-akcija.primarna{background:var(--k-ink,#2a2620);color:#fff;border-color:transparent}
        .km-vnos-ik{flex:none;display:grid;place-items:center;width:2.3rem;height:2.3rem;border:0;border-radius:50%;background:none;color:color-mix(in oklch,var(--k-ink) 55%,transparent);cursor:pointer}
        .km-vnos-ik:hover{background:color-mix(in oklch,var(--k-ink) 7%,transparent);color:var(--k-ink)}
        .km-ikonca.on{background:color-mix(in oklch,var(--k-purple) 14%,transparent);border-color:color-mix(in oklch,var(--k-purple) 40%,transparent);color:var(--k-purple)}
        .km-ikonca.zvezda{color:oklch(72% .16 78);border-color:color-mix(in oklch,oklch(72% .16 78) 40%,transparent)}
        .km-ik-w{position:relative;display:inline-flex}
        .km-meni{position:absolute;top:calc(100% + .4rem);left:0;z-index:30;min-width:15rem;max-height:16rem;overflow-y:auto;background:#fff;border:1px solid var(--k-line);border-radius:.85rem;box-shadow:0 12px 34px -18px rgba(20,15,10,.4);padding:.5rem}
        .km-meni-h{margin:.1rem .3rem .4rem;font:700 .68rem var(--font-sans),sans-serif;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in oklch,var(--k-ink) 45%,transparent)}
        .km-meni-prazno{margin:.2rem .3rem;font:500 .8rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 50%,transparent)}
        .km-meni>button{display:flex;align-items:center;gap:.5rem;width:100%;text-align:left;border:0;background:none;border-radius:.55rem;padding:.5rem .55rem;font:600 .82rem var(--font-sans),sans-serif;color:var(--k-ink);cursor:pointer}
        .km-meni>button:hover{background:color-mix(in oklch,var(--k-purple) 8%,transparent)}
        .km-meni>button i{flex:none;width:.6rem;height:.6rem;border-radius:50%}
        .km-meni form{display:flex;gap:.35rem;margin-top:.35rem}
        .km-meni form input{flex:1;min-width:0;border:1px solid var(--k-line);border-radius:.5rem;padding:.4rem .55rem;font:500 .82rem var(--font-sans),sans-serif;background:#fff;color:var(--k-ink)}
        .km-meni form button{flex:none;border:0;border-radius:.5rem;background:var(--k-ink,#2a2620);color:#fff;padding:.4rem .7rem;font:700 .78rem var(--font-sans),sans-serif;cursor:pointer}
        .km-oznake{display:flex;flex-wrap:wrap;gap:.3rem;margin:.1rem 0 .2rem}
        .km-oznaka{display:inline-flex;align-items:center;gap:.25rem;background:color-mix(in oklch,var(--k-purple) 10%,transparent);color:var(--k-purple);border-radius:999px;padding:.2rem .55rem;font:700 .72rem var(--font-sans),sans-serif}
        .km-oznaka.mala{background:color-mix(in oklch,var(--k-ink) 7%,transparent);color:color-mix(in oklch,var(--k-ink) 62%,transparent)}
        .km-oznaka button{border:0;background:none;color:inherit;cursor:pointer;font-size:1rem;line-height:1;padding:0}
        .km-glava-oznake{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.4rem}
        .km-ai{margin-top:1rem;background:color-mix(in oklch,var(--k-purple) 5%,transparent);border:1px solid color-mix(in oklch,var(--k-purple) 22%,transparent);border-radius:.9rem;padding:.9rem 1rem}
        .km-ai-glava{display:flex;align-items:center;gap:.45rem;font:700 .82rem var(--font-sans),sans-serif;color:var(--k-purple)}
        .km-ai-glava button{margin-left:auto;border:0;background:none;color:color-mix(in oklch,var(--k-ink) 50%,transparent);font-size:1.15rem;line-height:1;cursor:pointer}
        .km-ai-nalaganje{margin:.6rem 0 0;font:500 .84rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 60%,transparent)}
        .km-ai h5{margin:.7rem 0 .25rem;font:700 .7rem var(--font-sans),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in oklch,var(--k-ink) 50%,transparent)}
        .km-ai-tekst{margin:0;font:500 .88rem/1.5 var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-ai-odg{width:100%;border:1px solid var(--k-line);border-radius:.6rem;padding:.6rem .7rem;font:500 .88rem/1.5 var(--font-sans),sans-serif;background:#fff;color:var(--k-ink);resize:vertical}
        .km-ai-akc{display:flex;gap:.5rem;margin-top:.5rem}
        .km-ai-akc button{border:1px solid var(--k-line);background:#fff;border-radius:999px;padding:.45rem .95rem;font:700 .78rem var(--font-sans),sans-serif;color:var(--k-ink);cursor:pointer}
        .km-ai-akc button.prim{background:var(--k-purple);border-color:transparent;color:#fff}
        .km-pisi{margin-top:1rem;display:flex;flex-direction:column;gap:.55rem;background:#fff;border:1px solid var(--k-line);border-radius:.9rem;padding:1rem}
        .km-pisi-glava{display:flex;align-items:center;font:700 .92rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-pisi-glava button{margin-left:auto;border:0;background:none;color:color-mix(in oklch,var(--k-ink) 50%,transparent);font-size:1.2rem;line-height:1;cursor:pointer}
        .km-pisi label{display:flex;flex-direction:column;gap:.28rem;font:700 .72rem var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in oklch,var(--k-ink) 52%,transparent)}
        .km-pisi input,.km-pisi textarea{border:1px solid var(--k-line);border-radius:.55rem;padding:.55rem .7rem;font:500 .9rem/1.5 var(--font-sans),sans-serif;background:#fff;color:var(--k-ink);text-transform:none;letter-spacing:0}
        .km-pisi input:focus,.km-pisi textarea:focus,.km-ai-odg:focus,.km-meni form input:focus{outline:2px solid color-mix(in oklch,var(--k-purple) 45%,transparent);outline-offset:1px;border-color:var(--k-purple)}
        .km-pisi textarea{resize:vertical}
        .km-pisi-status{margin:0;font:600 .8rem var(--font-sans),sans-serif;color:oklch(55% .2 25)}
        .km-pisi-akc{display:flex;justify-content:flex-end;gap:.5rem}
        .km-pisi-akc button{border:1px solid var(--k-line);background:#fff;border-radius:999px;padding:.55rem 1.2rem;font:700 .82rem var(--font-sans),sans-serif;color:var(--k-ink);cursor:pointer}
        .km-pisi-akc button.prim{background:var(--k-ink,#2a2620);border-color:transparent;color:#fff}
        .km-pisi-akc button:disabled{opacity:.5;cursor:default}
        .km-strani{display:flex;justify-content:center;align-items:center;gap:.3rem;margin:1rem 0 .2rem}
        .km-strani button{min-width:1.9rem;height:1.9rem;padding:0 .5rem;border:1px solid var(--k-line);border-radius:.5rem;background:#fff;color:var(--k-ink);font:600 .74rem var(--font-sans),sans-serif;cursor:pointer}
        .km-strani button:hover:not(:disabled){background:color-mix(in oklch,var(--k-purple) 6%,transparent)}
        .km-strani button:disabled{opacity:.4;cursor:default}
        .km-strani button.on{background:var(--k-ink,#2a2620);color:#fff;border-color:transparent}
        .km-klepet{display:flex;flex-direction:column;min-height:0;background:#fff;border:1px solid var(--k-line);border-radius:1rem;overflow:hidden}
        .km-klepet-glava{flex:none;display:flex;align-items:center;gap:.6rem;padding:.85rem 1.1rem;border-bottom:1px solid var(--k-line);font:700 .95rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-klepet-glava>b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .km-klepet-plus-w{position:relative;margin-left:auto;flex:none;display:inline-flex}
        .km-klepet-plus{display:grid;place-items:center;width:2.1rem;height:2.1rem;border:1px solid var(--k-line);border-radius:50%;background:#fff;color:color-mix(in oklch,var(--k-ink) 62%,transparent);cursor:pointer;transition:background .14s,color .14s,border-color .14s}
        .km-klepet-plus:hover{background:color-mix(in oklch,var(--k-purple) 8%,transparent);color:var(--k-purple);border-color:color-mix(in oklch,var(--k-purple) 35%,transparent)}
        .km-klepet-plus.on{background:var(--k-purple);border-color:transparent;color:#fff}
        .km-vabi{position:absolute;top:calc(100% + .45rem);right:0;z-index:30;width:17rem;background:#fff;border:1px solid var(--k-line);border-radius:.85rem;box-shadow:0 12px 34px -18px rgba(20,15,10,.4);padding:.7rem}
        .km-vabi-vrsta{display:flex;gap:.35rem;margin-top:.15rem}
        .km-vabi-vrsta input{flex:1;min-width:0;border:1px solid var(--k-line);border-radius:.5rem;padding:.5rem .6rem;font:500 .84rem var(--font-sans),sans-serif;background:#fff;color:var(--k-ink)}
        .km-vabi-vrsta input:focus{outline:2px solid color-mix(in oklch,var(--k-purple) 45%,transparent);outline-offset:1px;border-color:var(--k-purple)}
        .km-vabi-vrsta button{flex:none;border:0;border-radius:.5rem;background:var(--k-purple);color:#fff;padding:.5rem .8rem;font:700 .78rem var(--font-sans),sans-serif;cursor:pointer}
        .km-vabi-vrsta button:disabled{opacity:.5;cursor:default}
        .km-vabi-op{margin:.45rem .1rem 0;font:500 .68rem/1.4 var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 48%,transparent)}
        .km-tok{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:.5rem;padding:1.1rem}
        .km-b{max-width:78%;align-self:flex-start;padding:.5rem .8rem;border-radius:1.05rem;background:oklch(95% .008 87);color:var(--k-ink);font:500 .88rem var(--font-sans),sans-serif;line-height:1.45;white-space:pre-wrap;word-break:break-word}
        .km-b.jaz{align-self:flex-end;background:var(--k-purple);color:#fff}
        .km-b-kdo{display:block;font:700 .66rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 55%,transparent);margin-bottom:.15rem}
        .km-pri{align-self:flex-start;max-width:86%;background:#fff;border:1px solid color-mix(in oklch,var(--k-ink) 12%,transparent);border-left:3px solid var(--k-purple);border-radius:.7rem;padding:.5rem .7rem}
        .km-pri.jaz{align-self:flex-end}
        .km-pri-glava{display:inline-flex;align-items:center;gap:.3rem;font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--k-purple)}
        .km-pri-zad{font:700 .84rem var(--font-sans),sans-serif;color:var(--k-ink);margin:.15rem 0}
        .km-pri-telo{font:500 .82rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 78%,transparent);line-height:1.45;white-space:pre-wrap;word-break:break-word}
        .km-vnos{flex:none;display:flex;align-items:center;gap:.5rem;padding:.75rem .9rem;border-top:1px solid var(--k-line)}
        .km-vnos input{flex:1;min-width:0;border:1px solid color-mix(in oklch,var(--k-ink) 10%,transparent);border-radius:999px;padding:.65rem 1rem;font:500 .88rem var(--font-sans),sans-serif;color:var(--k-ink);background:#fff}
        .km-vnos input:focus{outline:none;border-color:var(--k-purple)}
        .km-poslji{flex:none;display:grid;place-items:center;width:2.5rem;height:2.5rem;border:0;border-radius:50%;background:var(--k-purple);color:#fff;cursor:pointer}
        .km-poslji:disabled{opacity:.4;cursor:default}
        @media (max-width:760px){.km-mreza{grid-template-columns:1fr;height:auto}.km-seznam{max-height:14rem}.km-klepet{height:60vh}}
      ` }} />
      <Toast sporocilo={toast} onClose={() => setToast('')} />
    </div>
  );
}
