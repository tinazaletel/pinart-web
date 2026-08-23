'use client';

/* PUPA POGOVOR — Faza 2a. Pogovor LEVO, živ OSNUTEK ponudbe DESNO.
   Pupa iz besedila prepozna storitve/stranko/rok (DETERMINISTIČNO — vedno dela,
   odporno; prava AI ekstrakcija = Faza 2b) in sproti gradi osnutek. Na koncu
   ponudi »odpri v urejevalniku« (prednapolni kalkulator, izrecna potrditev).
   Struktura sporočil (Tina): poslano = »v čakanju« → Pupa »prebere« → odgovori;
   med čakanjem lahko UREDIŠ ali IZBRIŠEŠ. Glej memory: project_pupa_prvi_vmesnik,
   project_pupa_chat_cakalna_vrsta. Ne trči s Codexovim »Moj AI« zaledjem. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { PRICING_SERVICES } from '@/lib/pricingCatalog';
import { lokalniOdgovori } from '@/lib/onboarding';

type Kdo = 'jaz' | 'pupa';
type Stanje = 'cakanje' | 'obdelano';
type Sporocilo = { id: number; kdo: Kdo; besedilo: string; stanje?: Stanje };
type Postavka = { id: string; ime: string; cena: number };
type Osnutek = { stranka: string; rok: string; storitve: Postavka[] };

/* ključne besede → id storitve (substring match, brez šumnikov-občutljivo na koren) */
const KLJUCI: { id: string; besede: string[] }[] = [
  { id: 'logo', besede: ['logotip', 'logo'] },
  { id: 'cgp', besede: ['celostn', 'cgp', 'grafičn podob', 'vizualn identitet', 'identitet'] },
  { id: 'web', besede: ['spletn stran', 'spletno mesto', 'splet', 'spletn', 'website', 'landing', 'web'] },
  { id: 'uxui', besede: ['ux', 'ui', 'uporabnišk izkušnj'] },
  { id: 'aplikacija', besede: ['aplikacij', 'mobiln app', 'app'] },
  { id: 'kampanja', besede: ['kampanj', 'oglas'] },
  { id: 'publikacija', besede: ['publikacij', 'katalog', 'brošur', 'tiskovin', 'letak', 'zloženk'] },
  { id: 'embalaza', besede: ['embalaž', 'packaging', 'etiket'] },
  { id: 'ilustracija', besede: ['ilustracij'] },
  { id: 'fotografija', besede: ['fotograf', 'foto'] },
  { id: 'video', besede: ['video', 'snemanj'] },
  { id: 'motion', besede: ['motion', 'animacij'] },
  { id: 'smm', besede: ['social', 'instagram', 'družben omrežj', 'objav'] },
  { id: 'seo', besede: ['seo'] },
  { id: 'copy', besede: ['besedil', 'copywriting', 'copy'] },
  { id: 'strategija', besede: ['strategij'] },
  { id: 'interier', besede: ['interier', 'notranj oprem'] },
  { id: 'render3d', besede: ['3d', 'render', 'vizualizacij'] },
];

const MESECI = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september', 'oktober', 'november', 'december'];

/* iz besedila prepozna storitve, stranko in rok; vrne DELNE ugotovitve */
function preberi(text: string): { storitve: Postavka[]; stranka: string; rok: string } {
  const t = text.toLowerCase();
  const najdene: Postavka[] = [];
  for (const k of KLJUCI) {
    if (k.besede.some(b => t.includes(b))) {
      const s = PRICING_SERVICES.find(x => x.id === k.id);
      if (s && !najdene.some(n => n.id === s.id)) najdene.push({ id: s.id, ime: s.ime, cena: s.osnova });
    }
  }
  // stranka: "za <ime>" do ločila/roka; izloči, če je to storitev ("za spletno stran")
  let stranka = '';
  for (const mm of text.matchAll(/\bza\s+([^,.;]{2,40}?)(?=\s*(?:,|;|\.|\brok\b|\bdo\b|$))/gi)) {
    const kand = mm[1].trim();
    if (kand && !KLJUCI.some(k => k.besede.some(b => kand.toLowerCase().includes(b)))) { stranka = kand; break; }
  }
  // rok: mesec ali "rok/do ..."
  let rok = '';
  const mes = MESECI.find(mm => t.includes(mm));
  if (mes) rok = mes.charAt(0).toUpperCase() + mes.slice(1);
  const rm = text.match(/\b(rok|do)\s+([^.,;]{2,30})/i);
  if (rm && !rok) rok = rm[2].trim();
  return { storitve: najdene, stranka, rok };
}

function zdruzi(o: Osnutek, d: { storitve: Postavka[]; stranka: string; rok: string }): Osnutek {
  const storitve = [...o.storitve];
  for (const s of d.storitve) if (!storitve.some(x => x.id === s.id)) storitve.push(s);
  return { stranka: d.stranka || o.stranka, rok: d.rok || o.rok, storitve };
}

function evro(n: number): string {
  return new Intl.NumberFormat('sl-SI', { maximumFractionDigits: 0 }).format(n) + ' €';
}

type Poraba = { porabljeno: number; kvota: number; obnovitev?: string };

/* Kapa se obrne po koledarskem mesecu strežnika, zato datum beremo v UTC —
   sicer bi zadnji dan v mesecu kazal en dan narazen od zaledja. */
function datumObnovitve(iso: string, jeEn: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI', { timeZone: 'UTC' });
}

export default function PupaPogovor({ base = '' }: { base?: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  const [ime, setIme] = useState('');
  const [osnutek, setOsnutek] = useState<Osnutek>({ stranka: '', rok: '', storitve: [] });
  const [sporocila, setSporocila] = useState<Sporocilo[]>([]);
  const [vnos, setVnos] = useState('');
  const [urejam, setUrejam] = useState<number | null>(null); // id sporočila v urejanju
  const [poraba, setPoraba] = useState<Poraba | null>(null);
  const idRef = useRef(1);
  const nextId = () => idRef.current++;
  const koncRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const casovniki = useRef<number[]>([]);
  /* osnutekRef: da v odloženih (setTimeout) obdelavah beremo SVEŽ osnutek brez
     side-effecta v setState updaterju (ta bi se v StrictMode klical dvakrat). */
  const osnutekRef = useRef<Osnutek>({ stranka: '', rok: '', storitve: [] });
  const preklicaniRef = useRef<Set<number>>(new Set());

  const skupaj = useMemo(() => osnutek.storitve.reduce((v, s) => v + s.cena, 0), [osnutek.storitve]);

  useEffect(() => {
    try { setIme((lokalniOdgovori().ime || '').trim()); } catch { /* ignore */ }
  }, []);
  useEffect(() => { osnutekRef.current = osnutek; }, [osnutek]);

  /* Mesečna kvota Pupinih sporočil — pokažemo jo VNAPREJ in tiho. Doslej je
     uporabnica za mejo izvedela šele ob 429, kar sredi dela izgleda kot okvara.
     Če je poraba neznana (ni paketa, manjka RPC), kazalnik ostane skrit —
     polovična številka je slabša od nobene. */
  useEffect(() => {
    let ziv = true;
    fetch('/api/pupa/poraba')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!ziv || !d || typeof d.porabljeno !== 'number' || typeof d.kvota !== 'number' || d.kvota <= 0) return;
        setPoraba({
          porabljeno: d.porabljeno,
          kvota: d.kvota,
          obnovitev: typeof d.obnovitev === 'string' ? d.obnovitev : undefined,
        });
      })
      .catch(() => { /* kazalnik je postranski — napaka ne sme motiti pogovora */ });
    return () => { ziv = false; };
  }, []);

  /* uvodni namig iz PupaDom (?namig=...) obravnavamo kot prvo sporočilo */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const namig = new URLSearchParams(window.location.search).get('namig') || '';
    const uvodPupa: Sporocilo = {
      id: nextId(), kdo: 'pupa',
      besedilo: L('Živjo! Povej mi, kaj potrebuješ in za koga — sproti pripravljam osnutek ponudbe na desni.',
        "Hi! Tell me what you need and for whom — I'll draft the quote on the right as we go."),
    };
    setSporocila([uvodPupa]);
    if (namig.trim()) {
      // majhen zamik, da se uvod izriše prvi
      const c = window.setTimeout(() => posljiBesedilo(namig.trim()), 350);
      casovniki.current.push(c);
    }
    return () => { casovniki.current.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { koncRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [sporocila]);

  function pupaOdgovori(poNovem: Osnutek) {
    // Pupa pogleda osnutek in vpraša, kar manjka; sicer povzame.
    let besedilo: string;
    if (poNovem.storitve.length === 0) {
      besedilo = L('Kaj naj pripravim? Npr. logotip, spletna stran, celostna podoba, katalog …',
        'What should I prepare? E.g. logo, website, visual identity, catalogue …');
    } else if (!poNovem.stranka) {
      const sez = poNovem.storitve.map(s => s.ime.toLowerCase()).join(', ');
      besedilo = L(`Super — ${sez}. Za koga je (ime stranke)?`, `Great — ${sez}. Who is it for (client name)?`);
    } else {
      const vsota = poNovem.storitve.reduce((v, s) => v + s.cena, 0);
      besedilo = L(
        `Pripravila sem osnutek za ${poNovem.stranka}: ${poNovem.storitve.length} ${poNovem.storitve.length === 1 ? 'postavka' : 'postavke'}, groba ocena ${evro(vsota)}. Preveri desno — če se ujema, odpri v urejevalniku za dodelavo in ceno.`,
        `I've drafted a quote for ${poNovem.stranka}: ${poNovem.storitve.length} item(s), rough estimate ${evro(vsota)}. Check on the right — if it fits, open it in the editor to refine and price.`,
      );
    }
    setSporocila(prev => [...prev, { id: nextId(), kdo: 'pupa', besedilo }]);
  }

  /* pošlje besedilo: doda »v čakanju« sporočilo, po kratkem premoru ga označi
     kot obdelano, prebere osnutek in Pupa odgovori. Med čakanjem ga lahko urediš/izbrišeš. */
  function posljiBesedilo(text: string) {
    const t = text.trim();
    if (!t) return;
    const mojId = nextId();
    setSporocila(prev => [...prev, { id: mojId, kdo: 'jaz', besedilo: t, stanje: 'cakanje' }]);
    const c = window.setTimeout(() => {
      // če je bilo medtem izbrisano, ne obdeluj
      if (preklicaniRef.current.has(mojId)) { preklicaniRef.current.delete(mojId); return; }
      setSporocila(prev => prev.map(s => (s.id === mojId ? { ...s, stanje: 'obdelano' } : s)));
      // side-effect ZUNAJ setState updaterja (updater ostane čist)
      const poNovem = zdruzi(osnutekRef.current, preberi(t));
      osnutekRef.current = poNovem;
      setOsnutek(poNovem);
      const c2 = window.setTimeout(() => pupaOdgovori(poNovem), 450);
      casovniki.current.push(c2);
    }, 900);
    casovniki.current.push(c);
  }

  function posljiIzVnosa() {
    if (urejam !== null) {
      // shrani urejeno: odstrani staro pending sporočilo, pošlji na novo
      setSporocila(prev => prev.filter(s => s.id !== urejam));
      setUrejam(null);
    }
    posljiBesedilo(vnos);
    setVnos('');
    resetVisino();
  }

  function urediSporocilo(s: Sporocilo) {
    setVnos(s.besedilo);
    setUrejam(s.id);
    const el = textRef.current;
    if (el) { el.focus(); el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
  }

  function izbrisiSporocilo(id: number) {
    preklicaniRef.current.add(id); // če je še v čakanju, prepreči obdelavo
    setSporocila(prev => prev.filter(s => s.id !== id));
    if (urejam === id) { setUrejam(null); setVnos(''); }
  }

  function resetVisino() {
    const el = textRef.current;
    if (el) { el.style.height = 'auto'; }
  }

  /* prednapolni kalkulator iz osnutka in odpri urejevalnik (izrecno dejanje) */
  function odpriVUrejevalniku() {
    if (typeof window === 'undefined') return;
    try {
      const KEY = 'pinart-kalkulator-v2';
      const obstojece = JSON.parse(localStorage.getItem(KEY) || '{}');
      const zdruzeno = {
        ...obstojece,
        narocnikPonudbe: osnutek.stranka || obstojece.narocnikPonudbe || '',
        izbrane: osnutek.storitve.map(s => s.id),
        nazivPonudbe: osnutek.stranka
          ? L(`Ponudba — ${osnutek.stranka}`, `Quote — ${osnutek.stranka}`)
          : (obstojece.nazivPonudbe || ''),
      };
      localStorage.setItem(KEY, JSON.stringify(zdruzeno));
    } catch { /* ignore — vseeno odpremo urejevalnik */ }
    window.location.href = `${base}/kalkulator/orodje?od=pregled`;
  }

  const pripravljen = osnutek.storitve.length > 0;
  /* Do 80 % je podatek, od 80 % naprej je opozorilo — prej bi bilo samo hrup. */
  const porabaVisoka = !!poraba && poraba.porabljeno / poraba.kvota >= 0.8;
  const porabaDatum = poraba?.obnovitev ? datumObnovitve(poraba.obnovitev, jeEn) : '';

  return (
    <div className="pp">
      <div className="pp-aurora" aria-hidden><i className="b1" /><i className="b2" /></div>

      {/* LEVO: pogovor */}
      <section className="pp-chat" aria-label={L('Pogovor s Pupo', 'Chat with Pupa')}>
        <header className="pp-glava">
          <span className="pp-orb" aria-hidden />
          <div>
            <p className="pp-eyebrow">PUPA</p>
            <h1 className="pp-naslov">{ime ? L(`Pripravimo ponudbo, ${ime}`, `Let's build a quote, ${ime}`) : L('Pripravimo ponudbo', "Let's build a quote")}</h1>
          </div>
          {poraba && (
            <span
              className={`pp-poraba ${porabaVisoka ? 'blizu' : ''}`}
              title={porabaDatum ? L(`Kvota se obnovi ${porabaDatum}.`, `Quota renews on ${porabaDatum}.`) : undefined}
            >
              {L(`${poraba.porabljeno} od ${poraba.kvota} ta mesec`, `${poraba.porabljeno} of ${poraba.kvota} this month`)}
            </span>
          )}
        </header>

        <div className="pp-nit">
          {sporocila.map(s => (
            <div key={s.id} className={`pp-vr ${s.kdo === 'jaz' ? 'jaz' : 'pupa'}`}>
              <div className="pp-mehur">{s.besedilo}</div>
              {s.kdo === 'jaz' && (
                <div className="pp-meta">
                  {s.stanje === 'cakanje' ? (
                    <>
                      <span className="pp-cakanje"><span className="pp-pika" /><span className="pp-pika" /><span className="pp-pika" /> {L('v čakanju', 'queued')}</span>
                      <button type="button" className="pp-akc" onClick={() => urediSporocilo(s)}>{L('Uredi', 'Edit')}</button>
                      <button type="button" className="pp-akc" onClick={() => izbrisiSporocilo(s.id)}>{L('Izbriši', 'Delete')}</button>
                    </>
                  ) : (
                    <span className="pp-poslano">{L('obdelano', 'processed')}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={koncRef} />
        </div>

        <div className="pp-vnos">
          {urejam !== null && <div className="pp-urejam">{L('Urejaš sporočilo v čakanju', 'Editing a queued message')} <button type="button" onClick={() => { setUrejam(null); setVnos(''); resetVisino(); }}>{L('prekliči', 'cancel')}</button></div>}
          <textarea
            ref={textRef}
            value={vnos}
            onChange={e => { setVnos(e.target.value); const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); posljiIzVnosa(); } }}
            placeholder={L('Napiši, kaj potrebuješ …', 'Write what you need …')}
            rows={1}
            aria-label={L('Sporočilo', 'Message')}
          />
          <button type="button" className="pp-poslji" onClick={posljiIzVnosa} disabled={!vnos.trim()}>
            {urejam !== null ? L('Shrani', 'Save') : L('Pošlji', 'Send')} <span aria-hidden>→</span>
          </button>
        </div>
      </section>

      {/* DESNO: živ osnutek */}
      <aside className="pp-osnutek" aria-label={L('Osnutek ponudbe', 'Quote draft')}>
        <div className="pp-o-glava">
          <span className="pp-o-znak">{L('Osnutek ponudbe', 'Quote draft')}</span>
          <span className="pp-o-status">{pripravljen ? L('v pripravi', 'in progress') : L('čaka podatke', 'awaiting input')}</span>
        </div>

        <div className="pp-o-polje">
          <span className="pp-o-oznaka">{L('Stranka', 'Client')}</span>
          <span className={`pp-o-vrednost ${osnutek.stranka ? '' : 'prazno'}`}>{osnutek.stranka || L('— še ni —', '— not yet —')}</span>
        </div>

        <div className="pp-o-postavke">
          <span className="pp-o-oznaka">{L('Storitve', 'Services')}</span>
          {osnutek.storitve.length === 0 ? (
            <p className="pp-o-prazno">{L('Povej Pupi, kaj naj pripravi.', 'Tell Pupa what to prepare.')}</p>
          ) : (
            <ul>
              {osnutek.storitve.map(s => (
                <li key={s.id}><span>{s.ime}</span><b>{s.cena > 0 ? evro(s.cena) : L('po dogovoru', 'custom')}</b></li>
              ))}
            </ul>
          )}
        </div>

        {osnutek.rok && (
          <div className="pp-o-polje">
            <span className="pp-o-oznaka">{L('Rok', 'Deadline')}</span>
            <span className="pp-o-vrednost">{osnutek.rok}</span>
          </div>
        )}

        <div className="pp-o-vsota">
          <span>{L('Groba ocena', 'Rough estimate')}</span>
          <b>{skupaj > 0 ? evro(skupaj) : '—'}</b>
        </div>
        <p className="pp-o-opomba">{L('Ocena iz osnovnih cen. Končno ceno (paket, pravice, popust) določiš v urejevalniku.', 'Estimate from base prices. Final price (package, rights, discount) is set in the editor.')}</p>

        <button type="button" className="pp-o-odpri" onClick={odpriVUrejevalniku} disabled={!pripravljen}>
          {L('Odpri v urejevalniku', 'Open in editor')} <span aria-hidden>→</span>
        </button>
        {!pripravljen && <p className="pp-o-namig">{L('Ko bo vsaj ena storitev, boš lahko odprla osnutek.', 'Once there is at least one service, you can open the draft.')}</p>}
      </aside>

      <style jsx>{`
        .pp { position: relative; min-height: calc(100dvh - 3rem); display: grid; grid-template-columns: 1fr; gap: 1rem; padding: clamp(1rem, 3vw, 1.6rem); overflow: hidden; }
        .pp-aurora { position: fixed; inset: 0; z-index: 0; pointer-events: none; filter: blur(80px); opacity: .42; }
        .pp-aurora i { position: absolute; display: block; border-radius: 50%; }
        .pp-aurora .b1 { width: 42vw; height: 42vw; top: -12vw; left: -6vw; background: radial-gradient(circle, oklch(74% .15 300 / .8), transparent 68%); }
        .pp-aurora .b2 { width: 40vw; height: 40vw; bottom: -14vw; right: -8vw; background: radial-gradient(circle, oklch(80% .12 190 / .75), transparent 68%); }

        .pp-chat, .pp-osnutek { position: relative; z-index: 1; background: rgba(255,255,255,.66); backdrop-filter: blur(18px) saturate(1.3); -webkit-backdrop-filter: blur(18px) saturate(1.3); border: 1px solid rgba(255,255,255,.7); border-radius: 1.3rem; box-shadow: 0 18px 50px oklch(40% .08 300 / .14); }

        /* CHAT */
        .pp-chat { display: flex; flex-direction: column; min-height: 60vh; max-height: calc(100dvh - 5rem); padding: 1.1rem 1.2rem; }
        .pp-glava { display: flex; align-items: center; gap: .7rem; padding-bottom: .8rem; border-bottom: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 8%, transparent); }
        .pp-orb { flex: none; width: 2.4rem; height: 2.4rem; border-radius: 50%; background: conic-gradient(from 210deg, oklch(70% .19 300), oklch(72% .16 200), oklch(80% .13 150), oklch(78% .17 25), oklch(70% .19 300)); box-shadow: inset -2px -3px 6px oklch(100% 0 0 / .35), inset 2px 3px 6px oklch(30% .1 300 / .25); }
        .pp-eyebrow { margin: 0; font: 800 .58rem var(--font-sans), sans-serif; letter-spacing: .18em; color: var(--purple, oklch(60% .2 297)); }
        .pp-naslov { margin: .1rem 0 0; font: 500 1.15rem var(--font-serif), Georgia, serif; font-synthesis: none; color: var(--ink, #1a1a1a); }
        /* Privzeto ista tiha siva kot pri »obdelano«; pri 80 % prevzame obstoječo
           vijolično značko (.pp-o-status), da opozorilo ne uvaja nove barve. */
        .pp-poraba { margin-left: auto; flex: none; font: 600 .68rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 40%, transparent); white-space: nowrap; }
        .pp-poraba.blizu { padding: .2rem .55rem; border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 12%, transparent); color: var(--purple, oklch(52% .2 297)); }

        .pp-nit { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: .7rem; padding: 1rem .1rem; }
        .pp-vr { display: flex; flex-direction: column; gap: .2rem; max-width: 85%; }
        .pp-vr.jaz { align-self: flex-end; align-items: flex-end; }
        .pp-vr.pupa { align-self: flex-start; align-items: flex-start; }
        .pp-mehur { padding: .6rem .85rem; border-radius: 1.1rem; font: 500 .92rem/1.45 var(--font-sans), sans-serif; }
        .pp-vr.pupa .pp-mehur { background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 9%, #fff); color: var(--ink, #1a1a1a); border-bottom-left-radius: .35rem; }
        .pp-vr.jaz .pp-mehur { background: var(--ink, #2a2620); color: var(--paper, #faf7f2); border-bottom-right-radius: .35rem; }
        .pp-meta { display: flex; align-items: center; gap: .5rem; font: 600 .68rem var(--font-sans), sans-serif; }
        .pp-cakanje { display: inline-flex; align-items: center; gap: .3rem; color: color-mix(in oklch, var(--ink, #1a1a1a) 50%, transparent); }
        .pp-pika { width: .3rem; height: .3rem; border-radius: 50%; background: var(--purple, oklch(60% .2 297)); animation: ppUtrip 1.1s ease-in-out infinite; }
        .pp-pika:nth-child(2) { animation-delay: .18s; }
        .pp-pika:nth-child(3) { animation-delay: .36s; }
        @keyframes ppUtrip { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
        .pp-poslano { color: color-mix(in oklch, var(--ink, #1a1a1a) 40%, transparent); }
        .pp-akc { border: 0; background: none; padding: 0; color: var(--purple, oklch(58% .2 297)); font: 600 .68rem var(--font-sans), sans-serif; cursor: pointer; text-decoration: underline; }
        .pp-akc:hover { opacity: .8; }

        .pp-vnos { display: flex; align-items: flex-end; gap: .5rem; padding-top: .8rem; border-top: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 8%, transparent); position: relative; }
        .pp-urejam { position: absolute; top: -1.6rem; left: 0; font: 600 .68rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 55%, transparent); }
        .pp-urejam button { border: 0; background: none; color: var(--purple, oklch(58% .2 297)); cursor: pointer; text-decoration: underline; font: inherit; }
        .pp-vnos textarea { flex: 1; box-sizing: border-box; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 12%, transparent); outline: none; resize: none; background: #fff; border-radius: .9rem; padding: .6rem .8rem; font: 500 .92rem/1.4 var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); min-height: 2.6rem; max-height: 160px; overflow-y: auto; }
        .pp-vnos textarea:focus { border-color: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in oklch, var(--purple, oklch(66% .2 297)) 14%, transparent); }
        .pp-poslji { flex: none; display: inline-flex; align-items: center; gap: .4rem; border: 0; border-radius: 999px; padding: .6rem 1.1rem; background: var(--ink, #2a2620); color: var(--paper, #faf7f2); font: 700 .82rem var(--font-sans), sans-serif; cursor: pointer; transition: transform .15s ease, opacity .15s ease; }
        .pp-poslji:hover:not(:disabled) { transform: translateY(-1px); }
        .pp-poslji:disabled { opacity: .4; cursor: default; }

        /* OSNUTEK */
        .pp-osnutek { display: flex; flex-direction: column; gap: .9rem; padding: 1.2rem; align-self: start; }
        .pp-o-glava { display: flex; align-items: center; justify-content: space-between; }
        .pp-o-znak { font: 700 .95rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pp-o-status { font: 600 .66rem var(--font-sans), sans-serif; padding: .2rem .55rem; border-radius: 999px; background: color-mix(in oklch, var(--purple, oklch(66% .2 297)) 12%, transparent); color: var(--purple, oklch(52% .2 297)); }
        .pp-o-polje { display: flex; flex-direction: column; gap: .15rem; }
        .pp-o-oznaka { font: 700 .62rem var(--font-sans), sans-serif; letter-spacing: .08em; text-transform: uppercase; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pp-o-vrednost { font: 600 1rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pp-o-vrednost.prazno { color: color-mix(in oklch, var(--ink, #1a1a1a) 35%, transparent); font-weight: 500; }
        .pp-o-postavke { display: flex; flex-direction: column; gap: .3rem; }
        .pp-o-postavke ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .3rem; }
        .pp-o-postavke li { display: flex; align-items: baseline; justify-content: space-between; gap: .8rem; padding: .5rem .65rem; border: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 8%, transparent); border-radius: .7rem; background: #fff; animation: ppVstop .3s ease both; }
        .pp-o-postavke li span { font: 500 .9rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); }
        .pp-o-postavke li b { font: 700 .9rem var(--font-sans), sans-serif; color: var(--ink, #1a1a1a); white-space: nowrap; }
        @keyframes ppVstop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .pp-o-prazno { margin: 0; font: 500 .85rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 40%, transparent); }
        .pp-o-vsota { display: flex; align-items: baseline; justify-content: space-between; padding-top: .7rem; border-top: 1px solid color-mix(in oklch, var(--ink, #1a1a1a) 10%, transparent); }
        .pp-o-vsota span { font: 700 .8rem var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 60%, transparent); }
        .pp-o-vsota b { font: 700 1.4rem var(--font-serif), Georgia, serif; color: var(--ink, #1a1a1a); }
        .pp-o-opomba, .pp-o-namig { margin: 0; font: 500 .7rem/1.4 var(--font-sans), sans-serif; color: color-mix(in oklch, var(--ink, #1a1a1a) 45%, transparent); }
        .pp-o-odpri { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; border: 0; border-radius: 999px; padding: .75rem 1.2rem; background: var(--purple, oklch(58% .2 297)); color: #fff; font: 700 .88rem var(--font-sans), sans-serif; cursor: pointer; transition: transform .15s ease, opacity .15s ease; }
        .pp-o-odpri:hover:not(:disabled) { transform: translateY(-1px); }
        .pp-o-odpri:disabled { opacity: .4; cursor: default; }

        @media (min-width: 900px) {
          .pp { grid-template-columns: 1.35fr 1fr; align-items: start; }
          .pp-osnutek { position: sticky; top: clamp(1rem, 3vw, 1.6rem); }
        }
      `}</style>
    </div>
  );
}
