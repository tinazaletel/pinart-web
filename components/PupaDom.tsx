'use client';

/* PUPA DOM — pogovorni dom (Faza 1). Chat v OSPREDJU (sredina), podatki nadzorne
   plošče PLAVAJO okoli (ambient, glass), aurora v ozadju. »Moderno in sveže«.
   NOVA stran (/kalkulator/dom); obstoječe ostanejo nedotaknjene.
   Plavajoče številke so za zdaj PREDSTAVITVENE (koncept postavitve) — prava
   podatkovna povezava pride v naslednjem koraku. Kartice-v-pogovoru + glas = Faza 2.
   Glej memory: project_pupa_prvi_vmesnik, project_pupa_center_layout_ideja, project_flow_glass_aurora. */

import { useEffect, useRef, useState } from 'react';
import { Palette, Buildings, Browser, Megaphone, Camera, Compass, Layout, Newspaper, DotsThree } from '@phosphor-icons/react';
import { lokalniOdgovori } from '@/lib/onboarding';
import { PODROCJA } from '@/lib/pricingCatalog';
import KalkulatorApp from '@/components/KalkulatorApp';
import InvoiceWorkspace from '@/components/InvoiceWorkspace';
import ExpenseWorkspace from '@/components/ExpenseWorkspace';
import NovProjektWorkspace from '@/components/NovProjektWorkspace';
import TaskManagerWorkspace from '@/components/TaskManagerWorkspace';
import ContractWorkspace from '@/components/ContractWorkspace';
import RetainerWorkspace from '@/components/RetainerWorkspace';

/* a/b/c izbire za izkušnje — iste kot kalkulator (KalkulatorApp IZKUSNJE); PODROCJA iz lib */
const IZKUSNJE_IZBIRE = [
  { ime: 'Študent', opis: 'ob študiju, prvi naročniki' },
  { ime: 'Začetnik', opis: 'do 3 leta' },
  { ime: 'Samostojen', opis: '3 do 8 let' },
  { ime: 'Strokovnjak', opis: '8+ let, reference' },
  { ime: 'Ekspert', opis: 'nagrade, prepoznano ime' },
];

/* KOPIJA iz KalkulatorApp: barve + ikone področij + osvetli/zatemni (za kartica-izbor) */
const PODROCJE_BARVA: Record<string, string> = {
  graficno: '#7C3AED', splet: '#0EA5A5', marketing: '#DB2777',
  foto: '#2563EB', direkcija: '#EA580C', prostor: '#5B9E1E',
  produkcija: '#475569', pr: '#0891B2', drugo: '#6B7280',
};
const PODROCJE_IKONA: Record<string, React.ReactNode> = {
  graficno: <Palette size={22} />, prostor: <Buildings size={22} />, splet: <Browser size={22} />,
  marketing: <Megaphone size={22} />, foto: <Camera size={22} />, direkcija: <Compass size={22} />,
  produkcija: <Layout size={22} />, pr: <Newspaper size={22} />, drugo: <DotsThree size={22} />,
};
function osvetli(hex: string, amt: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.max(0, Math.min(255, Math.round(c + (255 - c) * amt))).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}
function zatemni(hex: string, f: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.max(0, Math.min(255, Math.round(c * f))).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}

export default function PupaDom({ base = '' }: { base?: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const locale = jeEn ? 'en' : 'sl';
  /* Izbran tip iz vstopa → orodje se požene V ISTEM oknu (brez navigacije).
     'ponudba' = pravi kalkulator; ostali = svoj obstoječi workspace. null = vstopni zaslon. */
  const [tip, setTip] = useState<'ponudba' | 'racun' | 'strosek' | 'projekt' | 'naloga' | 'pogodba' | 'retainer' | null>(null);
  const [ime, setIme] = useState('');
  const [vnos, setVnos] = useState('');
  const [priponka, setPriponka] = useState<File | null>(null);
  const datotekaRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const predlagaj = (t: string) => { setVnos(t); const el = textRef.current; if (el) { el.focus(); el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 220)}px`; } };

  /* AI način (ChatGPT spec): Pupa AI / Moj AI / Brez AI. Vidno ob vnosu, shranjeno.
     Za zdaj selektor izbere + zapomni način; prava Pupa/Moj AI pogovor = Faza 2/3. */
  const [aiNacin, setAiNacin] = useState<'pupa' | 'moj' | 'brez'>('pupa');
  const [aiOdprt, setAiOdprt] = useState(false);
  useEffect(() => {
    try { const v = localStorage.getItem('pinart-ai-nacin'); if (v === 'pupa' || v === 'moj' || v === 'brez') setAiNacin(v); } catch { /* ignore */ }
  }, []);
  const izberiAi = (n: 'pupa' | 'moj' | 'brez') => { setAiNacin(n); setAiOdprt(false); try { localStorage.setItem('pinart-ai-nacin', n); } catch { /* ignore */ } };
  const aiLabela = aiNacin === 'pupa' ? 'Pupa AI' : aiNacin === 'moj' ? L('Moj AI', 'My AI') : L('Brez AI', 'No AI');
  /* klik zunaj zapre meni (namesto fiksnega ozadja, ki je delalo težave z z-index) */
  const aiRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aiOdprt) return;
    const zunaj = (e: MouseEvent) => { if (aiRef.current && !aiRef.current.contains(e.target as Node)) setAiOdprt(false); };
    document.addEventListener('mousedown', zunaj);
    return () => document.removeEventListener('mousedown', zunaj);
  }, [aiOdprt]);

  /* Glasovno narekovanje (Web Speech API) — deluje v Chromu; v Safari/Firefox ni
     podprto, zato tam gumb pokaže kratek namig. Besedilo pade v vnosno polje. */
  const [poslusam, setPoslusam] = useState(false);
  const [glasNamig, setGlasNamig] = useState('');
  const recRef = useRef<{ stop: () => void } | null>(null);
  const glas = () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const W = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) { setGlasNamig(L('Glas trenutno deluje v brskalniku Chrome.', 'Voice currently works in Chrome.')); window.setTimeout(() => setGlasNamig(''), 3500); return; }
    if (poslusam && recRef.current) { recRef.current.stop(); return; }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const rec: any = new SR();
    rec.lang = jeEn ? 'en-US' : 'sl-SI';
    rec.interimResults = true;
    rec.continuous = false;
    const osnova = vnos;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    rec.onresult = (e: any) => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; predlagaj((osnova ? `${osnova} ` : '') + t); };
    rec.onend = () => { setPoslusam(false); recRef.current = null; };
    rec.onerror = () => { setPoslusam(false); recRef.current = null; };
    recRef.current = rec; setPoslusam(true); rec.start();
  };

  useEffect(() => {
    try { setIme((lokalniOdgovori().ime || '').trim()); } catch { /* ignore */ }
  }, []);

  /* Ena vrstica na namizju (za kratko IN dolgo ime je prostora dovolj); če je
     res predolgo (npr. mobilni), text-wrap: balance lepo uravnovesi v dve vrstici
     — brez grdih sirot. */
  const pozdrav = ime
    ? L(`Hej, ${ime}. Kaj želiš danes?`, `Hi, ${ime}. What's on today?`)
    : L('Hej. Kaj želiš danes?', "Hi. What's on today?");

  /* Pupa pogovor v domu (AI način): prosto besedilo = KLEPET, ne vsili orodja.
     Orodja odpreš prek gumbov (ali kasneje prek Pupine potrditve). Vezano na obstoječi /api/pupa. */
  const [pupaSpor, setPupaSpor] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [pupaCaka, setPupaCaka] = useState(false);
  const klepet = pupaSpor.length > 0;
  const pupaNitRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (klepet) pupaNitRef.current?.scrollTo({ top: pupaNitRef.current.scrollHeight, behavior: 'smooth' }); }, [pupaSpor, pupaCaka, klepet]);

  async function posljiPupi(besedilo: string) {
    const q = besedilo.trim();
    if (!q || pupaCaka) return;
    const zgo = pupaSpor.slice(-8);
    setPupaSpor(s => [...s, { role: 'user', content: q }]);
    setPupaCaka(true);
    try {
      const res = await fetch('/api/pupa', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          vprasanje: q,
          kontekst: L('Uporabnik je v Pupa domu (vstopni pomočnik za samostojne kreativce). Pomagaj z nasvetom; če želi USTVARITI ponudbo/račun/projekt/nalogo, ga usmeri na ustrezen gumb v domu — ne izmišljaj si, da si to naredila.',
                      'User is in the Pupa home (entry assistant for freelance creatives). Help with advice; if they want to CREATE a quote/invoice/project/task, point them to the matching button in the home — do not pretend you did it.'),
          zgodovina: zgo,
        }),
      });
      const data = await res.json();
      const odg = data.odgovor || data.napaka || L('Hmm, nekaj je zaškripalo. Poskusi znova.', 'Hmm, something went wrong. Try again.');
      setPupaSpor(s => [...s, { role: 'assistant', content: odg }]);
    } catch {
      setPupaSpor(s => [...s, { role: 'assistant', content: L('Ne morem do zaledja. Poskusi znova.', 'Cannot reach the backend. Try again.') }]);
    } finally {
      setPupaCaka(false);
    }
  }

  /* Zazna JASEN namen ustvarjanja iz besedila (akcijski glagol + predmet). Pokrije tudi
     pogodbo/dolgoročno (ki nista gumba). Sicer null → Pupa se pogovarja, ne vsili ponudbe. */
  function zaznajTip(low: string): typeof tip {
    if (low.startsWith('izdaj račun') || low.startsWith('izdaj racun') || low.startsWith('issue an invoice')) return 'racun';
    if (low.startsWith('dodaj strošek') || low.startsWith('dodaj strosek') || low.startsWith('add an expense')) return 'strosek';
    if (low.startsWith('ustvari projekt') || low.startsWith('ustvari nov projekt') || low.startsWith('start a project') || low.startsWith('start a new project')) return 'projekt';
    if (low.startsWith('ustvari nalogo') || low.startsWith('create task') || low.startsWith('create a task')) return 'naloga';
    if (low.startsWith('pripravi pogodbo') || low.startsWith('naredi pogodbo') || low.startsWith('create a contract')) return 'pogodba';
    if (low.startsWith('pripravi retainer') || low.startsWith('dolgoročno') || low.startsWith('dolgorocno') || low.startsWith('retainer')) return 'retainer';
    if (low.startsWith('pripravi ponudbo') || low.startsWith('naredi ponudbo') || low.startsWith('create a quote') || low.startsWith('create a proposal')) return 'ponudba';
    return null;
  }

  const posljiVnos = () => {
    const t = vnos.trim();
    if (!t) return;
    const el = textRef.current;
    const cilj = zaznajTip(t.toLowerCase());
    // AI način (Pupa / Moj AI): JASEN namen ustvarjanja → odpre orodje; sicer = KLEPET (NE vsili ponudbe).
    if (aiNacin === 'pupa' || aiNacin === 'moj') {
      setVnos(''); if (el) el.style.height = 'auto';
      if (cilj) { intentRef.current = t; setTip(cilj); }
      else posljiPupi(t);
      return;
    }
    // Brez AI: ni pogovora — prosto besedilo odpre orodje po tipu; privzeto ponudba.
    intentRef.current = t;
    setVnos(''); if (el) el.style.height = 'auto';
    setTip(cilj ?? 'ponudba');
  };

  /* Razpored kartic: plavajoče (privzeto, lepo) ALI zbrane v okence v kotu
     (hitro pregledaš — ChatGPT predlog). Gumb zgoraj desno preklaplja; zapomni se. */
  const [zbrano, setZbrano] = useState(false);
  useEffect(() => { try { setZbrano(localStorage.getItem('pinart-pupa-zbrano') === '1'); } catch { /* ignore */ } }, []);
  const preklopiRazpored = () => setZbrano(z => { const n = !z; try { localStorage.setItem('pinart-pupa-zbrano', n ? '1' : '0'); } catch { /* ignore */ } return n; });

  /* POGOVOR SE NADALJUJE V ISTEM OKNU (nič se ne »odpre«): tekst se pomika navzgor,
     vnos ostane na dnu, z desne se odpre panel. Vprašanja = vajin obstoječi vprašalnik
     (Pupa vklopljena lahko vmes doda kontekstna vprašanja; izklopljena = ta zaporedja).
     Dizajn je ENAK ne glede na AI. */
  const [pogovor] = useState(false); // (pogovor-v-oknu je nadomeščen z zagonom pravega orodja; ostane false)
  const [sporocila, setSporocila] = useState<Sporocilo[]>([]);
  const [korak, setKorak] = useState(0);
  const [profil, setProfil] = useState<Profil>({ ime: '', izkusnje: '', podjetje: '', podrocja: '' });
  const [urejam, setUrejam] = useState<number | null>(null);
  const [izbranaPodrocja, setIzbranaPodrocja] = useState<string[]>([]); // večizbor za področja (a/b/c)
  const idRef = useRef(1);
  const nextId = () => idRef.current++;
  const casovniki = useRef<number[]>([]);
  const korakRef = useRef(0);
  const intentRef = useRef('');
  const preklicaniRef = useRef<Set<number>>(new Set());
  const koncRef = useRef<HTMLDivElement>(null);
  useEffect(() => { korakRef.current = korak; }, [korak]);
  useEffect(() => { if (pogovor) koncRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [sporocila, pogovor]);
  useEffect(() => () => { casovniki.current.forEach(clearTimeout); }, []);

  /* ISTA vprašanja kot obstoječi vprašalnik (glava ponudbe). Naslednji sklop (storitve
     s svojimi vprašanji) pride v naslednjem koraku — ta se veže na kalkulator. */
  const VPRASANJA: { k: keyof Profil; q: string; pod?: string }[] = [
    { k: 'ime', q: L('Živjo! Kako ti je ime?', 'Hi! What is your name?') },
    { k: 'izkusnje', q: L('Kakšne izkušnje imaš?', 'How much experience do you have?'), pod: L('Vpliva na ceno ponudbe.', 'Affects the quote price.') },
    { k: 'podjetje', q: L('V imenu katerega podjetja izdajaš ponudbo?', 'Under which company do you issue the quote?'), pod: L('Podatki za glavo ponudbe. Če nimaš podjetja, vpiši svoje ime.', 'Details for the quote header. If you have no company, enter your name.') },
    { k: 'podrocja', q: L('S katerimi področji se ukvarjaš?', 'Which fields do you work in?'), pod: L('Izbereš lahko več.', 'You can pick several.') },
  ];

  function pupaVprasaj(k: number) {
    const besedilo = k < VPRASANJA.length
      ? VPRASANJA[k].q + (VPRASANJA[k].pod ? `\n${VPRASANJA[k].pod}` : '')
      : L('Super — osnova je zbrana! Nadaljujeva z izbiro storitev in ceno.', "Great — the basics are set! Let's continue with services and pricing.");
    setSporocila(prev => [...prev, { id: nextId(), kdo: 'pupa', besedilo }]);
  }
  function posljiBesedilo(text: string) {
    const t = text.trim(); if (!t) return;
    const mojId = nextId();
    const k0 = korakRef.current; // ta odgovor pripada vprašanju k0 (za pravilno urejanje)
    setSporocila(prev => [...prev, { id: mojId, kdo: 'jaz', besedilo: t, stanje: 'cakanje', korak: k0 }]);
    const c = window.setTimeout(() => {
      if (preklicaniRef.current.has(mojId)) { preklicaniRef.current.delete(mojId); return; }
      setSporocila(prev => prev.map(s => (s.id === mojId ? { ...s, stanje: 'obdelano' } : s)));
      const k = korakRef.current;
      if (k < VPRASANJA.length) { const kljuc = VPRASANJA[k].k; setProfil(p => ({ ...p, [kljuc]: t })); }
      const nk = Math.min(k + 1, VPRASANJA.length);
      setKorak(nk); korakRef.current = nk;
      const c2 = window.setTimeout(() => pupaVprasaj(nk), 450); casovniki.current.push(c2);
    }, 850);
    casovniki.current.push(c);
  }
  function urediSporocilo(s: Sporocilo) { setVnos(s.besedilo); setUrejam(s.id); const el = textRef.current; if (el) el.focus(); }
  function izbrisiSporocilo(id: number) { preklicaniRef.current.add(id); setSporocila(prev => prev.filter(s => s.id !== id)); if (urejam === id) { setUrejam(null); setVnos(''); } }
  /* a/b/c izbire */
  function izberiIzkusnjo(ime: string) { posljiBesedilo(ime); }
  function preklopiPodrocje(id: string) { setIzbranaPodrocja(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function potrdiPodrocja() {
    if (!izbranaPodrocja.length) return;
    const imena = izbranaPodrocja.map(id => { const p = PODROCJA.find(x => x.id === id); return p ? (jeEn ? (p.imeEn || p.ime) : p.ime) : id; });
    posljiBesedilo(imena.join(', ')); setIzbranaPodrocja([]);
  }
  function nadaljuj() {
    if (typeof window === 'undefined') return;
    try {
      const KEY = 'pinart-kalkulator-v2';
      const obst = JSON.parse(localStorage.getItem(KEY) || '{}');
      localStorage.setItem(KEY, JSON.stringify({
        ...obst,
        imeUporabnika: profil.ime || obst.imeUporabnika || '',
        izkusnje: profil.izkusnje || obst.izkusnje || '',
        ponudnik: { ...(obst.ponudnik || {}), ime: profil.podjetje || obst.ponudnik?.ime || '' },
      }));
    } catch { /* ignore */ }
    const namig = intentRef.current.trim();
    window.location.href = `${base}/kalkulator/orodje?od=pregled${namig ? `&namig=${encodeURIComponent(namig)}` : ''}`;
  }

  /* PLAVAJOČE kartice (ambient) — podatki, kot jih imamo na nadzorni plošči.
     poz = položaj okoli sredine (desktop); h = odtenek; d = zamik animacije. */
  /* klikljive plavajoče kartice (Tina želi VEČ); varni odmiki od robov (nič odrezano) */
  const plava: { labela: string; vrednost: string; h: number; poz: string; d: number; href: string }[] = [
    { labela: L('Prihodek ta mesec', 'Revenue this month'), vrednost: '4.850 €', h: 150, poz: 'top:9%;left:4%', d: 0, href: `${base}/kalkulator/racuni` },
    { labela: L('Aktivni projekti', 'Active projects'), vrednost: '3', h: 200, poz: 'top:35%;left:6%', d: 1.4, href: `${base}/kalkulator/projekti` },
    { labela: L('Za plačilo', 'Awaiting payment'), vrednost: '1.350 €', h: 25, poz: 'bottom:13%;left:5%', d: 2.6, href: `${base}/kalkulator/racuni` },
    { labela: L('Naloge danes', 'Tasks today'), vrednost: '4', h: 297, poz: 'top:9%;right:5%', d: .7, href: `${base}/kalkulator/naloge` },
    { labela: L('Mesečni cilj', 'Monthly goal'), vrednost: '68 %', h: 60, poz: 'top:35%;right:7%', d: 2, href: `${base}/kalkulator/cilji` },
    { labela: L('Nova sporočila', 'New messages'), vrednost: '2', h: 320, poz: 'bottom:13%;right:5%', d: 3.2, href: `${base}/kalkulator/komunikacija` },
  ];

  /* hitre akcije = lahki POGOVORNI predlogi (napolnijo vnos), ne le linki (ChatGPT) */
  const hitre: { ime: string; tip?: typeof tip; href?: string; h: number }[] = [
    { ime: L('Pripravi ponudbo', 'Create a quote'), tip: 'ponudba', h: 297 },
    { ime: L('Izdaj račun', 'Issue an invoice'), tip: 'racun', h: 200 },
    { ime: L('Dodaj strošek', 'Add an expense'), tip: 'strosek', h: 60 },
    { ime: L('Ustvari projekt', 'Start a project'), tip: 'projekt', h: 150 },
    { ime: L('Ustvari nalogo', 'Create task'), tip: 'naloga', h: 250 },
    { ime: L('Štoparica', 'Stopwatch'), href: `${base}/kalkulator/cas`, h: 190 },
  ];

  // IZBRAN TIP → orodje se odpre V ISTEM oknu (brez navigacije). Stalni okvir že obstaja:
  // stranski meni (s preklopom Pupa/Home) ostane; klik »Pupa« te vrne na vstop. Orodja = obstoječe komponente.
  if (tip === 'ponudba') return <KalkulatorApp locale={locale} vLupini />;
  if (tip === 'racun') return <InvoiceWorkspace base={base} />;
  if (tip === 'strosek') return <ExpenseWorkspace />;
  if (tip === 'projekt') return <NovProjektWorkspace base={base} />;
  if (tip === 'naloga') return <TaskManagerWorkspace />;
  if (tip === 'pogodba') return <ContractWorkspace base={base} />;
  if (tip === 'retainer') return <RetainerWorkspace base={base} vLupini />;

  return (
    <div className={`pd${klepet ? ' pogovor' : ''}`}>
      <div className="pd-aurora" aria-hidden><i className="a1" /><i className="a2" /><i className="a3" /></div>

      {/* Gumb: zberi tage v kot / razprši nazaj (le namizje) */}
      <button type="button" className="pd-razpored" onClick={preklopiRazpored} aria-pressed={zbrano}
        title={zbrano ? L('Razprši kartice', 'Scatter cards') : L('Zberi v kot', 'Collect to corner')}>
        {zbrano ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
        )}
      </button>

      {/* PLAVAJOČE podatkovne kartice (desktop) — wrap plava/boba, kartica poveča ob hoveru */}
      <div className={`pd-plava${zbrano ? ' zbrano' : ''}`}>
        {plava.map((p, i) => (
          <div key={i} className="pd-kartica-wrap" style={zbrano ? { animationDelay: `${p.d}s`, animationDuration: `${5.5 + (i % 3) * 1.2}s` } : { animationDelay: `${p.d}s`, animationDuration: `${7 + (i % 3) * 2.2}s`, ...pozStyle(p.poz) }}>
            <a href={p.href} className="pd-kartica" style={{ ['--h' as string]: String(p.h) }}>
              <span className="pd-k-pika" />
              <b>{p.vrednost}</b>
              <small>{p.labela}</small>
            </a>
          </div>
        ))}
      </div>

      {/* CHAT v OSPREDJU */}
      <div className="pd-center">
        <div className="pd-glava">
          <span className="pd-orb" aria-hidden />
          <div>
            <p className="pd-eyebrow">PUPA</p>
            <h1 className="pd-naslov">{pozdrav}</h1>
          </div>
        </div>
        {!klepet && <p className="pd-uvod">{L('Povej ali vprašaj karkoli — Pupa svetuje in uredi poslovni del.', 'Say or ask anything — Pupa advises and handles the business part.')}</p>}

        {pogovor && (
          <div className="pd-nit">
            {sporocila.map(s => (
              <div key={s.id} className={`pd-vr ${s.kdo === 'jaz' ? 'jaz' : 'pupa'}`}>
                <div className="pd-vr-body">
                  {/* Pupin mehurček: gradient krogec (orb) je ZNOTRAJ mehurčka + krepko vprašanje + siv podnaslov */}
                  <div className={`pd-mehur${s.kdo === 'jaz' && s.stanje === 'cakanje' ? ' caka' : ''}${urejam === s.id ? ' ureja' : ''}`}>
                    {s.kdo === 'pupa' ? (
                      s.besedilo.includes('\n')
                        ? <><span className="pd-meh-q">{s.besedilo.slice(0, s.besedilo.indexOf('\n'))}</span><span className="pd-meh-pod">{s.besedilo.slice(s.besedilo.indexOf('\n') + 1)}</span></>
                        : <span className="pd-meh-q">{s.besedilo}</span>
                    ) : s.besedilo}
                    {s.kdo === 'jaz' && (
                      <button type="button" className="pd-vr-pen" onClick={() => urediSporocilo(s)} title={L('Uredi', 'Edit')} aria-label={L('Uredi', 'Edit')}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                      </button>
                    )}
                  </div>
                  {s.kdo === 'jaz' && s.stanje === 'cakanje' && (
                    <div className="pd-vr-meta">
                      <button type="button" className="pd-vr-ikona" onClick={() => izbrisiSporocilo(s.id)} title={L('Izbriši (še neprebrano)', 'Delete (not read yet)')} aria-label={L('Izbriši', 'Delete')}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* a/b/c izbire (kot kalkulatorjev prelogin): izkušnje = enoizbor, področja = večizbor */}
            {korak === 1 && sporocila.length > 0 && sporocila[sporocila.length - 1].kdo === 'pupa' && (
              <div className="pd-izbire">
                {IZKUSNJE_IZBIRE.map(iz => (
                  <button key={iz.ime} type="button" className="pd-izbira" onClick={() => izberiIzkusnjo(iz.ime)}>
                    <b>{iz.ime}</b><small>{iz.opis}</small>
                  </button>
                ))}
              </div>
            )}
            {korak === 3 && sporocila.length > 0 && sporocila[sporocila.length - 1].kdo === 'pupa' && (
              <div className="pd-izbire-vec">
                <div className="chat-podrocja">
                  {PODROCJA.map(p => { const bar = PODROCJE_BARVA[p.id] || '#7C3AED'; const on = izbranaPodrocja.includes(p.id); return (
                    <button key={p.id} type="button" className={'chip-podrocje' + (on ? ' on' : '')} style={{ borderColor: on ? bar : 'rgba(17,17,17,.12)' }} onClick={() => preklopiPodrocje(p.id)}>
                      <span className="pi-pod" aria-hidden style={{ background: osvetli(bar, 0.8), color: zatemni(bar, 0.55) }}>{PODROCJE_IKONA[p.id]}</span>
                      <b>{jeEn ? (p.imeEn || p.ime) : p.ime}</b>
                      <span className="chip-kljuk" aria-hidden style={{ borderColor: on ? bar : 'rgba(17,17,17,.2)', background: on ? bar : 'transparent' }}>{on ? '✓' : ''}</span>
                    </button>
                  ); })}
                </div>
                <button type="button" className="pd-izbire-potrdi" onClick={potrdiPodrocja} disabled={izbranaPodrocja.length === 0}>{L('Končano', 'Done')}</button>
              </div>
            )}
            <div ref={koncRef} />
          </div>
        )}

        {/* UNIVERZALNA PUPA: prosto besedilo = klepet (vezan na /api/pupa); jasen namen odpre orodje */}
        {klepet && (
          <div className="pd-nit" ref={pupaNitRef}>
            {pupaSpor.map((m, i) => (
              <div key={i} className={`pd-vr ${m.role === 'user' ? 'jaz' : 'pupa'}`}>
                <div className="pd-vr-body"><div className="pd-mehur">{m.content}</div></div>
              </div>
            ))}
            {pupaCaka && (
              <div className="pd-vr pupa"><div className="pd-vr-body"><div className="pd-mehur pd-tipka"><span /><span /><span /></div></div></div>
            )}
          </div>
        )}

        <div className="pd-vnos">
          <div className="pd-vnos-vrh">
            <div className="pd-ai" ref={aiRef}>
              <button type="button" className="pd-ai-trig" onClick={() => setAiOdprt(o => !o)} aria-expanded={aiOdprt} aria-haspopup="menu">
                <svg className={`pd-ai-ikona pd-ai-${aiNacin}`} width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" /><path d="M18.5 13l.9 2.6L22 16.5l-2.6.9-.9 2.6-.9-2.6L15 16.5l2.6-.9.9-2.6z" opacity=".65" /></svg>
                {aiLabela} <span className="pd-ai-chev" aria-hidden>▾</span>
              </button>
              {aiOdprt && (
                <div className="pd-ai-meni" role="menu">
                  <button type="button" role="menuitem" className={aiNacin === 'pupa' ? 'on' : ''} onClick={() => izberiAi('pupa')}><b>Pupa AI</b><small>{L('Vključena v paket — Pinart krije strošek.', 'Included in your plan — Pinart covers the cost.')}</small></button>
                  <button type="button" role="menuitem" className={aiNacin === 'moj' ? 'on' : ''} onClick={() => izberiAi('moj')}><b>{L('Moj AI', 'My AI')}</b><small>{L('Poveži svoj AI prek API ali MCP (kmalu). Morebitno porabo plačaš svojemu ponudniku.', 'Connect your own AI via API or MCP (soon). You pay any usage to your provider.')}</small></button>
                  <button type="button" role="menuitem" className={aiNacin === 'brez' ? 'on' : ''} onClick={() => izberiAi('brez')}><b>{L('Brez AI', 'No AI')}</b><small>{L('Klasični vprašalniki; nič ne gre zunanjemu AI.', 'Classic questionnaires; nothing goes to an external AI.')}</small></button>
                </div>
              )}
            </div>
          </div>
          {priponka && (
            <div className="pd-priponka">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
              <span>{priponka.name}</span>
              <button type="button" className="pd-priponka-x" onClick={() => { setPriponka(null); if (datotekaRef.current) datotekaRef.current.value = ''; }} aria-label={L('Odstrani prilogo', 'Remove attachment')}>×</button>
            </div>
          )}
          <input ref={datotekaRef} type="file" hidden onChange={e => setPriponka(e.target.files?.[0] ?? null)} />
          <textarea
            ref={textRef}
            value={vnos}
            onChange={e => { setVnos(e.target.value); const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 220)}px`; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); posljiVnos(); } }}
            placeholder={L('npr. »Pripravi ponudbo za spletno stran za kavarno Luna, rok konec septembra«', 'e.g. “Prepare a quote for a website for Café Luna, deadline end of September”')}
            rows={2}
            aria-label={L('Napiši, kaj želiš', 'Write what you want')}
          />
          <div className="pd-vnos-akc">
            <button type="button" className="pd-add" onClick={() => datotekaRef.current?.click()} title={L('Naloži prilogo za pogovor', 'Upload an attachment to discuss')} aria-label={L('Dodaj prilogo', 'Add attachment')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <div className="pd-vnos-desno">
              <button type="button" className={`pd-mik${poslusam ? ' posluam' : ''}`} onClick={glas} title={poslusam ? L('Poslušam … klikni za konec', 'Listening … click to stop') : L('Govori', 'Speak')} aria-label={L('Glas', 'Voice')} aria-pressed={poslusam}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
              </button>
              <button type="button" className="pd-poslji" onClick={posljiVnos}>{klepet ? L('Pošlji', 'Send') : L('Začni', 'Start')} <span aria-hidden>→</span></button>
            </div>
          </div>
          {glasNamig && <p className="pd-glas-namig" role="status">{glasNamig}</p>}
        </div>

        {!klepet && (
          <>
            {/* mobilni povzetek: kompromis — na telefonu ena čista vrstica namesto
                plavajočih kartic (te so le na namizju). Isti podatki, klikljivi. */}
            <div className="pd-povzetek">
              {plava.map((p, i) => (
                <a key={i} href={p.href} className="pd-pov-cip" style={{ ['--h' as string]: String(p.h) }}>
                  <b>{p.vrednost}</b><span>{p.labela}</span>
                </a>
              ))}
            </div>

            <div className="pd-hitre">
              {hitre.map(h => (
                <button type="button" key={h.ime} className="pd-cip" style={{ ['--h' as string]: String(h.h) }} onClick={() => { if (h.href) { if (typeof window !== 'undefined') window.location.href = h.href; } else if (h.tip) setTip(h.tip); }}>{h.ime}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {pogovor && (
        <aside className="pd-panel" aria-label={L('Osnutek ponudbe', 'Quote draft')}>
          <div className="pd-p-glava">
            <span className="pd-p-znak">{L('Osnutek ponudbe', 'Quote draft')}</span>
            <span className="pd-p-status">{korak > 0 ? L('v pripravi', 'in progress') : L('čaka', 'waiting')}</span>
          </div>
          {korak === 0 ? (
            <div className="pd-p-doc">
              <svg width="44" height="54" viewBox="0 0 46 56" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
                <path d="M7 3h20l12 12v38a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M27 3v12h12" />
                <path d="M13 26h20M13 33h20M13 40h13" strokeLinecap="round" opacity=".55" />
              </svg>
              <p className="pd-p-prazno">{L('Odgovori na vprašanja — glava ponudbe se sestavi tukaj.', 'Answer the questions — the quote header builds here.')}</p>
            </div>
          ) : (
            <>
              <div className="pd-p-polje"><span className="pd-p-ozn">{L('Ime', 'Name')}</span><span className={`pd-p-vr${profil.ime ? '' : ' prazno'}`}>{profil.ime || L('— še ni —', '— not yet —')}</span></div>
              {profil.izkusnje && <div className="pd-p-polje"><span className="pd-p-ozn">{L('Izkušnje', 'Experience')}</span><span className="pd-p-vr">{profil.izkusnje}</span></div>}
              {profil.podjetje && <div className="pd-p-polje"><span className="pd-p-ozn">{L('Podjetje', 'Company')}</span><span className="pd-p-vr">{profil.podjetje}</span></div>}
              {profil.podrocja && <div className="pd-p-polje"><span className="pd-p-ozn">{L('Področja', 'Fields')}</span><span className="pd-p-vr">{profil.podrocja}</span></div>}
            </>
          )}
          <p className="pd-p-opomba">{L('Ko je osnova zbrana, nadaljuješ z izbiro storitev in ceno.', 'Once the basics are set, continue with services and pricing.')}</p>
          <button type="button" className="pd-p-odpri" onClick={nadaljuj} disabled={korak < VPRASANJA.length}>{L('Nadaljuj', 'Continue')} <span aria-hidden>→</span></button>
        </aside>
      )}

      <style jsx>{`
        .pd { position: relative; min-height: calc(100dvh - 3rem); overflow: hidden; display: grid; place-items: center; }
        /* EDINO ozadje: fiksno čez cel zaslon (ne panel-v-panelu) */
        .pd-aurora { position: fixed; inset: 0; z-index: 0; pointer-events: none; filter: blur(70px); opacity: .5; }
        .pd-aurora i { position: absolute; display: block; border-radius: 50%; }
        .pd-aurora .a1 { width: 44vw; height: 44vw; top: -10vw; left: -8vw; background: radial-gradient(circle, oklch(72% .16 300 / .85), transparent 68%); animation: pdFloat 24s ease-in-out infinite; }
        .pd-aurora .a2 { width: 40vw; height: 40vw; top: 20vw; right: -10vw; background: radial-gradient(circle, oklch(78% .13 200 / .8), transparent 68%); animation: pdFloat 28s ease-in-out infinite reverse; }
        .pd-aurora .a3 { width: 36vw; height: 36vw; bottom: -12vw; left: 26vw; background: radial-gradient(circle, oklch(80% .12 150 / .75), transparent 68%); animation: pdFloat 32s ease-in-out infinite; }
        @keyframes pdFloat { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(2vw,-2vw) scale(1.06); } }

        .pd-plava { position: absolute; inset: 0; z-index: 1; pointer-events: none; display: none; }
        /* gumb za preklop razporeda (zberi v kot / razprši) */
        .pd-razpored { position: absolute; top: .75rem; right: .5rem; z-index: 30; display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 14%, transparent); border-radius: 50%; background: rgba(255,255,255,.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); cursor: pointer; transition: background .15s ease, color .15s ease, border-color .15s ease; }
        .pd-razpored:hover { background: #fff; color: var(--ink, #1a1a1a); }
        /* wrap nosi PLAVANJE (position + bob); kartica se POVEČA ob hoveru (brez konflikta transformov) */
        .pd-kartica-wrap { position: absolute; pointer-events: none; animation: pdBob 9s ease-in-out infinite; }
        .pd-kartica { position: relative; pointer-events: auto; display: flex; flex-direction: column; gap: .1rem; min-width: 8.5rem; padding: .75rem .95rem; border: 1px solid rgba(255,255,255,.6); border-radius: .95rem; background: color-mix(in oklch, oklch(72% .13 var(--h)) 10%, rgba(255,255,255,.55)); backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2); box-shadow: 0 12px 34px oklch(50% .1 var(--h) / .14); text-decoration: none; cursor: pointer; transition: transform .22s cubic-bezier(.2,.7,.2,1), box-shadow .22s ease; }
        .pd-kartica:hover { transform: scale(1.07); box-shadow: 0 22px 50px oklch(50% .1 var(--h) / .3); z-index: 3; }
        .pd-k-pika { position: absolute; top: .8rem; right: .8rem; width: .5rem; height: .5rem; border-radius: 50%; background: oklch(65% .19 var(--h)); box-shadow: 0 0 0 4px oklch(65% .19 var(--h) / .18); }
        .pd-kartica b { font: 700 1.15rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-kartica small { font: 600 .66rem var(--font-sans), sans-serif; letter-spacing: .02em; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        /* bogato lebdenje: drift v X+Y + nežna rotacija = bolj živo */
        @keyframes pdBob {
          0%   { transform: translate(0, 0) rotate(0deg); }
          25%  { transform: translate(5px, -10px) rotate(1.1deg); }
          50%  { transform: translate(-3px, -16px) rotate(-1.4deg); }
          75%  { transform: translate(-6px, -7px) rotate(.9deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        /* umirjeno lebdenje za zbrano mrežo (brez prekrivanja) */
        @keyframes pdBobMini { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

        .pd-center { position: relative; z-index: 2; width: min(48rem, 96vw); padding: clamp(1.2rem, 4vw, 2rem) clamp(.55rem, 2.2vw, 2rem); text-align: left; }
        /* HOME (prazno): pozdrav → gumbi → vnos kot CENTRIRANA skupina — vnos je VIŠJE (ne visi na robu).
           Ko pogovor zraste (.pd.pogovor), se vnos prilepi na dno (glej postavitev pogovora spodaj). */
        .pd:not(.pogovor) { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .pd:not(.pogovor) .pd-center { display: flex; flex-direction: column; }
        .pd:not(.pogovor) .pd-glava { order: 0; }
        .pd:not(.pogovor) .pd-uvod { order: 1; }
        .pd:not(.pogovor) .pd-povzetek { order: 3; }
        .pd:not(.pogovor) .pd-hitre { order: 4; margin-bottom: 1.15rem; }
        .pd:not(.pogovor) .pd-vnos { order: 5; }
        .pd-glava { display: flex; align-items: center; gap: .8rem; margin-bottom: .4rem; }
        .pd-orb { flex: none; width: 3rem; height: 3rem; border-radius: 50%; background: conic-gradient(from 210deg, oklch(70% .19 300), oklch(72% .16 200), oklch(80% .13 150), oklch(78% .17 25), oklch(70% .19 300)); box-shadow: 0 8px 22px oklch(60% .18 300 / .38), inset -3px -4px 8px oklch(100% 0 0 / .35), inset 3px 4px 8px oklch(30% .1 300 / .25); animation: pdOrb 8s ease-in-out infinite; }
        @keyframes pdOrb { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-3px) rotate(8deg); } }
        .pd-eyebrow { margin: 0 0 .15rem; font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .18em; color: var(--purple, oklch(60% .2 297)); }
        .pd-naslov { margin: 0; font: 500 clamp(1.45rem, 3.4vw, 2.05rem)/1.1 var(--font-serif), Georgia, serif; font-synthesis: none; color: var(--ink, #1a1a1a); letter-spacing: -.01em; text-wrap: balance; }
        .pd-uvod { margin: .15rem 0 1.1rem; font: 500 .98rem/1.5 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); }

        /* position+z-index: backdrop-filter naredi .pd-vnos svoj stacking context;
           brez tega dvига čipi (tudi backdrop-filter) prekrijejo AI meni. */
        .pd-vnos { position: relative; z-index: 20; display: flex; flex-direction: column; gap: .5rem; background: rgba(255,255,255,.66); backdrop-filter: blur(18px) saturate(1.35); -webkit-backdrop-filter: blur(18px) saturate(1.35); border: 1px solid rgba(255,255,255,.75); border-radius: 1.2rem; padding: .95rem 1rem; box-shadow: 0 18px 50px oklch(40% .08 300 / .16); }
        .pd-vnos textarea { width: 100%; box-sizing: border-box; border: 0; outline: none; resize: none; background: transparent; font: 500 1rem/1.5 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); min-height: 3.1rem; max-height: 220px; overflow-y: auto; transition: height .08s ease; }
        .pd-vnos textarea::placeholder { color: color-mix(in oklch, var(--ink, #1a1a1a) 42%, transparent); }
        /* brez grdega oglatega fokus ringa na textarea — obarva se ROB celotnega polja */
        .pd-vnos textarea:focus, .pd-vnos textarea:focus-visible { outline: none; box-shadow: none; }
        .pd-vnos:focus-within { border-color: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in oklch, var(--purple, oklch(66% .2 297)) 16%, transparent), 0 18px 50px oklch(40% .08 300 / .16); }
        .pd-vnos-akc { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
        .pd-vnos-desno { display: flex; align-items: center; gap: .5rem; }
        .pd-add { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); border-radius: 50%; background: #fff; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); cursor: pointer; transition: background .15s ease, color .15s ease, transform .15s ease; }
        .pd-add:hover { background: var(--ink, #2a2620); color: var(--paper, #faf7f2); transform: translateY(-1px); }
        .pd-priponka { display: inline-flex; align-items: center; gap: .4rem; align-self: flex-start; max-width: 100%; padding: .35rem .5rem .35rem .65rem; border: 1px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 30%, transparent); border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 8%, #fff); font: 600 .74rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-priponka span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 16rem; }
        .pd-priponka-x { display: grid; place-items: center; width: 1.15rem; height: 1.15rem; border: 0; border-radius: 50%; background: color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); color: var(--ink, #1a1a1a); font-size: .8rem; line-height: 1; cursor: pointer; }
        .pd-mik { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); border-radius: 50%; background: #fff; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); cursor: pointer; transition: background .15s ease, color .15s ease, border-color .15s ease; }
        .pd-mik:hover { border-color: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 40%, transparent); color: var(--purple, oklch(60% .2 297)); }
        .pd-mik.posluam { background: oklch(63% .2 25); border-color: transparent; color: #fff; animation: pdMik 1.1s ease-in-out infinite; }
        @keyframes pdMik { 0%,100% { box-shadow: 0 0 0 0 oklch(63% .2 25 / .5); } 50% { box-shadow: 0 0 0 7px oklch(63% .2 25 / 0); } }
        .pd-glas-namig { margin: .1rem 0 0; font: 500 .74rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        /* črni gumb z gloss-reflekt sweep (kot obstoječi Flow gumbi) */
        .pd-poslji { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: .45rem; border: 0; border-radius: 999px; padding: .65rem 1.35rem; background: var(--ink, #2a2620); color: var(--paper, #faf7f2); font: 700 .85rem var(--font-sans), sans-serif; cursor: pointer; transition: transform .15s ease, box-shadow .2s ease; }
        .pd-poslji:hover { transform: translateY(-1px); box-shadow: 0 9px 24px oklch(30% .05 300 / .32); }
        .pd-poslji::after { content: ''; position: absolute; top: 0; left: -160%; width: 90%; height: 100%; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.9) 50%, transparent 100%); transform: skewX(-18deg); transition: left .6s cubic-bezier(.19,1,.22,1); pointer-events: none; }
        .pd-poslji:hover::after { left: 160%; }

        /* AI način selektor (Pupa AI ▾) */
        .pd-vnos-vrh { display: flex; align-items: center; margin-bottom: .1rem; }
        .pd-ai { position: relative; z-index: 40; }
        .pd-ai-trig { display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .65rem .3rem .55rem; border: 1px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 32%, transparent); border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 9%, #fff); color: var(--ink, #1a1a1a); font: 700 .74rem var(--font-sans), sans-serif; cursor: pointer; transition: background .15s ease; }
        .pd-ai-trig:hover { background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 15%, #fff); }
        .pd-ai-ikona { color: var(--purple, oklch(60% .2 297)); }
        .pd-ai-ikona.pd-ai-brez { color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pd-ai-chev { font-size: .58rem; opacity: .6; }
        .pd-ai-meni { position: absolute; z-index: 6; bottom: calc(100% + .4rem); top: auto; left: 0; width: 17rem; max-width: 78vw; padding: .3rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); border-radius: .85rem; background: #fff; box-shadow: 0 16px 42px oklch(30% .05 300 / .2); display: flex; flex-direction: column; gap: .1rem; }
        .pd-ai-meni button { display: flex; flex-direction: column; gap: .05rem; padding: .5rem .6rem; border: 0; border-radius: .55rem; background: none; text-align: left; cursor: pointer; }
        .pd-ai-meni button:hover { background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 8%, transparent); }
        .pd-ai-meni button.on { background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 13%, transparent); }
        .pd-ai-meni b { font: 700 .82rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-ai-meni small { font: 500 .7rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        /* mobilni povzetek (skrit na namizju, kjer plavajo kartice) */
        .pd-povzetek { display: flex; gap: .5rem; margin: .8rem 0 .2rem; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .pd-povzetek::-webkit-scrollbar { display: none; }
        .pd-pov-cip { flex: none; display: inline-flex; align-items: baseline; gap: .35rem; padding: .5rem .75rem; border: 1px solid rgba(255,255,255,.6); border-radius: 999px; background: color-mix(in oklch, oklch(72% .14 var(--h)) 12%, rgba(255,255,255,.6)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); text-decoration: none; white-space: nowrap; }
        .pd-pov-cip b { font: 700 .85rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-pov-cip span { font: 600 .68rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        @media (min-width: 1024px) { .pd-povzetek { display: none; } }

        .pd-hitre { display: flex; flex-wrap: wrap; gap: .45rem; margin: 1rem 0 .9rem; }
        .pd-cip { padding: .45rem .9rem; border: 1px solid rgba(255,255,255,.6); border-radius: 999px; background: color-mix(in oklch, oklch(72% .14 var(--h)) 14%, rgba(255,255,255,.6)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font: 700 .78rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); text-decoration: none; transition: transform .15s ease, box-shadow .15s ease; }
        .pd-cip:hover { transform: translateY(-1px); box-shadow: 0 8px 20px oklch(55% .12 var(--h) / .2); }
        .pd-opomba { margin: 0; font: 500 .72rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }

        /* plavajoče kartice le na širših zaslonih (na telefonu bi bile v napoto) */
        @media (min-width: 1024px) {
          .pd-plava { display: block; }
          /* ZBRANO: 2-stolpčno okence v zgornjem desnem kotu (hitro pregledaš) */
          .pd-plava.zbrano { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; inset: auto; top: 3.7rem; right: 1rem; width: 21rem; z-index: 3; }
          /* zbrane naj ŠE VEDNO nežno lebdijo (zamaknjeno prek inline animationDelay) */
          .pd-plava.zbrano .pd-kartica-wrap { position: static; pointer-events: auto; animation: pdBobMini 6s ease-in-out infinite; }
          .pd-plava.zbrano .pd-kartica { min-width: 0; }
        }

        /* ===== POGOVOR V MESTU: isti chat, spodaj se odvija, panel se izvleče ===== */
        .pd.pogovor { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1.4rem; align-content: center; }
        .pd.pogovor .pd-plava, .pd.pogovor .pd-razpored { display: none; }
        .pd.pogovor .pd-center { width: min(48rem, 94vw); height: calc(100dvh - 4.5rem); display: flex; flex-direction: column; overflow-x: hidden; }
        .pd-nit { flex: 1 1 auto; min-height: 6rem; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: .55rem; padding: .8rem .2rem; scrollbar-width: none; }
        .pd-nit::-webkit-scrollbar { display: none; }
        /* Pupa piše (pike) */
        .pd-tipka { display: inline-flex; gap: .28rem; align-items: center; min-height: 1.3rem; }
        .pd-tipka span { width: .42rem; height: .42rem; border-radius: 50%; background: color-mix(in oklch, var(--ink, #1a1a1a) 38%, transparent); animation: pdTipka 1.2s infinite; }
        .pd-tipka span:nth-child(2) { animation-delay: .2s; }
        .pd-tipka span:nth-child(3) { animation-delay: .4s; }
        @keyframes pdTipka { 0%, 60%, 100% { opacity: .3; } 30% { opacity: 1; } }
        .pd-vr { display: flex; max-width: 90%; min-width: 0; }
        .pd-vr.jaz { align-self: flex-end; }
        .pd-vr.pupa { align-self: flex-start; gap: .55rem; align-items: flex-start; }
        .pd-vr-orb { flex: none; width: 1.9rem; height: 1.9rem; border-radius: 50%; background: conic-gradient(from 210deg, oklch(70% .19 300), oklch(72% .16 200), oklch(80% .13 150), oklch(78% .17 25), oklch(70% .19 300)); box-shadow: inset -2px -2px 5px oklch(100% 0 0 / .35), inset 2px 2px 5px oklch(30% .1 300 / .25); margin-top: .15rem; }
        .pd-vr-body { display: flex; flex-direction: column; gap: .18rem; min-width: 0; }
        .pd-vr.jaz .pd-vr-body { align-items: flex-end; }
        .pd-mehur { position: relative; padding: .6rem .85rem; border-radius: 1.15rem; font: 500 .93rem/1.45 var(--font-sans), sans-serif; box-shadow: 0 6px 18px oklch(40% .06 300 / .1); overflow-wrap: anywhere; word-break: break-word; white-space: pre-line; }
        /* Pupin mehurček: bela barva, ENAKO zaobljeni robovi (base radius 1.15rem), orb poravnan s prvo vrstico, prejšnja velikost pisave */
        .pd-vr.pupa .pd-mehur { position: relative; padding: .6rem .85rem .6rem 2.5rem; background: #fff; color: var(--ink, #1a1a1a); border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 7%, transparent); border-top-left-radius: 5px; }
        .pd-vr.pupa .pd-mehur::before { content: ""; position: absolute; left: .72rem; top: .6rem; width: 1.25rem; height: 1.25rem; border-radius: 50%; background: radial-gradient(58% 48% at 30% 24%, rgba(255,255,255,.92), rgba(255,255,255,0) 62%), conic-gradient(from 210deg, #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); box-shadow: 0 2px 6px rgba(124,58,237,.28); }
        .pd-meh-q { display: block; font-weight: 700; }
        .pd-meh-pod { display: block; margin-top: .1rem; font-weight: 500; font-size: .84em; color: color-mix(in oklch, var(--ink, #1a1a1a) 52%, transparent); }
        .pd-vr.jaz .pd-mehur { background: color-mix(in oklch, oklch(82% .1 165) 55%, #fff); color: var(--ink, #1a1a1a); border-top-right-radius: 5px; padding-right: 2.1rem; transition: opacity .25s ease, background .2s ease; }
        /* neprebrano = obledel mehurček; med urejanjem = SIV (namesto zelenega) */
        .pd-vr.jaz .pd-mehur.caka { opacity: .5; box-shadow: none; }
        .pd-vr.jaz .pd-mehur.ureja { background: color-mix(in oklch, var(--ink, #1a1a1a) 11%, #fff); box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--ink, #1a1a1a) 20%, transparent); }
        /* svinčnik V mehurčku (zgoraj desno); poln ob hoveru ali med urejanjem */
        .pd-vr-pen { position: absolute; top: .38rem; right: .4rem; display: grid; place-items: center; width: 1.4rem; height: 1.4rem; border: 0; border-radius: 50%; background: transparent; color: color-mix(in oklch, var(--ink, #1a1a1a) 40%, transparent); cursor: pointer; opacity: .5; transition: opacity .15s ease, background .15s ease, color .15s ease; }
        .pd-vr.jaz:hover .pd-vr-pen, .pd-mehur.ureja .pd-vr-pen { opacity: 1; }
        .pd-vr-pen:hover { background: color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); color: var(--ink, #1a1a1a); }
        .pd-vr-ikona { display: grid; place-items: center; width: 1.5rem; height: 1.5rem; border: 0; border-radius: 50%; background: transparent; color: color-mix(in oklch, var(--ink, #1a1a1a) 42%, transparent); cursor: pointer; transition: background .15s ease, color .15s ease; }
        .pd-vr-ikona:hover { background: color-mix(in oklch, var(--ink, #1a1a1a) 9%, transparent); color: var(--ink, #1a1a1a); }
        .pd-vr-meta { display: flex; align-items: center; gap: .15rem; padding: 0 .2rem; opacity: 0; transition: opacity .15s ease; }
        .pd-vr:hover .pd-vr-meta, .pd-vr .pd-mehur.caka ~ .pd-vr-meta { opacity: 1; }
        .pd-cak { display: inline-flex; align-items: center; gap: .3rem; color: color-mix(in oklch, var(--ink, #1a1a1a) 48%, transparent); }
        .pd-cakp { width: .3rem; height: .3rem; border-radius: 50%; background: var(--purple, oklch(60% .2 297)); animation: pdCak 1.1s ease-in-out infinite; }
        .pd-cakp:nth-child(2) { animation-delay: .18s; }
        .pd-cakp:nth-child(3) { animation-delay: .36s; }
        @keyframes pdCak { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
        .pd-obd { color: color-mix(in oklch, var(--purple, oklch(58% .2 297)) 78%, transparent); }
        .pd-vr-akc { border: 0; background: none; padding: 0; color: var(--purple, oklch(58% .2 297)); font: 600 .68rem var(--font-sans), sans-serif; cursor: pointer; text-decoration: underline; }
        .pd-vr-akc:hover { opacity: .75; }
        /* vnos VEDNO viden na dnu (ne scrolla z nitjo) */
        .pd.pogovor .pd-vnos { flex: none; }

        /* a/b/c izbire */
        .pd-izbire { display: flex; flex-wrap: wrap; gap: .5rem; padding: .1rem .1rem .3rem; align-self: flex-end; max-width: 92%; }
        .pd-izbira { display: flex; flex-direction: column; align-items: flex-start; gap: .08rem; padding: .5rem .8rem; border: 1px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 26%, transparent); border-radius: .9rem; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 7%, #fff); cursor: pointer; text-align: left; transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
        .pd-izbira:hover { transform: translateY(-1px); box-shadow: 0 8px 20px oklch(55% .12 297 / .18); background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 14%, #fff); }
        .pd-izbira b { font: 700 .85rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-izbira small { font: 500 .68rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        /* KOPIJA kalkulatorjevih chip-podrocje kartic (ikona + ime + kljukica); mobile = čez celo širino */
        .pd-izbire-vec { display: flex; flex-direction: column; gap: .6rem; align-items: flex-start; padding: .1rem .1rem .3rem; width: 100%; }
        .chat-podrocja { display: flex; flex-wrap: wrap; gap: .6rem; margin: 0; max-width: 100%; }
        .chip-podrocje { display: inline-flex; align-items: center; gap: .7rem; background: #fff; border: 1px solid oklch(93% .006 82 / .55); border-radius: 999px; padding: .55rem 1.2rem .55rem .55rem; font-family: inherit; font-size: 1rem; font-weight: 700; color: var(--ink, #1a1a1a); cursor: pointer; box-shadow: 0 2px 10px rgba(35,18,45,.05); transition: border-color .18s, box-shadow .18s, transform .2s cubic-bezier(.34,1.56,.5,1); }
        .chip-podrocje:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(35,18,45,.1); }
        .chip-podrocje .pi-pod { width: 2.15rem; height: 2.15rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex: none; }
        .chip-podrocje .pi-pod svg { width: 1.15rem; height: 1.15rem; }
        .chip-podrocje b { font-weight: 700; }
        .chip-podrocje .chip-kljuk { width: 1.35rem; height: 1.35rem; border-radius: 50%; border: 1.5px solid; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: .78rem; font-weight: 900; margin-left: .3rem; flex: none; transition: background .18s, border-color .18s; }
        @media (max-width: 640px) { .chat-podrocja { flex-direction: column; } .chip-podrocje { width: 100%; } .chip-podrocje .chip-kljuk { margin-left: auto; } }
        .pd-izbire-potrdi { padding: .55rem 1.3rem; border: 0; border-radius: 999px; background: var(--ink, #2a2620); color: var(--paper, #faf7f2); font: 700 .85rem var(--font-sans), sans-serif; cursor: pointer; }
        .pd-izbire-potrdi:disabled { opacity: .4; cursor: default; }

        /* izvlečni desni panel z živim osnutkom */
        .pd-panel { position: relative; z-index: 2; align-self: center; width: min(21rem, 94vw); display: flex; flex-direction: column; gap: .85rem; padding: 1.15rem 1.2rem; background: rgba(255,255,255,.72); backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4); border: 1px solid rgba(255,255,255,.8); border-radius: 1.2rem; box-shadow: 0 20px 55px oklch(40% .08 300 / .18); animation: pdPanelIn .5s cubic-bezier(.2,.85,.25,1) both; }
        @keyframes pdPanelIn { from { opacity: 0; transform: translateX(48px) scale(.98); } to { opacity: 1; transform: none; } }
        .pd-p-glava { display: flex; align-items: center; justify-content: space-between; }
        .pd-p-znak { font: 700 .95rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-p-status { font: 600 .64rem var(--font-sans), sans-serif; padding: .2rem .55rem; border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 12%, transparent); color: var(--purple, oklch(52% .2 297)); }
        .pd-p-polje { display: flex; flex-direction: column; gap: .12rem; }
        .pd-p-ozn { font: 700 .6rem var(--font-sans), sans-serif; letter-spacing: .08em; text-transform: uppercase; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pd-p-vr { font: 600 1rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-p-vr.prazno { color: color-mix(in oklch, var(--ink, #1a1a1a) 35%, transparent); font-weight: 500; }
        .pd-p-postavke { display: flex; flex-direction: column; gap: .3rem; }
        .pd-p-postavke ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .3rem; }
        .pd-p-postavke li { display: flex; align-items: baseline; justify-content: space-between; gap: .8rem; padding: .5rem .65rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 8%, transparent); border-radius: .7rem; background: #fff; animation: pdPostavka .3s ease both; }
        .pd-p-postavke li span { font: 500 .88rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-p-postavke li b { font: 700 .88rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); white-space: nowrap; }
        @keyframes pdPostavka { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .pd-p-prazno { margin: 0; font: 500 .84rem/1.4 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 42%, transparent); }
        .pd-p-doc { display: flex; flex-direction: column; align-items: center; gap: .55rem; padding: 1rem .4rem .3rem; text-align: center; }
        .pd-p-doc svg { color: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 42%, transparent); }
        .pd-p-vsota { display: flex; align-items: baseline; justify-content: space-between; padding-top: .7rem; border-top: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); }
        .pd-p-vsota span { font: 700 .78rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); }
        .pd-p-vsota b { font: 500 1.4rem var(--font-serif), Georgia, serif; color: var(--ink, #1a1a1a); }
        .pd-p-opomba { margin: 0; font: 500 .7rem/1.4 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pd-p-odpri { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; gap: .45rem; border: 0; border-radius: 999px; padding: .75rem 1.2rem; background: var(--purple, oklch(58% .2 297)); color: #fff; font: 700 .88rem var(--font-sans), sans-serif; cursor: pointer; transition: transform .15s ease, box-shadow .2s ease; }
        .pd-p-odpri:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 26px oklch(58% .2 297 / .4); }
        .pd-p-odpri:disabled { opacity: .4; cursor: default; }
        .pd-p-odpri::after { content: ''; position: absolute; top: 0; left: -160%; width: 90%; height: 100%; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.85) 50%, transparent 100%); transform: skewX(-18deg); transition: left .6s cubic-bezier(.19,1,.22,1); pointer-events: none; }
        .pd-p-odpri:hover:not(:disabled)::after { left: 160%; }

        @media (max-width: 899px) {
          .pd.pogovor { flex-direction: column; }
          .pd.pogovor .pd-center { max-height: none; }
          .pd-panel { width: min(36rem, 94vw); }
        }
      `}</style>
    </div>
  );
}

/* ===== Pogovor: tipi ===== */
type Sporocilo = { id: number; kdo: 'jaz' | 'pupa'; besedilo: string; stanje?: 'cakanje' | 'obdelano'; korak?: number };
type Profil = { ime: string; izkusnje: string; podjetje: string; podrocja: string };

/* razčleni "top:8%;left:3%" v React style objekt */
function pozStyle(poz: string): React.CSSProperties {
  const s: React.CSSProperties = {};
  for (const del of poz.split(';')) {
    const [k, v] = del.split(':');
    if (k && v) (s as Record<string, string>)[k.trim()] = v.trim();
  }
  return s;
}
