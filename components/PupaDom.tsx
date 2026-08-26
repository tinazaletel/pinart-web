'use client';

import { getOrganizationContext } from '@/lib/pinartFlowCloud';
import BriefAgent from '@/components/BriefAgent';
import PitchAgent from '@/components/PitchAgent';
import CanvasAgent from '@/components/CanvasAgent';
import AgentTabla from '@/components/AgentTabla';
import RazisciStrankoAgent from '@/components/RazisciStrankoAgent';
import PreglejKonkurencoAgent from '@/components/PreglejKonkurencoAgent';
import { shraniProjekt, preberiProjekti } from '@/lib/projekti';
import { preberiNaloge, shraniNaloge, zabeleziAktivnost, type Naloga } from '@/lib/naloge';
import { jeNamenNaloge, razcleniNalogo, type PupaNalogaOsnutek } from '@/lib/pupaNaloga';

/* PUPA DOM — pogovorni dom (Faza 1). Chat v OSPREDJU (sredina), podatki nadzorne
   plošče PLAVAJO okoli (ambient, glass), aurora v ozadju. »Moderno in sveže«.
   NOVA stran (/kalkulator/dom); obstoječe ostanejo nedotaknjene.
   Plavajoče številke so za zdaj PREDSTAVITVENE (koncept postavitve) — prava
   podatkovna povezava pride v naslednjem koraku. Kartice-v-pogovoru + glas = Faza 2.
   Glej memory: project_pupa_prvi_vmesnik, project_pupa_center_layout_ideja, project_flow_glass_aurora. */

import { useEffect, useRef, useState } from 'react';
import { Palette, Buildings, Browser, Megaphone, Camera, Compass, Layout, Newspaper, DotsThree, FileText, Receipt, Coins, FolderPlus, ListChecks } from '@phosphor-icons/react';
import { lokalniOdgovori } from '@/lib/onboarding';
import { PODROCJA } from '@/lib/pricingCatalog';
import { nalozPogovore, nalozSporocila, ustvariPogovor, dodajSporocilo, izbrisiPogovor, type PupaPogovorPovzetek } from '@/lib/pupaCloud';
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
  const [tip, setTip] = useState<'ponudba' | 'racun' | 'strosek' | 'projekt' | 'naloga' | 'pogodba' | 'retainer' | 'brief' | 'pitch' | 'canvas' | 'tabla' | 'stranka' | 'konkurenca' | null>(null);
  const [ime, setIme] = useState('');
  const [vnos, setVnos] = useState('');
  const [priponka, setPriponka] = useState<File | null>(null);
  const datotekaRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const predlagaj = (t: string) => { setVnos(t); const el = textRef.current; if (el) { el.focus(); el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 220)}px`; } };

  /* AI način (ChatGPT spec): Pupa AI / Moj AI / Brez AI. Vidno ob vnosu, shranjeno.
     Za zdaj selektor izbere + zapomni način; prava Pupa/Moj AI pogovor = Faza 2/3. */
  const [aiNacin, setAiNacin] = useState<'pupa' | 'moj' | 'brez'>('pupa');
  /* Povezani agenti uporabnice (»Moj AI«). Ko izbere svojega, porabo placa
     SVOJEMU ponudniku — Pupin strosek pade na nic. Kljuci ostanejo na strezniku. */
  const [agenti, setAgenti] = useState<{ id: string; label: string }[]>([]);
  const [agent, setAgent] = useState('');
  const orgRef = useRef<string>('');
  useEffect(() => {
    let ziv = true;
    (async () => {
      try {
        const ctx = await getOrganizationContext();
        if (!ctx || !ziv) return;
        orgRef.current = ctx.organizationId;
        const res = await fetch(`/api/ai/povezave?organizationId=${ctx.organizationId}`);
        if (!res.ok) return;
        const d = await res.json();
        const upor = (d?.connections || [])
          .filter((c: { connection_type: string; provider: string; status: string }) =>
            c.connection_type === 'api' && c.provider !== 'custom-mcp' && c.status !== 'disabled')
          .map((c: { id: string; label: string }) => ({ id: c.id, label: c.label }));
        if (ziv) { setAgenti(upor); if (upor.length && !agent) setAgent(upor[0].id); }
      } catch { /* brez povezav ostane Pupa */ }
    })();
    return () => { ziv = false; };
  }, []);
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
  /* Medtem ko Pupa razmišlja, se vprašanja NE zavržejo — postavijo se v vrsto
     in jih do obdelave lahko popraviš ali izbrišeš (Tina, 26. 8. 2026). */
  const [vrsta, setVrsta] = useState<{ id: number; besedilo: string; citat?: string }[]>([]);
  const [urejamVrsto, setUrejamVrsto] = useState<number | null>(null);
  /* Odgovor na konkreten Pupin mehurček — brez prepisovanja starega besedila. */
  const [citat, setCitat] = useState<string | null>(null);
  const prekiniRef = useRef<AbortController | null>(null);
  const klepet = pupaSpor.length > 0;
  const pupaNitRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (klepet) pupaNitRef.current?.scrollTo({ top: pupaNitRef.current.scrollHeight, behavior: 'smooth' }); }, [pupaSpor, pupaCaka, klepet]);
  /* Zgodovina pogovora: SHRANI (za zdaj localStorage — da ob osvežitvi ostane).
     PROPER post-launch: v oblak (Supabase, per-uporabnik, del projektnega/komunikacijskega zapisa). */
  const [pogovorId, setPogovorId] = useState<string | null>(null);
  const [zgodovina, setZgodovina] = useState<PupaPogovorPovzetek[]>([]);
  const [zgodovinaOdprta, setZgodovinaOdprta] = useState(false);
  const nalozenaNit = useRef(false);
  /* Vsak vstop = NOVA seja (prazen pogovor, naslov spet vidiš). Prejšnje seje se
     shranjujejo v oblak in jih najdeš v Zgodovini (desni panel). NE nalagamo zadnje samodejno. */
  useEffect(() => { nalozenaNit.current = true; }, []);
  useEffect(() => {
    if (!nalozenaNit.current) return;
    try { localStorage.setItem('pinart-pupa-nit', JSON.stringify(pupaSpor)); } catch { /* ignore */ }
  }, [pupaSpor]);

  async function odpriZgodovino() { setZgodovina(await nalozPogovore()); setZgodovinaOdprta(true); }
  async function naloziPogovor(id: string) { const spor = await nalozSporocila(id); setPogovorId(id); setPupaSpor(spor); setZgodovinaOdprta(false); }
  function novPogovor() { setPupaSpor([]); setPogovorId(null); setZgodovinaOdprta(false); try { localStorage.removeItem('pinart-pupa-nit'); } catch { /* ignore */ } }
  async function briseZgodovino(id: string) {
    await izbrisiPogovor(id);
    setZgodovina(prev => prev.filter(z => z.id !== id));
    if (id === pogovorId) { setPupaSpor([]); setPogovorId(null); try { localStorage.removeItem('pinart-pupa-nit'); } catch { /* ignore */ } }
  }

  async function posljiPupi(besedilo: string, navedek?: string) {
    const q = besedilo.trim();
    if (!q || pupaCaka) return;
    const zgo = pupaSpor.slice(-8);
    /* Navedek gre v nit in v vprašanje — Pupa mora vedeti, na kaj odgovarjaš. */
    const zVnosom = navedek ? `> ${navedek}\n\n${q}` : q;
    setPupaSpor(s => [...s, { role: 'user', content: zVnosom }]);
    setPupaCaka(true);
    const krmilnik = new AbortController();
    prekiniRef.current = krmilnik;
    // OBLAK: zagotovi pogovor + shrani uporabnikovo sporočilo (degradira brez prijave/oblaka)
    let pid = pogovorId;
    if (!pid) { pid = await ustvariPogovor(q); if (pid) setPogovorId(pid); }
    if (pid) void dodajSporocilo(pid, 'user', zVnosom);
    try {
      const naMoj = aiNacin === 'moj' && agent && orgRef.current;
      const res = naMoj
        ? await fetch('/api/ai/izvedi', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ organizationId: orgRef.current, connectionId: agent, prompt: zVnosom }),
          signal: krmilnik.signal,
        })
        : await fetch('/api/pupa', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          vprasanje: zVnosom,
          kontekst: L('Uporabnik je v Pupa domu (vstopni pomočnik za samostojne kreativce). Pomagaj z nasvetom; če želi USTVARITI ponudbo/račun/projekt/nalogo, ga usmeri na ustrezen gumb v domu — ne izmišljaj si, da si to naredila.',
                      'User is in the Pupa home (entry assistant for freelance creatives). Help with advice; if they want to CREATE a quote/invoice/project/task, point them to the matching button in the home — do not pretend you did it.'),
          zgodovina: zgo,
        }),
        signal: krmilnik.signal,
      });
      const data = await res.json();
      const odg = data.odgovor || data.text || data.napaka || data.error || L('Hmm, nekaj je zaškripalo. Poskusi znova.', 'Hmm, something went wrong. Try again.');
      setPupaSpor(s => [...s, { role: 'assistant', content: odg }]);
      if (pid) void dodajSporocilo(pid, 'assistant', odg);
    } catch (e) {
      /* Uporabnik je pritisnil Stop — brez sporočila o napaki. */
      if ((e as Error)?.name !== 'AbortError') {
        setPupaSpor(s => [...s, { role: 'assistant', content: L('Ne morem do zaledja. Poskusi znova.', 'Cannot reach the backend. Try again.') }]);
      }
    } finally {
      setPupaCaka(false);
      prekiniRef.current = null;
    }
  }

  /* Ko Pupa konca, sama vzame naslednje vprasanje iz vrste. Uredis ali izbrises
     ga lahko, dokler se caka — potem gre v nit kot vsako drugo sporocilo. */
  useEffect(() => {
    if (pupaCaka || !vrsta.length || urejamVrsto !== null) return;
    const [prvo, ...ostalo] = vrsta;
    setVrsta(ostalo);
    void posljiPupi(prvo.besedilo, prvo.citat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pupaCaka, vrsta, urejamVrsto]);

  /* Stop: prekine zahtevo do Pupe in ustavi morebitni govor. */
  const prekini = () => {
    prekiniRef.current?.abort();
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    setPupaCaka(false);
  };

  /* ── PUPA ZAPIŠE NALOGO ───────────────────────────────────────────────────
     Edino orodje, ki ga Pupa zna izpolniti sama. Vrstni red je namenoma
     razčleni → POKAŽI → počakaj na »Ustvari« → zapiši: brez potrditve se ne
     zapiše nič, ker uporabnica ne sme dobiti zapisa, ki ga ni videla.
     Razčlenjevanje je čista funkcija (lib/pupaNaloga + testi), zapis pa gre
     skozi obstoječi lib/naloge, da naloga potuje v oblak kot vsaka druga —
     nobene svoje shrambe in nobenega novega endpointa. */
  const [osnutekNaloge, setOsnutekNaloge] = useState<PupaNalogaOsnutek | null>(null);
  const [ustvarjenaNaloga, setUstvarjenaNaloga] = useState<string | null>(null);

  /* ISO rok v berljiv zapis; brez new Date(), da ne dramimo hidracije */
  const rokIzpis = (iso?: string) => {
    if (!iso) return L('brez roka', 'no deadline');
    const [l, m, d] = iso.split('-');
    return jeEn ? `${d}/${m}/${l}` : `${Number(d)}. ${Number(m)}. ${l}`;
  };

  /* Vrne true, če je vnos prevzela pot »ustvari nalogo« — takrat to ni več
     klepet in tudi ne odpiranje orodja. */
  function ponudiNalogo(besedilo: string): boolean {
    if (!jeNamenNaloge(besedilo)) return false;
    /* projekte beremo ob KLIKU (shramba), ne med renderjem */
    const imenaProjektov = preberiProjekti().map(p => p.naslov).filter(Boolean);
    const osnutek = razcleniNalogo(besedilo, new Date(), imenaProjektov);
    /* brez naslova ni česa potrditi → obdrži staro vedenje (odpre se Task Manager) */
    if (!osnutek) return false;
    setUstvarjenaNaloga(null);
    setOsnutekNaloge(osnutek);
    setPupaSpor(s => [...s,
      { role: 'user', content: besedilo },
      { role: 'assistant', content: L('Tole bom zapisala med Naloge. Preveri in potrdi — dokler ne klikneš »Ustvari«, ni shranjeno nič.',
        'Here is what I would add to Tasks. Check and confirm — nothing is saved until you click “Create”.') },
    ]);
    return true;
  }

  function potrdiNalogo() {
    if (!osnutekNaloge) return;
    const naslov = osnutekNaloge.naslov.trim();
    if (!naslov) return;
    const nova: Naloga = {
      id: 'task_' + Date.now(),
      naslov,
      opis: osnutekNaloge.opis,
      rok: osnutekNaloge.rok,
      /* Naloga.projectId je PROSTO ime projekta (glej lib/naloge), ne ključ */
      projectId: osnutekNaloge.projekt,
      stolpec: osnutekNaloge.stolpec,
      oznake: osnutekNaloge.oznake,
      created: new Date().toISOString(),
    };
    /* obstoječa shramba: shraniNaloge postavi žig in javi oblaku */
    shraniNaloge([...preberiNaloge(), nova]);
    /* v zgodovini naj piše, da je nalogo ustvarila Pupa — da se ve, kdo je pisal */
    zabeleziAktivnost(nova.id, 'Pupa', `Ustvarila nalogo »${nova.naslov}«`);
    setOsnutekNaloge(null);
    setUstvarjenaNaloga(naslov);
    setPupaSpor(s => [...s, { role: 'assistant', content:
      L(`Ustvarila sem nalogo »${naslov}« (rok: ${rokIzpis(nova.rok)}) v stolpcu »Za narediti«, označeno z »pupa«.`,
        `Created the task “${naslov}” (due: ${rokIzpis(nova.rok)}) in the “To do” column, tagged “pupa”.`) }]);
  }

  function zavrniNalogo() {
    setOsnutekNaloge(null);
    setPupaSpor(s => [...s, { role: 'assistant', content: L('V redu, nič nisem zapisala.', 'Fine, nothing was saved.') }]);
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
    /* Pupa razmišlja: vprašanje gre v vrsto, ne v koš. Urejanje vrstnega zapisa
       samo posodobi zapis in ga pusti v vrsti. */
    if ((aiNacin === 'pupa' || aiNacin === 'moj') && (pupaCaka || vrsta.length > 0 || urejamVrsto !== null)) {
      if (urejamVrsto !== null) {
        const idU = urejamVrsto;
        setVrsta(v => v.map(x => (x.id === idU ? { ...x, besedilo: t } : x)));
        setUrejamVrsto(null);
      } else {
        setVrsta(v => [...v, { id: Date.now() + v.length, besedilo: t, citat: citat || undefined }]);
      }
      setCitat(null);
      setVnos(''); if (el) el.style.height = 'auto';
      return;
    }
    const cilj = zaznajTip(t.toLowerCase());
    // NALOGO Pupa napiše sama — a najprej pokaže osnutek v potrditveni kartici.
    // Teče PRED izbiro AI načina, ker razčlenjevanje ne rabi AI: vse ostane v brskalniku.
    if (ponudiNalogo(t)) { setVnos(''); if (el) el.style.height = 'auto'; return; }
    // AI način (Pupa / Moj AI): JASEN namen ustvarjanja → odpre orodje; sicer = KLEPET (NE vsili ponudbe).
    if (aiNacin === 'pupa' || aiNacin === 'moj') {
      const nav = citat; setCitat(null);
      setVnos(''); if (el) el.style.height = 'auto';
      if (cilj) { intentRef.current = t; setTip(cilj); }
      else posljiPupi(t, nav || undefined);
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
    { labela: L('Za plačilo', 'Awaiting payment'), vrednost: '1.350 €', h: 25, poz: 'bottom:18%;left:5%', d: 2.6, href: `${base}/kalkulator/racuni` },
    { labela: L('Naloge danes', 'Tasks today'), vrednost: '4', h: 297, poz: 'top:9%;right:5%', d: .7, href: `${base}/kalkulator/naloge` },
    { labela: L('Mesečni cilj', 'Monthly goal'), vrednost: '68 %', h: 60, poz: 'top:35%;right:7%', d: 2, href: `${base}/kalkulator/cilji` },
    { labela: L('Nova sporočila', 'New messages'), vrednost: '2', h: 320, poz: 'bottom:18%;right:5%', d: 3.2, href: `${base}/kalkulator/komunikacija` },
  ];

  /* Devet gumbov naenkrat je seznam, ne ponudba. Prvih sest pokrije vsakdan,
     ostalo pride na klik — da vstop ostane vabilo, ne kazalo. */
  const [vseAkcije, setVseAkcije] = useState(false);

  /* Orodje se da odpreti tudi iz naslova (?orodje=brief). Beremo iz
     window.location, NE useSearchParams — ta zahteva force-dynamic in nam je
     ze enkrat ustavil gradnjo. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const zeljeno = new URLSearchParams(window.location.search).get('orodje') || '';
    const dovoljena = ['ponudba', 'racun', 'strosek', 'projekt', 'naloga', 'brief', 'pitch', 'canvas', 'tabla', 'stranka', 'konkurenca', 'pogodba', 'retainer'];
    if (dovoljena.includes(zeljeno)) setTip(zeljeno as typeof tip);
  }, []);

  /* hitre akcije = lahki POGOVORNI predlogi (napolnijo vnos), ne le linki (ChatGPT) */
  const hitre: { ime: string; tip?: typeof tip; href?: string; h: number; ikona: React.ReactNode }[] = [
    { ime: L('Pripravi ponudbo', 'Create a quote'), tip: 'ponudba', h: 297, ikona: <FileText size={16} weight="bold" /> },
    { ime: L('Izdaj račun', 'Issue an invoice'), tip: 'racun', h: 200, ikona: <Receipt size={16} weight="bold" /> },
    { ime: L('Dodaj strošek', 'Add an expense'), tip: 'strosek', h: 60, ikona: <Coins size={16} weight="bold" /> },
    { ime: L('Ustvari projekt', 'Start a project'), tip: 'projekt', h: 150, ikona: <FolderPlus size={16} weight="bold" /> },
    { ime: L('Ustvari nalogo', 'Create task'), tip: 'naloga', h: 250, ikona: <ListChecks size={16} weight="bold" /> },
    /* Brief je prva akcija, kjer pogovor konca z ZAPISOM na projektu — ne z
       nasvetom, kateri gumb klikniti. Pitch pride po istem vzorcu kasneje. */
    { ime: L('Napiši brief', 'Write a brief'), tip: 'brief', h: 120, ikona: <FileText size={16} weight="bold" /> },
    { ime: L('Napiši pitch', 'Write a pitch'), tip: 'pitch', h: 180, ikona: <FileText size={16} weight="bold" /> },
    { ime: L('Napiši canvas', 'Write the canvas'), tip: 'canvas', h: 210, ikona: <FileText size={16} weight="bold" /> },
    { ime: L('Več nalog hkrati', 'Several tasks at once'), tip: 'tabla', h: 140, ikona: <ListChecks size={16} weight="bold" /> },
    { ime: L('Razišči stranko', 'Research a client'), tip: 'stranka', h: 25, ikona: <Buildings size={16} weight="bold" /> },
    { ime: L('Preglej konkurenco', 'Review competitors'), tip: 'konkurenca', h: 330, ikona: <Compass size={16} weight="bold" /> },
    // Štoparica umaknjena iz vstopa: ni »ustvari« akcija; dostopna v meniju (Čas) in prek Pupe (»zaženi štoparico«).
  ];

  // IZBRAN TIP → orodje se odpre V ISTEM oknu (brez navigacije). Stalni okvir že obstaja:
  // stranski meni (s preklopom Pupa/Home) ostane; klik »Pupa« te vrne na vstop. Orodja = obstoječe komponente.
  if (tip === 'ponudba') return <KalkulatorApp locale={locale} vLupini />;
  if (tip === 'racun') return <InvoiceWorkspace base={base} />;
  if (tip === 'strosek') return <ExpenseWorkspace />;
  if (tip === 'projekt') return <NovProjektWorkspace base={base} />;
  if (tip === 'naloga') return <TaskManagerWorkspace />;
  if (tip === 'brief') return <BriefAgent base={base} />;
  if (tip === 'pitch') return <PitchAgent base={base} onSave={(pitch, projekt) => {
    /* Pitch pristane NA PROJEKTU — enako kot brief. Rezultat, ki nima kam
       pristati, je le lepse zavit klepet. */
    shraniProjekt({ ...projekt, pitch });
  }} />;
  if (tip === 'canvas') return <CanvasAgent base={base} />;
  if (tip === 'tabla') return <AgentTabla />;
  if (tip === 'stranka') return <RazisciStrankoAgent base={base} />;
  if (tip === 'konkurenca') return <PreglejKonkurencoAgent base={base} />;
  if (tip === 'pogodba') return <ContractWorkspace base={base} />;
  if (tip === 'retainer') return <RetainerWorkspace base={base} vLupini />;

  return (
    <div className={`pd${klepet ? ' pogovor' : ''}`}>
      <div className="pd-aurora" aria-hidden><i className="a1" /><i className="a2" /><i className="a3" /></div>

      {/* Pupino srce: ko je AI Pupa živa, poleg aurore utripa mehki modro-vijola gradient (srčni utrip) */}
      {aiNacin === 'pupa' && <div className={`pd-srce${pupaCaka ? ' bije' : ''}`} aria-hidden />}

      {/* Gumb: zberi tage v kot / razprši nazaj (le namizje) */}
      {!zgodovinaOdprta && <button type="button" className="pd-razpored" onClick={preklopiRazpored} aria-pressed={zbrano}
        title={zbrano ? L('Razprši kartice', 'Scatter cards') : L('Zberi v kot', 'Collect to corner')}>
        {zbrano ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
        )}
      </button>}

      {/* Zgodovina Pupinih pogovorov — subtilen gumb desno, panel ZDRSNE z desne (kot ChatGPT/Claude) */}
      {!zgodovinaOdprta && (
        <button type="button" className="pd-zgod-trig" onClick={odpriZgodovino} aria-expanded={zgodovinaOdprta} aria-label={L('Zgodovina pogovorov', 'Chat history')} title={L('Zgodovina', 'History')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l3 2" /></svg>
        </button>
      )}
      {zgodovinaOdprta && <div className="pd-zgod-back" onClick={() => setZgodovinaOdprta(false)} aria-hidden />}
      <aside className={`pd-zgod-panel${zgodovinaOdprta ? ' odprt' : ''}`} aria-hidden={!zgodovinaOdprta}>
        <div className="pd-zgod-glava">
          <span>{L('Zgodovina', 'History')}</span>
          <button type="button" className="pd-zgod-x" onClick={() => setZgodovinaOdprta(false)} aria-label={L('Zapri', 'Close')}>×</button>
        </div>
        <button type="button" className="pd-zgod-nov" onClick={novPogovor}>+ {L('Nov pogovor', 'New chat')}</button>
        <div className="pd-zgod-seznam">
          {zgodovina.length === 0
            ? <p className="pd-zgod-prazno">{L('Ni shranjenih pogovorov.', 'No saved chats.')}</p>
            : zgodovina.map(z => (
              <div key={z.id} className={'pd-zgod-el' + (z.id === pogovorId ? ' on' : '')}>
                <button type="button" className="pd-zgod-el-odpri" onClick={() => naloziPogovor(z.id)}>
                  <b>{z.naslov || L('Pogovor', 'Chat')}</b>
                  <small>{new Date(z.updated_at).toLocaleString(jeEn ? 'en-GB' : 'sl-SI', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
                </button>
                <button type="button" className="pd-zgod-el-brisi" onClick={() => briseZgodovino(z.id)} aria-label={L('Izbriši pogovor', 'Delete chat')} title={L('Izbriši', 'Delete')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                </button>
              </div>
            ))}
        </div>
      </aside>

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
            {pupaSpor.map((m, i) => {
              /* Sporočilo z navedkom se je poslalo kot »> navedek\n\nvprašanje«;
                 v niti ga pokažemo kot navedek nad besedilom, ne kot znak >. */
              const jeNavedek = m.role === 'user' && m.content.startsWith('> ');
              const nav = jeNavedek ? m.content.slice(2, m.content.indexOf('\n\n')) : '';
              const telo = jeNavedek ? m.content.slice(m.content.indexOf('\n\n') + 2) : m.content;
              return (
                <div key={i} className={`pd-vr ${m.role === 'user' ? 'jaz' : 'pupa'}`}>
                  <div className="pd-vr-body">
                    <div className="pd-mehur">
                      {nav && <span className="pd-navedek">{nav}</span>}
                      {telo}
                    </div>
                    {m.role === 'assistant' && (
                      <div className="pd-vr-meta">
                        <button type="button" className="pd-odgovori" onClick={() => { setCitat(m.content.length > 160 ? m.content.slice(0, 160).trimEnd() + '…' : m.content); textRef.current?.focus(); }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 17l-6-5 6-5" /><path d="M3 12h11a6 6 0 0 1 6 6v2" /></svg>
                          {L('Odgovori', 'Reply')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {pupaCaka && (
              <div className="pd-vr pupa"><div className="pd-vr-body"><div className="pd-mehur pd-tipka"><span /><span /><span /></div></div></div>
            )}
            {/* Vrsta: kar si napisala med tem, ko Pupa razmišlja. Do obdelave
                se da urediti ali izbrisati. */}
            {vrsta.map(v => (
              <div key={v.id} className="pd-vr jaz">
                <div className="pd-vr-body">
                  <div className={'pd-mehur caka' + (urejamVrsto === v.id ? ' ureja' : '')}>
                    {v.citat && <span className="pd-navedek">{v.citat}</span>}
                    {v.besedilo}
                  </div>
                  <div className="pd-vr-meta">
                    <span className="pd-caka-znak">{L('v čakanju', 'queued')}</span>
                    <button type="button" className="pd-vr-ikona" title={L('Uredi', 'Edit')} aria-label={L('Uredi', 'Edit')}
                      onClick={() => { setVnos(v.besedilo); setUrejamVrsto(v.id); textRef.current?.focus(); }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                    </button>
                    <button type="button" className="pd-vr-ikona" title={L('Izbriši', 'Delete')} aria-label={L('Izbriši', 'Delete')}
                      onClick={() => { setVrsta(prev => prev.filter(x => x.id !== v.id)); if (urejamVrsto === v.id) { setUrejamVrsto(null); setVnos(''); } }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* POTRDITEV PRED ZAPISOM: kartica pokaže, KAJ bo Pupa ustvarila.
                Naslov in rok se dasta popraviti (razčlenjevanje se lahko zmoti),
                zapis se zgodi šele ob kliku »Ustvari«. */}
            {osnutekNaloge && (
              <div className="pd-potrdi" role="group" aria-label={L('Nova naloga — potrditev', 'New task — confirmation')}>
                <div className="pd-potrdi-glava">
                  <span className="pd-potrdi-znak">{L('Nova naloga', 'New task')}</span>
                  <span className="pd-potrdi-status">{L('še ni shranjeno', 'not saved yet')}</span>
                </div>
                <label className="pd-potrdi-polje">
                  <span>{L('Naslov', 'Title')}</span>
                  <input value={osnutekNaloge.naslov} onChange={e => setOsnutekNaloge(o => (o ? { ...o, naslov: e.target.value } : o))} />
                </label>
                <label className="pd-potrdi-polje">
                  <span>{L('Rok', 'Due date')}</span>
                  <input type="date" value={osnutekNaloge.rok || ''} onChange={e => setOsnutekNaloge(o => (o ? { ...o, rok: e.target.value || undefined } : o))} />
                </label>
                <div className="pd-potrdi-polje"><span>{L('Stolpec', 'Column')}</span><b>{L('Za narediti', 'To do')}</b></div>
                {osnutekNaloge.projekt && <div className="pd-potrdi-polje"><span>{L('Projekt', 'Project')}</span><b>{osnutekNaloge.projekt}</b></div>}
                {osnutekNaloge.opis && <div className="pd-potrdi-polje"><span>{L('Opis', 'Notes')}</span><b>{osnutekNaloge.opis}</b></div>}
                <p className="pd-potrdi-opomba">
                  {osnutekNaloge.rokIzraz
                    ? L(`Rok sem razbrala iz »${osnutekNaloge.rokIzraz}«. Nalogo označim z »pupa«, da veš, da je moja.`,
                        `I read the due date from “${osnutekNaloge.rokIzraz}”. I tag the task “pupa” so you know it is mine.`)
                    : L('Roka nisem našla — dodaš ga lahko zgoraj. Nalogo označim z »pupa«, da veš, da je moja.',
                        'I found no due date — you can add one above. I tag the task “pupa” so you know it is mine.')}
                </p>
                <div className="pd-potrdi-akc">
                  <button type="button" className="pd-potrdi-ne" onClick={zavrniNalogo}>{L('Prekliči', 'Cancel')}</button>
                  <button type="button" className="pd-potrdi-da" onClick={potrdiNalogo} disabled={!osnutekNaloge.naslov.trim()}>{L('Ustvari', 'Create')}</button>
                </div>
              </div>
            )}

            {/* Po zapisu: pot do naloge, da ni treba iskati po meniju. <a> in ne
                <Link>, ker styled-jsx <Link> ne scopa (glej reference v memory). */}
            {ustvarjenaNaloga && !osnutekNaloge && (
              <a className="pd-potrdi-link" href={`${base}/kalkulator/naloge`}>{L('Odpri Naloge', 'Open Tasks')} <span aria-hidden>→</span></a>
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
                  <button type="button" role="menuitem" className={aiNacin === 'moj' ? 'on' : ''} onClick={() => izberiAi('moj')}><b>{L('Moj AI', 'My AI')}</b><small>{agenti.length
                    ? L('Porabo plačaš svojemu ponudniku.', 'You pay usage to your provider.')
                    : L('Poveži svoj AI v Nastavitvah → Moj AI.', 'Connect your AI in Settings → My AI.')}</small></button>
                  {aiNacin === 'moj' && agenti.length > 1 && agenti.map(a => (
                    /* Ko je povezanih vec agentov, izberes, kateri odgovarja */
                    <button key={a.id} type="button" role="menuitem" className={'pd-ai-pod' + (agent === a.id ? ' on' : '')}
                      onClick={() => { setAgent(a.id); setAiOdprt(false); }}>{a.label}</button>
                  ))}
                  <button type="button" role="menuitem" className={aiNacin === 'brez' ? 'on' : ''} onClick={() => izberiAi('brez')}><b>{L('Brez AI', 'No AI')}</b><small>{L('Klasični vprašalniki; nič ne gre zunanjemu AI.', 'Classic questionnaires; nothing goes to an external AI.')}</small></button>
                </div>
              )}
            </div>
          </div>
          {citat && (
            <div className="pd-citat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 17l-6-5 6-5" /><path d="M3 12h11a6 6 0 0 1 6 6v2" /></svg>
              <span>{citat}</span>
              <button type="button" className="pd-citat-x" onClick={() => setCitat(null)} aria-label={L('Prekliči odgovor', 'Cancel reply')}>×</button>
            </div>
          )}
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
              <button type="button" className={`pd-mik${poslusam ? ' posluam' : ''}`} onClick={glas} title={poslusam ? L('Poslušam … zaključi tukaj', 'Listening … click to stop') : L('Govori', 'Speak')} aria-label={L('Glas', 'Voice')} aria-pressed={poslusam}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
              </button>
              {/* Med razmišljanjem se da še vedno pisati: gumb takrat postavi
                  vprašanje v vrsto, ustavljanje pa dobi svoj gumb ob strani. */}
              {pupaCaka && (
                <button type="button" className="pd-ustavi" onClick={prekini} aria-label={L('Ustavi', 'Stop')} title={L('Ustavi', 'Stop')}>
                  <span aria-hidden style={{ width: '.6rem', height: '.6rem', background: 'currentColor', borderRadius: 2, display: 'inline-block' }} />
                </button>
              )}
              {pupaCaka && !vnos.trim() ? null : (
                <button type="button" className="pd-poslji" onClick={posljiVnos}>
                  {urejamVrsto !== null ? L('Shrani', 'Save')
                    : pupaCaka || vrsta.length ? L('V vrsto', 'Queue')
                      : klepet ? L('Pošlji', 'Send') : L('Začni', 'Start')} <span aria-hidden>→</span>
                </button>
              )}
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
                <a key={i} href={p.href} className="pd-pov-cip" style={{ ['--h' as string]: String(p.h), animationDelay: `${(i % 3) * 0.5}s` }}>
                  <span className="pd-k-pika" />
                  <b>{p.vrednost}</b><small>{p.labela}</small>
                </a>
              ))}
            </div>

            <div className="pd-hitre">
              {(vseAkcije ? hitre : hitre.slice(0, 6)).map(h => (
                <button type="button" key={h.ime} className="pd-cip" style={{ ['--h' as string]: String(h.h) }} onClick={() => { if (h.href) { if (typeof window !== 'undefined') window.location.href = h.href; } else if (h.tip) setTip(h.tip); }}><span className="pd-cip-ik" aria-hidden>{h.ikona}</span>{h.ime}</button>
              ))}
              {hitre.length > 6 && (
                <button type="button" className="pd-vec" aria-expanded={vseAkcije}
                  onClick={() => setVseAkcije(v => !v)}>
                  {vseAkcije ? L('Manj', 'Less') : L('Več', 'More')}
                </button>
              )}
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
        /* Pupino srce (živa AI): mehki modro-vijola gradient za pogovorom, nežen srčni utrip */
        /* ISTA animacija kot stranska Pupa (pupaBlob): organsko se preliva — border-radius morfa + vrti + rahlo diha, BREZ utripa */
        .pd-srce { position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%); width: min(49vw, 38rem); height: min(49vw, 38rem); z-index: 1; pointer-events: none; border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%; filter: blur(42px); background: radial-gradient(circle at 40% 34%, oklch(64% .26 290 / .98), oklch(70% .2 262 / .72) 52%, transparent 74%); animation: pdSrceBlob 8s ease-in-out infinite; will-change: transform, border-radius; }
        .pd-srce.bije { animation-duration: 4.5s; }
        @keyframes pdSrceBlob {
          0%, 100% { border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%; transform: translate(-50%, -50%) rotate(0deg) scale(1); }
          33% { border-radius: 62% 38% 42% 58% / 55% 62% 38% 45%; transform: translate(-50%, -50%) rotate(120deg) scale(1.1); }
          66% { border-radius: 45% 55% 62% 38% / 40% 52% 48% 60%; transform: translate(-50%, -50%) rotate(240deg) scale(.95); }
        }
        @media (prefers-reduced-motion: reduce) { .pd-srce { animation: none; } }

        .pd-plava { position: absolute; inset: 0; z-index: 1; pointer-events: none; display: none; }
        /* gumb za preklop razporeda (zberi v kot / razprši) */
        .pd-razpored { position: fixed; top: 4.3rem; right: 4.6rem; z-index: 63; display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 14%, transparent); border-radius: 50%; background: rgba(255,255,255,.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); cursor: pointer; transition: background .15s ease, color .15s ease, border-color .15s ease; }
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
        .pd:not(.pogovor) .pd-povzetek { order: 6; margin-top: 1.1rem; }
        .pd:not(.pogovor) .pd-hitre { order: 4; margin-bottom: 1.15rem; }
        .pd:not(.pogovor) .pd-vnos { order: 5; }
        .pd-glava { display: flex; align-items: center; gap: .8rem; margin-bottom: .4rem; }
        .pd-orb { flex: none; width: 3rem; height: 3rem; border-radius: 50%; background: conic-gradient(from 210deg, oklch(70% .19 300), oklch(72% .16 200), oklch(80% .13 150), oklch(78% .17 25), oklch(70% .19 300)); box-shadow: 0 8px 22px oklch(60% .18 300 / .38), inset -3px -4px 8px oklch(100% 0 0 / .35), inset 3px 4px 8px oklch(30% .1 300 / .25); animation: pdOrb 8s ease-in-out infinite; }
        @keyframes pdOrb { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-3px) rotate(8deg); } }
        .pd-eyebrow { margin: 0 0 .15rem; font: 800 .62rem var(--font-sans), sans-serif; letter-spacing: .18em; color: var(--purple, oklch(60% .2 297)); }
        .pd-naslov { margin: 0; font: 500 clamp(1.45rem, 3.4vw, 2.05rem)/1.1 var(--font-serif), Georgia, serif; font-synthesis: none; color: var(--ink, #1a1a1a); letter-spacing: -.01em; text-wrap: balance; }
        .pd-uvod { margin: .15rem 0 1.1rem; font: 500 .98rem/1.5 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); }
        /* Zgodovina: subtilen gumb desno (levo od razpored) + panel zdrsne z desne */
        /* zgodovina VEDNO vidna: fixed na viewport (pod glavo), da ne odplava ob scrollu */
        .pd-zgod-trig { position: fixed; top: 4.3rem; right: 1.6rem; z-index: 63; display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 14%, transparent); border-radius: 50%; background: rgba(255,255,255,.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); cursor: pointer; transition: background .15s ease, color .15s ease; box-shadow: 0 4px 14px oklch(40% .06 300 / .14); }
        .pd-zgod-trig:hover { background: #fff; color: var(--ink, #1a1a1a); }
        .pd-zgod-back { position: fixed; inset: 0; z-index: 60; background: oklch(30% .03 300 / .18); animation: pdFade .2s ease; }
        @keyframes pdFade { from { opacity: 0; } to { opacity: 1; } }
        .pd-zgod-panel { position: fixed; top: 0; right: 0; z-index: 61; height: 100dvh; width: min(20rem, 86vw); display: flex; flex-direction: column; gap: .5rem; padding: 4rem .8rem 1rem; background: #fff; border-left: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); box-shadow: -14px 0 40px oklch(40% .08 300 / .16); transform: translateX(100%); transition: transform .28s cubic-bezier(.2,.85,.25,1); }
        .pd-zgod-panel.odprt { transform: translateX(0); }
        .pd-zgod-glava { display: flex; align-items: center; justify-content: space-between; }
        .pd-zgod-glava span { font: 500 1rem var(--font-serif, Georgia), serif; color: var(--ink, #1a1a1a); }
        .pd-zgod-x { border: 0; background: none; font-size: 1.4rem; line-height: 1; color: color-mix(in oklch, var(--ink, #1a1a1a) 50%, transparent); cursor: pointer; }
        .pd-zgod-nov { display: inline-flex; align-items: center; gap: .3rem; align-self: flex-start; padding: .45rem .8rem; border: 1px solid color-mix(in oklch, var(--purple, oklch(58% .2 297)) 30%, transparent); border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(58% .2 297)) 8%, #fff); color: var(--purple, oklch(52% .2 297)); font: 700 .78rem var(--font-sans), sans-serif; cursor: pointer; }
        .pd-zgod-nov:hover { background: color-mix(in oklch, var(--purple, oklch(58% .2 297)) 14%, #fff); }
        .pd-zgod-seznam { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: .15rem; margin-top: .3rem; }
        .pd-zgod-prazno { margin: .5rem .2rem; font: 500 .82rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pd-zgod-el { display: flex; align-items: center; gap: .2rem; width: 100%; border-radius: .6rem; }
        .pd-zgod-el:hover { background: color-mix(in oklch, var(--ink, #1a1a1a) 5%, transparent); }
        .pd-zgod-el.on { background: color-mix(in oklch, var(--purple, oklch(58% .2 297)) 10%, transparent); }
        .pd-zgod-el-odpri { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: .1rem; text-align: left; padding: .55rem .6rem; border: 0; background: none; cursor: pointer; }
        .pd-zgod-el b { max-width: 100%; font: 600 .84rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pd-zgod-el small { font: 500 .68rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pd-zgod-el-brisi { flex: none; display: grid; place-items: center; width: 1.9rem; height: 1.9rem; margin-right: .25rem; border: 0; border-radius: .5rem; background: none; color: color-mix(in oklch, var(--ink, #1a1a1a) 40%, transparent); cursor: pointer; opacity: 0; transition: opacity .15s ease, color .15s ease, background .15s ease; }
        .pd-zgod-el:hover .pd-zgod-el-brisi, .pd-zgod-el-brisi:focus-visible { opacity: 1; }
        .pd-zgod-el-brisi:hover { color: oklch(58% .2 25); background: color-mix(in oklch, oklch(58% .2 25) 12%, transparent); }

        /* position+z-index: backdrop-filter naredi .pd-vnos svoj stacking context;
           brez tega dvига čipi (tudi backdrop-filter) prekrijejo AI meni. */
        /* brez zunanje sence (workspace jo reže) — obroba za globino */
        .pd-vnos { position: relative; z-index: 20; display: flex; flex-direction: column; gap: .5rem; background: rgba(255,255,255,.55); backdrop-filter: blur(22px) saturate(1.45); -webkit-backdrop-filter: blur(22px) saturate(1.45); border: 1px solid rgba(255,255,255,.6); border-radius: 1.2rem; padding: .95rem 1rem; box-shadow: 0 8px 30px oklch(40% .08 300 / .1), inset 0 1px 0 rgba(255,255,255,.5); }
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
        .pd-povzetek { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; margin: .8rem 0 .2rem; }
        .pd-povzetek::-webkit-scrollbar { display: none; }
        /* mobilne kartice = ENAK stil kot desktop (steklo, pika, robovi, stolpec) + nežno lebdenje */
        .pd-pov-cip { position: relative; display: flex; flex-direction: column; gap: .12rem; min-width: 0; padding: .8rem .95rem; border: 1px solid rgba(255,255,255,.6); border-radius: 1.1rem; background: color-mix(in oklch, oklch(72% .13 var(--h)) 10%, rgba(255,255,255,.58)); backdrop-filter: blur(14px) saturate(1.25); -webkit-backdrop-filter: blur(14px) saturate(1.25); box-shadow: 0 10px 30px oklch(50% .1 var(--h) / .14); text-decoration: none; animation: pdBobMini 6s ease-in-out infinite; transition: transform .2s ease, box-shadow .2s ease; }
        .pd-pov-cip:active { transform: scale(.98); }
        .pd-pov-cip b { font: 700 1rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-pov-cip small { font: 600 .66rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 1024px) { .pd-povzetek { display: none; } }

        .pd-hitre { display: flex; flex-wrap: wrap; gap: .45rem; margin: 1rem 0 .9rem; }
        .pd-cip { display: inline-flex; align-items: center; gap: .4rem; min-height: 2.5rem; padding: .55rem 1rem; border: 1px solid rgba(255,255,255,.6); border-radius: 999px; background: color-mix(in oklch, oklch(72% .14 var(--h)) 14%, rgba(255,255,255,.6)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font: 700 .8rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); text-decoration: none; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
        .pd-cip-ik { display: inline-flex; color: color-mix(in oklch, oklch(58% .2 var(--h)) 85%, var(--ink, #1a1a1a)); }
        .pd-vec { align-self: center; padding: .55rem .3rem; border: 0; background: none; font: 700 .8rem var(--font-sans), sans-serif; color: #6E4FA6; text-decoration: underline; text-underline-offset: .22em; cursor: pointer; }
        .pd-vec:hover { text-decoration-thickness: 2px; }
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

        /* iPad / ožji zaslon (1024–1200): plavajoče kartice ostanejo raztresene, a se NE
           dotikajo besedila/vnosa — sredinski stolpec je ožji, kartice manjše -> nastane
           vodoravna zračnost na obeh straneh. */
        @media (min-width: 1024px) and (max-width: 1200px) {
          .pd:not(.pogovor) .pd-center { width: min(34rem, 82vw); }
          .pd-plava .pd-kartica { min-width: 6.5rem; padding: .6rem .7rem; }
        }

        /* ===== POGOVOR V MESTU: isti chat, spodaj se odvija, panel se izvleče ===== */
        /* Pogovor: vnos PRIPET na dno, sporočila drsijo (scrollbar skrit). overflow: visible na
           .pd/.pd-center, da sence (vnos, mehurčki) NISO odrezane; drsi le nit (z vodoravnim paddingom
           za sence mehurčkov). */
        /* Pogovor kot KALKULATOR: naravni tok (stran/kontent se pomika), VNOS = position:fixed na
           viewport dno (isti vzorec kot .cw .noga). Sporočila dobijo spodnji prostor za pripeti vnos. */
        .pd.pogovor { display: block; overflow: visible; }
        .pd.pogovor .pd-plava, .pd.pogovor .pd-razpored { display: none; }
        .pd.pogovor .pd-center { width: min(48rem, 94vw); margin: 0 auto; min-height: calc(100dvh - 4.5rem); display: block; overflow: visible; }
        .pd-nit { display: flex; flex-direction: column; gap: .55rem; padding: .8rem 1.2rem 7.5rem; }
        .pd-nit::-webkit-scrollbar { display: none; }
        /* Pupa piše (pike) */
        .pd-tipka { display: inline-flex; gap: .3rem; align-items: center; min-height: 1.5rem; }
        /* orb navpično centriran v »piše« oblačku, da ne štrli in oblaček obda vsebino */
        .pd-vr.pupa .pd-mehur.pd-tipka::before { top: 50%; transform: translateY(-50%); }
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
        .pd-vr.pupa .pd-mehur { position: relative; padding: .6rem .85rem .6rem 2.5rem; background: rgba(255,255,255,.62); backdrop-filter: blur(16px) saturate(1.3); -webkit-backdrop-filter: blur(16px) saturate(1.3); color: var(--ink, #1a1a1a); border: 1px solid rgba(255,255,255,.7); border-top-left-radius: 5px; }
        .pd-vr.pupa .pd-mehur::before { content: ""; position: absolute; left: .72rem; top: .6rem; width: 1.25rem; height: 1.25rem; border-radius: 50%; background: radial-gradient(58% 48% at 30% 24%, rgba(255,255,255,.92), rgba(255,255,255,0) 62%), conic-gradient(from 210deg, #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); box-shadow: 0 2px 6px rgba(124,58,237,.28); }
        .pd-meh-q { display: block; font-weight: 700; }
        .pd-meh-pod { display: block; margin-top: .1rem; font-weight: 500; font-size: .84em; color: color-mix(in oklch, var(--ink, #1a1a1a) 52%, transparent); }
        .pd-vr.jaz .pd-mehur { background: color-mix(in oklch, oklch(84% .13 165) 42%, rgba(255,255,255,.5)); backdrop-filter: blur(16px) saturate(1.3); -webkit-backdrop-filter: blur(16px) saturate(1.3); color: var(--ink, #1a1a1a); border: 1px solid color-mix(in oklch, oklch(80% .12 165) 40%, rgba(255,255,255,.5)); border-top-right-radius: 5px; padding-right: 2.1rem; transition: opacity .25s ease, background .2s ease; }
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
        /* »v čakanju«: kar si napisala, medtem ko je Pupa razmišljala */
        .pd-caka-znak { margin-right: .25rem; font-size: .68rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pd-vr.jaz .pd-mehur.caka.ureja { opacity: .85; outline: 2px dashed color-mix(in oklch, var(--purple, oklch(66% .2 297)) 55%, transparent); outline-offset: 2px; }
        /* odgovor na konkreten mehurček */
        .pd-odgovori { display: inline-flex; align-items: center; gap: .3rem; padding: .18rem .5rem; border: 0; border-radius: 999px; background: transparent; color: color-mix(in oklch, var(--ink, #1a1a1a) 52%, transparent); font: 600 .74rem var(--font-sans), sans-serif; cursor: pointer; transition: background .15s ease, color .15s ease; }
        .pd-odgovori:hover { background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 12%, transparent); color: var(--purple, oklch(58% .2 297)); }
        .pd-navedek { display: block; margin-bottom: .4rem; padding-left: .6rem; border-left: 2px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 55%, transparent); font-size: .82rem; line-height: 1.45; color: color-mix(in oklch, var(--ink, #1a1a1a) 58%, transparent); }
        .pd-citat { display: flex; align-items: center; gap: .45rem; padding: .5rem .65rem; border-left: 2px solid var(--purple, oklch(66% .2 297)); border-radius: 0 8px 8px 0; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 7%, transparent); font-size: .82rem; color: color-mix(in oklch, var(--ink, #1a1a1a) 70%, transparent); }
        .pd-citat > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pd-citat svg { flex: none; color: var(--purple, oklch(58% .2 297)); }
        .pd-ustavi { display: grid; place-items: center; width: 2.1rem; height: 2.1rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 16%, transparent); border-radius: 50%; background: transparent; color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); cursor: pointer; }
        .pd-ustavi:hover { background: color-mix(in oklch, var(--ink, #1a1a1a) 7%, transparent); color: var(--ink, #1a1a1a); }
        .pd-citat-x { flex: none; border: 0; background: transparent; color: inherit; font-size: 1.05rem; line-height: 1; cursor: pointer; padding: 0 .1rem; }
        .pd-cak { display: inline-flex; align-items: center; gap: .3rem; color: color-mix(in oklch, var(--ink, #1a1a1a) 48%, transparent); }
        .pd-cakp { width: .3rem; height: .3rem; border-radius: 50%; background: var(--purple, oklch(60% .2 297)); animation: pdCak 1.1s ease-in-out infinite; }
        .pd-cakp:nth-child(2) { animation-delay: .18s; }
        .pd-cakp:nth-child(3) { animation-delay: .36s; }
        @keyframes pdCak { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
        .pd-obd { color: color-mix(in oklch, var(--purple, oklch(58% .2 297)) 78%, transparent); }
        .pd-vr-akc { border: 0; background: none; padding: 0; color: var(--purple, oklch(58% .2 297)); font: 600 .68rem var(--font-sans), sans-serif; cursor: pointer; text-decoration: underline; }
        .pd-vr-akc:hover { opacity: .75; }
        /* vnos VEDNO viden na dnu (ne scrolla z nitjo) */
        /* VNOS pripet na viewport dno — ISTI vzorec kot kalkulatorjeva .cw .noga (fixed; left = širina menija).
           Neprosojno ozadje + senca, ker lebdi nad sporočili (fixed → senca se ne reže). */
        .pd.pogovor .pd-vnos { position: fixed; bottom: 0; left: 17.5rem; right: 0; z-index: 62; width: auto; max-width: min(48rem, 94vw); margin: 0 auto; background: rgba(255,255,255,.95); box-shadow: 0 -6px 30px oklch(40% .08 300 / .2); border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
        :global(body[data-meni='zaprt']) .pd.pogovor .pd-vnos { left: 4.4rem; }
        @media (max-width: 980px) { .pd.pogovor .pd-vnos { left: 0; } }

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

        /* Potrditvena kartica »Nova naloga«: isti stekleni jezik kot mehurčki,
           a z vidnim robom — od uporabnice zahteva odločitev, ne le branje. */
        .pd-potrdi { align-self: flex-start; max-width: min(30rem, 100%); display: flex; flex-direction: column; gap: .5rem; margin: .25rem 0 .1rem; padding: .85rem .95rem; border: 1px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 30%, rgba(255,255,255,.7)); border-radius: 1.15rem; background: rgba(255,255,255,.74); backdrop-filter: blur(16px) saturate(1.3); -webkit-backdrop-filter: blur(16px) saturate(1.3); box-shadow: 0 8px 24px oklch(45% .1 300 / .14); }
        .pd-potrdi-glava { display: flex; align-items: center; justify-content: space-between; gap: .6rem; }
        .pd-potrdi-znak { font: 700 .84rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-potrdi-status { padding: .15rem .55rem; border-radius: 999px; background: color-mix(in oklch, oklch(82% .13 70) 34%, #fff); font: 600 .68rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 78%, transparent); }
        .pd-potrdi-polje { display: grid; grid-template-columns: 5rem 1fr; align-items: center; gap: .5rem; }
        .pd-potrdi-polje > span { font: 600 .72rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 58%, transparent); }
        .pd-potrdi-polje > b { font: 600 .85rem/1.4 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); overflow-wrap: anywhere; }
        .pd-potrdi-polje input { width: 100%; min-height: 2.3rem; padding: .35rem .6rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 15%, transparent); border-radius: .7rem; background: #fff; font: 600 .85rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pd-potrdi-polje input:focus-visible { outline: 2px solid color-mix(in oklch, var(--purple, oklch(66% .2 297)) 50%, transparent); outline-offset: 1px; }
        .pd-potrdi-opomba { margin: 0; font: 500 .73rem/1.45 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); }
        .pd-potrdi-akc { display: flex; justify-content: flex-end; gap: .5rem; }
        .pd-potrdi-ne { min-height: 2.4rem; padding: .5rem 1rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 18%, transparent); border-radius: 999px; background: transparent; font: 600 .8rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); cursor: pointer; }
        .pd-potrdi-ne:hover { background: color-mix(in oklch, var(--ink, #1a1a1a) 6%, transparent); }
        .pd-potrdi-da { min-height: 2.4rem; padding: .5rem 1.25rem; border: 0; border-radius: 999px; background: var(--ink, #2a2620); color: var(--paper, #faf7f2); font: 700 .8rem var(--font-sans), sans-serif; cursor: pointer; }
        .pd-potrdi-da:disabled { opacity: .4; cursor: default; }
        .pd-potrdi-link { align-self: flex-start; display: inline-flex; align-items: center; gap: .35rem; margin: .1rem 0 .2rem; padding: .5rem .95rem; border: 1px solid rgba(255,255,255,.65); border-radius: 999px; background: color-mix(in oklch, oklch(72% .14 297) 16%, rgba(255,255,255,.65)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font: 700 .78rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); text-decoration: none; }
        .pd-potrdi-link:hover { background: color-mix(in oklch, oklch(72% .14 297) 26%, rgba(255,255,255,.7)); }
        /* na telefonu oznaka nad poljem, sicer je vrstica pretesna */
        @media (max-width: 640px) { .pd-potrdi-polje { grid-template-columns: 1fr; gap: .2rem; } }

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
