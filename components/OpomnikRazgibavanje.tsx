'use client';

/* OPOMNIK ZA RAZGIBAVANJE — kartica, ki se pojavi kjerkoli v aplikaciji.
 *
 * Zakaj ne na strani Štoparice: vklopiš merjenje in greš delat v Naloge ali v
 * Ponudbo, zato bi opomnik na tisti strani viden nikoli. Komponenta živi v
 * ovoju vseh orodij (app/[locale]/kalkulator/layout.tsx) — en izris, povsod
 * viden, in ob prehodu med stranmi se NE postavi na novo. V stranski vrstici je
 * bil prej narobe: vrstica se ob vsakem prehodu izriše znova in odprt opomnik
 * je izginil (Tina, 30. 8. 2026).
 *
 * Kje se pokaže: spodaj desno, nad Pupinim mehurčkom, nikoli čez sredino.
 * Kar ti zakrije, kar pišeš, ugasneš — in tretjič ne prižgeš več. Iz istega
 * razloga počaka, dokler tipkaš, in ima gumb »Ne danes«.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import TimerValovi from './TimerValovi';
import { odkleniZvok, pokMehurcka } from '@/lib/zvokMehurcek';

/* PRIHOD OPOMNIKA VEDNO ZACVRKNE (Tina, 30. 8. 2026: »tole je gor prislo, pa sem
   komaj opazila«). Okno se odpre ob strani zaslona, kjer ravno ne gledas — brez
   zvoka je opomnik, ki ga zgresis, isto kot opomnik, ki ga ni. Pok traja tretjino
   sekunde in je tih; stikalo »zvok« ostane za glasbo med vajo, ki je tista, ki
   lahko moti soseda v pisarni. */
const PRIHOD = 0.6;   /* glasneje: opomnik mora priti skozi, ko delas v drugem oknu */
import { poveziEkipo, type Povezava } from '@/lib/razgibavanjeSkupaj';
import { nadaljuj, pavziraj, ustavi as ustaviZvok, zaigraj } from '@/lib/zvokRazgibavanje';
import {
  DOGODEK_EKIPA, DOGODEK_PAVZA, DOGODEK_SPREMEMBA, DOGODEK_TIK, DOGODEK_USTAVI, DOGODEK_ZACNI,
  GLASBA, JINGLE, OKNO_DEJAVNOSTI_MS, PRIVZETE, PUPA_MIRUJE, STEVILO_VAJ, VAJE, shraniNastavitve,
  vajaVKrogu,
  danesKljuc, preberiNastavitve, preberiOkno, preberiStanje, shraniOkno, shraniStanje, zabeleziOpravljeno,
  type RazgibavanjeNastavitve, type Tik,
} from '@/lib/razgibavanje';

const DOGODKI = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;

export default function OpomnikRazgibavanje({ jeEn = false }: { jeEn?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  const [nastavitve, setNastavitve] = useState<RazgibavanjeNastavitve>(PRIVZETE);
  const [odprt, setOdprt] = useState(false);
  const [preostanek, setPreostanek] = useState<number | null>(null);   // sekunde razgibavanja
  const [pavza, setPavza] = useState(false);
  const zadnjaDejavnost = useRef<number>(0);
  const sekunde = useRef(0);
  const neDanes = useRef<string | null>(null);
  const opravljeno = useRef<string[]>([]);
  const ekipa = useRef<Povezava | null>(null);
  /* Kdo iz ekipe je pravkar začel — takrat opomnik ni »ura je naokoli«, ampak
     povabilo z imenom. */
  const [povabil, setPovabil] = useState<string | null>(null);
  /* Skupni začetek in ali sem se že javila — dokler ura teče, oboje stoji. */
  const [zbor, setZbor] = useState<{ zacetek: number; pridruzen: boolean } | null>(null);
  const [doZbora, setDoZbora] = useState(0);



  /* Štoparica na strani Čas kaže isto uro kot ta opomnik. Namesto skupnega
     stanja ji vsako sekundo pošljemo številko — komponenti sta na različnih
     koncih drevesa, dogodek pa ju poveže brez konteksta. */
  const objavi = useCallback((t: Tik) => {
    window.dispatchEvent(new CustomEvent<Tik>(DOGODEK_TIK, { detail: t }));
  }, []);

  /* Nastavitve preberi ob montaži in ob vsaki spremembi na strani Čas. */
  useEffect(() => {
    const osvezi = () => setNastavitve(preberiNastavitve());
    osvezi();
    const stanje = preberiStanje();
    sekunde.current = stanje.sekunde;
    neDanes.current = stanje.neDanes;
    opravljeno.current = stanje.opravljeno;

    /* Obnovi odprto okno: po osvežitvi ali prehodu mora vaja teči naprej po
       pravem času, ne od začetka. */
    const okno = preberiOkno();
    if (okno.pavzaOstanek !== null) { setPavza(true); setPreostanek(okno.pavzaOstanek); }
    else if (okno.konec !== null) {
      const ostane = Math.round((okno.konec - Date.now()) / 1000);
      if (ostane > 0) setPreostanek(ostane);
    } else if (okno.odprt) setOdprt(true);
    zadnjaDejavnost.current = Date.now();
    /* Preizkus iz nastavitev: brez tega bi bilo treba na prvi opomnik čakati
       pol ure, uporabnica pa hoče videti, kaj prižiga, preden prižge. */
    const zacniOdZunaj = () => {
      const n = preberiNastavitve();
      setNastavitve(n);
      setOdprt(false);
      setPavza(false);
      setPreostanek(Math.round(n.trajanje * 60));
      if (n.zvok) zaigraj();
    };
    /* Ustavi in pavza prihajata s kartice na strani Čas: odštevanje živi tu,
       da teče naprej tudi, ko si na drugem zavihku aplikacije. */
    const ustaviOdZunaj = () => {
      setPavza(false); setPreostanek(null); setOdprt(false);
      sekunde.current = 0;
      shraniStanje({ sekunde: 0, neDanes: neDanes.current, opravljeno: opravljeno.current });
      zadnjaDejavnost.current = Date.now();
    };
    const pavzaOdZunaj = () => setPavza(p => !p);
    window.addEventListener(DOGODEK_SPREMEMBA, osvezi);
    window.addEventListener(DOGODEK_ZACNI, zacniOdZunaj);
    window.addEventListener(DOGODEK_USTAVI, ustaviOdZunaj);
    window.addEventListener(DOGODEK_PAVZA, pavzaOdZunaj);
    return () => {
      window.removeEventListener(DOGODEK_SPREMEMBA, osvezi);
      window.removeEventListener(DOGODEK_ZACNI, zacniOdZunaj);
      window.removeEventListener(DOGODEK_USTAVI, ustaviOdZunaj);
      window.removeEventListener(DOGODEK_PAVZA, pavzaOdZunaj);
    };
  }, []);

  /* EKIPA: povabila tečejo po broadcast kanalu organizacije. */
  useEffect(() => {
    let ziv = true;
    void poveziEkipo(p => {
      const n = preberiNastavitve();
      if (!n.vklopljeno) return;              // kdor je opomnik ugasnil, ni na vezi
      setPovabil(p.kdo);
      setZbor({ zacetek: p.zacetek, pridruzen: false });
      setOdprt(true);
      pokMehurcka(PRIHOD);
    }).then(v => {
      if (!ziv) { v?.odjava(); return; }
      ekipa.current = v;
    });

    /* Kdor povabi, čaka z ekipo vred — sicer bi začel sam trideset sekund
       pred vsemi ostalimi. */
    const povabiEkipo = () => {
      const n = preberiNastavitve();
      const zacetek = ekipa.current?.povabi(n.trajanje);
      if (!zacetek) return;
      setPovabil(null);
      setZbor({ zacetek, pridruzen: true });
      setOdprt(true);
    };
    window.addEventListener(DOGODEK_EKIPA, povabiEkipo);
    return () => {
      ziv = false;
      window.removeEventListener(DOGODEK_EKIPA, povabiEkipo);
      ekipa.current?.odjava();
      ekipa.current = null;
    };
  }, []);

  /* Vsak dogodek uporabnika samo osveži časovno oznako — nič se ne izrisuje,
     zato tudi premikanje miške ne obremeni strani. */
  useEffect(() => {
    const zabelezi = () => { zadnjaDejavnost.current = Date.now(); };
    DOGODKI.forEach(d => window.addEventListener(d, zabelezi, { passive: true }));
    document.addEventListener('visibilitychange', zabelezi);
    return () => {
      DOGODKI.forEach(d => window.removeEventListener(d, zabelezi));
      document.removeEventListener('visibilitychange', zabelezi);
    };
  }, []);

  const tipkaVPolju = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
  };

  /* Ura dejavnega dela. Tiktaka vsako sekundo, šteje pa le, kadar je zavihek
     viden in je bila zadnja dejavnost znotraj okna. */
  useEffect(() => {
    if (!nastavitve.vklopljeno || odprt || preostanek !== null) return;
    const ura = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - zadnjaDejavnost.current > OKNO_DEJAVNOSTI_MS) return;
      if (neDanes.current === danesKljuc()) return;

      sekunde.current += 1;
      objavi({ doNaslednjega: Math.max(0, nastavitve.interval * 60 - sekunde.current), telovadba: null, pavza: false });
      if (sekunde.current % 10 === 0) {
        shraniStanje({ sekunde: sekunde.current, neDanes: neDanes.current, opravljeno: opravljeno.current });
      }

      if (sekunde.current >= nastavitve.interval * 60) {
        /* Ne prekinjaj sredi stavka — počakaj, da neha tipkati. */
        if (tipkaVPolju()) return;
        pokMehurcka(PRIHOD);
        setOdprt(true);
      }
    }, 1000);
    return () => window.clearInterval(ura);
  }, [nastavitve.vklopljeno, nastavitve.interval, odprt, preostanek, objavi]);

  /* Zvok pripravimo takoj ob nalaganju: kontekst se ustvari in se odklene ob
     prvi gesti kjerkoli v aplikaciji, da opomnik cez uro ni tih. */
  useEffect(() => { odkleniZvok(); }, []);

  /* Odštevanje razgibavanja. */
  useEffect(() => {
    if (preostanek === null) return;
    objavi({ doNaslednjega: null, telovadba: preostanek, pavza });
    if (pavza) return;
    /* Odšteto do konca = opravljeno. Kdor pritisne »Končaj« prej, kljukice ne
       dobi — sicer meri gumb, ne razgibavanja. */
    if (preostanek <= 0) {
      if (nastavitve.zvok) pokMehurcka();
      opravljeno.current = zabeleziOpravljeno().opravljeno;
      koncaj();
      return;
    }
    const ura = window.setTimeout(() => setPreostanek(p => (p === null ? null : p - 1)), 1000);
    return () => window.clearTimeout(ura);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preostanek, pavza, nastavitve.zvok]);

  /* Ura do skupnega začetka. Ob njej se vsi, ki so se javili, poženejo hkrati;
     kdor se ni, se mu okno tiho zapre. */
  useEffect(() => {
    if (!zbor) { setDoZbora(0); return; }
    const osvezi = () => {
      const ostane = Math.max(0, Math.round((zbor.zacetek - Date.now()) / 1000));
      setDoZbora(ostane);
      if (ostane > 0) return;
      if (zbor.pridruzen) {
        const n = preberiNastavitve();
        setOdprt(false);
        setPavza(false);
        setPreostanek(Math.round(n.trajanje * 60));
        if (n.zvok) zaigraj();
      } else {
        setOdprt(false);
      }
      setPovabil(null);
      setZbor(null);
    };
    osvezi();
    const ura = window.setInterval(osvezi, 500);
    return () => window.clearInterval(ura);
  }, [zbor]);

  /* GLASBA med vajo — isto stikalo kot mehurček. Predvajalnika živita v
     lib/zvokRazgibavanje (modul), zato ju ustavimo tudi, če se komponenta med
     tem znova izriše. */
  const tece = preostanek !== null;
  useEffect(() => {
    if (!nastavitve.zvok || !tece) { pavziraj(); return; }
    if (pavza) { pavziraj(); return; }
    nadaljuj();
  }, [tece, pavza, nastavitve.zvok]);

  /* Ob koncu vaje zvok ustavi in pozabi — naslednji premor začne od začetka. */
  useEffect(() => {
    if (tece) return;
    ustaviZvok();
  }, [tece]);

  /* IZKLOP OPOMNIKA USTAVI TUDI VAJO. Brez tega se je kartica samo skrila,
     odštevanje in glasba pa sta tekla naprej pod njo — zvok brez gumba, s
     katerim bi ga ustavila (Tina, 30. 8. 2026). */
  useEffect(() => {
    if (nastavitve.vklopljeno) return;
    ustaviZvok();
    setPreostanek(null);
    setPavza(false);
    setOdprt(false);
    setPovabil(null);
    setZbor(null);
  }, [nastavitve.vklopljeno]);

  /* Ob odhodu iz aplikacije naj za nami ne ostane igrajoč zvok. */
  useEffect(() => ustaviZvok, []);

  /* Zapis stanja okna ob vsaki spremembi — poceni, ker se zgodi enkrat na
     sekundo le med vajo. */
  useEffect(() => {
    shraniOkno({
      odprt,
      konec: preostanek !== null && !pavza ? Date.now() + preostanek * 1000 : null,
      pavzaOstanek: pavza ? preostanek : null,
    });
  }, [odprt, preostanek, pavza]);

  const ponastavi = useCallback((brezDanes = false) => {
    sekunde.current = 0;
    if (brezDanes) neDanes.current = danesKljuc();
    shraniStanje({ sekunde: 0, neDanes: neDanes.current, opravljeno: opravljeno.current });
    objavi({ doNaslednjega: Math.round(nastavitve.interval * 60), telovadba: null, pavza: false });
    zadnjaDejavnost.current = Date.now();
  }, [nastavitve.interval, objavi]);

  /* Zvok ustavimo tu, ne le v učinku ob `tece`: konec vaje je konec glasbe, in
     to ne sme biti odvisno od vrstnega reda učinkov (Tina, 30. 8. 2026). */
  function koncaj() { ustaviZvok(); setPavza(false); setPreostanek(null); setOdprt(false); setPovabil(null); ponastavi(); }
  function zacni() {
    setOdprt(false); setPovabil(null);
    setPreostanek(Math.round(nastavitve.trajanje * 60));
    if (nastavitve.zvok) zaigraj();
  }
  function preskoci() { setOdprt(false); setPovabil(null); setZbor(null); ponastavi(); }
  function neDanesVec() { setOdprt(false); setPovabil(null); setZbor(null); ponastavi(true); }

  if (!nastavitve.vklopljeno) return null;
  if (!odprt && preostanek === null) return null;

  const min = Math.floor((preostanek ?? 0) / 60);
  const sek = (preostanek ?? 0) % 60;
  /* Med vajo se slika in ime menjata z napredkom kroga. */
  const vaja = vajaVKrogu(preostanek ?? 0, nastavitve.trajanje);
  const imeVaje = jeEn ? VAJE[vaja].imeEn : VAJE[vaja].ime;

  return (
    <div className="raz" role="status" aria-live="polite">
      {/* Isti gibljivi valovi kot v stoparici: preliv, ki se guba, vabi k
          gibanju bolj kot mirna ploskev (Tina, 30. 8.). */}
      <TimerValovi className="raz-valovi" />

      <button
        type="button"
        className="raz-zvok"
        aria-pressed={nastavitve.zvok}
        /* Pok mehurčka je za PRIHOD opomnika; stikalo tu je za glasbo. Vklop med
           vajo glasbo zažene (učinek spodaj jo ob naslednjem izrisu nadaljuje ali
           začne), izklop jo ustavi. Prej je klik le poknil, glasbe pa ni bilo,
           ker se je začela samo ob »Začni« (Tina, 5. 9. 2026). */
        onClick={() => { const n = { ...nastavitve, zvok: !nastavitve.zvok }; setNastavitve(n); shraniNastavitve(n); if (n.zvok && tece && !pavza) nadaljuj(); }}
        aria-label={nastavitve.zvok ? L('Izklopi zvok', 'Turn sound off') : L('Vklopi zvok', 'Turn sound on')}
        title={nastavitve.zvok ? L('Zvok je vklopljen', 'Sound is on') : L('Zvok je izklopljen', 'Sound is off')}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6.5 8.8H3v6.4h3.5L11 19z" />
          {nastavitve.zvok
            ? <><path d="M15.4 9.3a3.8 3.8 0 0 1 0 5.4" /><path d="M18 6.7a7.4 7.4 0 0 1 0 10.6" /></>
            : <><path d="m16.5 9.8 4.5 4.4" /><path d="m21 9.8-4.5 4.4" /></>}
        </svg>
      </button>

      {/* Zapri: med vajo ustavi, pred njo preskoči do naslednje ure. Okno, ki
          ga ni mogoče zapreti s križcem, se ugasne za vedno (Tina, 30. 8.). */}
      <button
        type="button"
        className="raz-zapri"
        onClick={() => (preostanek === null ? preskoci() : koncaj())}
        aria-label={L('Zapri', 'Close')}
        title={L('Zapri', 'Close')}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
          <path d="M6.5 6.5 17.5 17.5" /><path d="M17.5 6.5 6.5 17.5" />
        </svg>
      </button>

      {/* Pupa miruje, dokler ne telovadiš; med vajo skače ali počepa s tabo. */}
      <img className="raz-pupa" src={preostanek === null || pavza ? PUPA_MIRUJE : VAJE[vaja].slika} alt=""
        onError={e => { (e.currentTarget as HTMLImageElement).src = VAJE.skoki.slika; }} />

      <div className="raz-telo">
        {preostanek === null ? <>
          <strong>{povabil
            ? L(`${povabil} kliče ekipo`, `${povabil} is calling the team`)
            : zbor
              ? L('Ekipa je poklicana', 'The team has been called')
              : L('Čas za razgibavanje', 'Time to move')}</strong>
          <p>{zbor
            ? L(`Začnemo čez ${doZbora} s — dokončaj stavek in vstani.`,
                `Starting in ${doZbora}s — finish your sentence and stand up.`)
            : L(`Vstani — ${STEVILO_VAJ} vaje v ${String(nastavitve.trajanje).replace('.', ',')} minutah.`,
                `Stand up — ${STEVILO_VAJ} exercises in ${nastavitve.trajanje} min.`)}</p>
          <div className="raz-gumbi">
            {zbor ? (
              <button type="button" className="raz-g raz-polni"
                onClick={() => setZbor(z => (z ? { ...z, pridruzen: true } : z))}
                disabled={zbor.pridruzen}>
                {zbor.pridruzen ? L(`Čakam ${doZbora} s`, `Waiting ${doZbora}s`) : L('Pridruži se', 'Join in')}
              </button>
            ) : (
              <button type="button" className="raz-g raz-polni" onClick={zacni}>{L('Začni', 'Start')}</button>
            )}
          </div>
          <div className="raz-gumbi raz-drobni">
            <button type="button" className="raz-tiho" onClick={preskoci}>{L('Preskoči', 'Skip')}</button>
            <button type="button" className="raz-tiho" onClick={neDanesVec}>{L('Ne danes', 'Not today')}</button>
          </div>
        </> : <>
          <strong>{pavza ? L('Pavza', 'Paused') : imeVaje}</strong>
          <p className="raz-cas">{min}:{String(sek).padStart(2, '0')}</p>
          <div className="raz-gumbi">
            <button type="button" className="raz-g raz-polni" onClick={koncaj}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.4" /></svg>
              {L('Ustavi', 'Stop')}
            </button>
            <button type="button" className="raz-g raz-ikona" onClick={() => setPavza(p => !p)}
              aria-label={pavza ? L('Nadaljuj', 'Resume') : L('Pavza', 'Pause')}
              title={pavza ? L('Nadaljuj', 'Resume') : L('Pavza', 'Pause')}>
              {pavza
                ? <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
                : <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><rect x="7" y="5.5" width="3.6" height="13" rx="1.1" /><rect x="13.4" y="5.5" width="3.6" height="13" rx="1.1" /></svg>}
            </button>
          </div>
        </>}
      </div>

      <style jsx>{`
        /* Ozek in visok, ne sirok in plosnat: ob robu zaslona pusti vec prostora
           delu, Pupa pa dobi visino, da je vidna (Tina, 30. 8.). */
        .raz { position: fixed; right: 1.15rem; bottom: 6.6rem; z-index: 60;
          width: min(15.5rem, calc(100vw - 2.3rem));
          display: grid; justify-items: center; gap: .5rem;
          padding: 2.1rem 1rem 1.1rem;
          border: 1px solid rgba(124,92,240,.3); border-radius: 22px;
          background: linear-gradient(135deg, oklch(91% .09 160), oklch(94% .06 295));
          box-shadow: 0 .9rem 2.4rem rgba(17,17,17,.16);
          position: fixed; isolation: isolate; overflow: hidden;
          clip-path: inset(0 round 22px);
          animation: prihod .28s cubic-bezier(.2,.8,.3,1); }
        @keyframes prihod { from { opacity: 0; transform: translateY(.7rem) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .raz { animation: none } }

        /* styled-jsx ne doseze razredov, ki jih podamo otroski komponenti. */
        .raz :global(.raz-valovi) { position: absolute; z-index: -1; left: -2%; right: -2%; bottom: -8%;
          width: 104%; height: 118%; filter: blur(9px); }

        .raz-zvok { position: absolute; top: .55rem; left: .55rem;
          display: grid; place-items: center; width: 1.9rem; height: 1.9rem;
          border: 1px solid rgba(17,17,17,.14); border-radius: 999px;
          background: rgba(255,255,255,.6); color: rgba(17,17,17,.75); cursor: pointer; }
        .raz-zvok[aria-pressed='true'] { border-color: rgba(124,92,240,.6); color: oklch(52% .17 295); background: #fff; }
        .raz-zapri { position: absolute; top: .55rem; right: .55rem;
          display: grid; place-items: center; width: 1.9rem; height: 1.9rem;
          border: 1px solid rgba(17,17,17,.14); border-radius: 999px;
          background: rgba(255,255,255,.6); color: rgba(17,17,17,.75); cursor: pointer; }
        .raz-zapri:hover { background: #fff; color: #111; }

        .raz-pupa { display: block; width: auto; height: 172px; margin-bottom: -.2rem; }
        .raz-telo { display: grid; justify-items: center; gap: .15rem; text-align: center; width: 100%; }
        .raz-telo strong { font-size: .95rem; font-weight: 650; color: #111; line-height: 1.25; }
        .raz-telo p { margin: 0; font-size: .82rem; line-height: 1.4; color: rgba(17,17,17,.72); }
        .raz-cas { font-size: 2rem !important; font-weight: 700; color: #111 !important;
          font-variant-numeric: tabular-nums; letter-spacing: -.02em; line-height: 1.1; }
        .raz-gumbi { display: flex; gap: .4rem; align-items: center; justify-content: center; width: 100%; margin-top: .55rem; }
        .raz-drobni { margin-top: .1rem; }
        .raz-g { flex: 1; min-height: 2.4rem; padding: .4rem .9rem; border-radius: 999px; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
          font: 650 .82rem inherit; border: 1px solid rgba(17,17,17,.25); background: transparent; color: #111; }
        .raz-polni { background: #111; color: #fff; border-color: #111; }
        .raz-ikona { flex: none; width: 2.4rem; padding: 0; background: rgba(255,255,255,.6); }
        .raz-tiho { border: 0; background: transparent; color: rgba(17,17,17,.55);
          font: 500 .78rem inherit; cursor: pointer; padding: .3rem .45rem; }
        @media (max-width: 640px) { .raz { bottom: 5.4rem; right: .8rem; } .raz-pupa { height: 136px } }
      `}</style>
    </div>
  );
}
