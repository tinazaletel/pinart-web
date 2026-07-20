'use client';

import {
  FileText, Handshake, Scroll, Receipt, Wallet, Tag, Clock,
  Users, Target, Suitcase, SquaresFour, ArrowRight, CheckCircle, X, CaretLeft, CaretRight,
  ShieldCheck, Scales, ChatCircle, Sparkle, Plus, ChartLineUp, Robot, Plugs,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { localePath } from '@/i18n/routing';
import FlowHeroBg from '@/components/FlowHeroBg';
import AmbientBubbles from '@/components/AmbientBubbles';
import RotatingLaptop from '@/components/RotatingLaptop';

/* Predstavitev celotnega paketa Pinart Flow (pinartflow.com). Prodaja
   celoto — od ponudbe do racuna na enem mestu — in vodi v prijavo (Flow)
   ali v brezplacni kalkulator (funnel). Dizajn = naslovnica ponudbe:
   Bodoni, mreza, vijola/zelena blobi, pastelne gradientne kartice, lesk. */

export default function FlowLanding({ locale = 'sl' }: { locale?: string }) {
  const prijava = localePath(locale, '/kalkulator/prijava');
  const kalkulator = localePath(locale, '/kalkulator/orodje') + '?od=flow';
  const kalkulatorLanding = localePath(locale, '/kalkulator');

  const [taRubrika, setTaRubrika] = useState('vse');
  const [taZavihek, setTaZavihek] = useState('kalkulator');
  const [odprtoVpr, setOdprtoVpr] = useState<number | null>(0);
  const vrstaRef = useRef<HTMLDivElement>(null);

  const VPRASANJA = [
    { v: 'Je Pinart Flow res brezplačen?', o: 'Med beto je celoten Pinart Flow brezplačen. Kalkulator poštenih cen ostane brezplačen za vedno; ko potrebuješ napredna orodja, izbereš paket, ki ti ustreza.' },
    { v: 'Ali potrebujem račun za kalkulator?', o: 'Ne. Kalkulator deluje brez prijave: izračunaš pošteno ceno, sestaviš ponudbo in jo preneseš. Račun potrebuješ šele, ko želiš dokumente shraniti in imeti na enem mestu.' },
    { v: 'Komu pripadajo moji podatki in dokumenti?', o: 'Tvoje ponudbe, stranke in dokumenti ostanejo tvoji in zasebni — ne prodajamo jih in ne razkrivamo nikomur. Cene storitev, ki jih vpišeš, pa anonimno in združeno pomagajo graditi pregled poštenih tržnih cen, da ti Flow lahko pokaže, kje je tvoja cena glede na trg. Nikoli ne razkrijemo, kdo je vnesel katero ceno.' },
    { v: 'Kako mi Flow pomaga postaviti pravo ceno?', o: 'Kalkulator razbije ceno na izvedbo, avtorske pravice in licenco, nato pa jo primerja z anonimnim tržnim pregledom vpisanih cen — vidiš, ali si bližje dnu ali vrhu in za koliko se morda podcenjuješ. Cena tako ni več ugibanje.' },
    { v: 'Ali Flow upošteva avtorske pravice?', o: 'Da. Kalkulator loči izvedbo od licence in avtorskih pravic ter ceno prilagodi obsegu uporabe, trajanju in ozemlju, po pravu naročnikove jurisdikcije.' },
    { v: 'Kako iz ponudbe nastane račun?', o: 'Z enim klikom. Ponudbo pretvoriš v račun s samodejnim številčenjem, rokom plačila in statusom, brez ponovnega vnašanja podatkov.' },
    { v: 'Ali lahko Flow uporabljam za tuje naročnike?', o: 'Da. Flow je zasnovan globalno: večjezične predloge dokumentov in pravila, prilagojena jurisdikciji naročnika.' },
  ];
  const pauseUntil = useRef(0);
  const drsni = (smer: number) => {
    const el = vrstaRef.current;
    if (!el) return;
    pauseUntil.current = performance.now() + 1100;  // pavziraj auto med ročnim premikom
    // Ročna animacija (behavior:'smooth' ni povsod podprt); ease-out.
    const startL = el.scrollLeft;
    const target = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, startL + smer * 360));
    const t0 = performance.now();
    const anim = (t: number) => {
      const p = Math.min(1, (t - t0) / 480);
      el.scrollLeft = startL + (target - startL) * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  };

  /* Samodejno počasno drsenje vrste orodij (rAF); ustavi ob hoverju/dotiku in po ročnem
     premiku s puščicami (pauseUntil, da smooth premika ne prekine); spoštuj reduce-motion. */
  useEffect(() => {
    const el = vrstaRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let hover = false;
    const enter = () => { hover = true; };
    const leave = () => { hover = false; };
    const down = () => { pauseUntil.current = performance.now() + 1500; };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', down);
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(t - last, 50); last = t;
      if (!hover && t >= pauseUntil.current && el.scrollWidth > el.clientWidth + 1) {
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) {
          pauseUntil.current = t + 1300;
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollLeft += dt * 0.03;  // ~30px/s, počasi
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', down);
    };
  }, [taRubrika]);

  const RUBRIKE = [
    { id: 'vse', label: 'Vse' },
    { id: 'ponudbe', label: 'Ponudbe & cene' },
    { id: 'dogovori', label: 'Dogovori' },
    { id: 'finance', label: 'Finance' },
    { id: 'stranke', label: 'Stranke & cilji' },
  ];

  const ORODJA = [
    { Ikona: FileText, kat: 'ponudbe', h: 297, ime: 'Kalkulator ponudb', opis: 'Poštena cena projekta: izvedba, avtorske pravice in licenca. Trije paketi in urejljivo besedilo.', href: kalkulator, brezplacno: true },
    { Ikona: Handshake, kat: 'dogovori', h: 162, ime: 'Dolgoročno sodelovanje', opis: 'Retainer z mesečnim obsegom, urami in dobo. Jasni pogoji dolgoročnega dogovora.', href: localePath(locale, '/kalkulator/dolgorocno') },
    { Ikona: Scroll, kat: 'dogovori', h: 245, ime: 'Pogodbe', opis: 'Pogodbe o sodelovanju in prenosu pravic, pripravljene za podpis.', href: localePath(locale, '/kalkulator/pogodbe') },
    { Ikona: Receipt, kat: 'finance', h: 28, ime: 'Računi', opis: 'Iz ponudbe v račun z enim klikom. Številčenje, rok in status plačila.', href: localePath(locale, '/kalkulator/racuni') },
    { Ikona: Wallet, kat: 'finance', h: 330, ime: 'Stroški', opis: 'Odhodki in ponavljajoči se stroški, zbrani na enem mestu.', href: localePath(locale, '/kalkulator/stroski') },
    { Ikona: Tag, kat: 'ponudbe', h: 135, ime: 'Ceniki', opis: 'Tvoji cenovni profili: shraniš, urediš in znova uporabiš.', href: localePath(locale, '/kalkulator/ceniki') },
    { Ikona: Clock, kat: 'ponudbe', h: 85, ime: 'Cena & čas', opis: 'Koliko je vredna tvoja ura glede na cilje in obseg dela.', href: localePath(locale, '/kalkulator/cas') },
    { Ikona: Users, kat: 'stranke', h: 265, ime: 'Stranke', opis: 'Kartoteka naročnikov s podatki, dokumenti in zgodovino sodelovanja.', href: localePath(locale, '/kalkulator/stranke') },
    { Ikona: Target, kat: 'stranke', h: 12, ime: 'Cilji', opis: 'Mesečni cilj prihodkov in koliko projektov te loči do njega.', href: localePath(locale, '/kalkulator/cilji') },
    { Ikona: Suitcase, kat: 'finance', h: 205, ime: 'Poslovni okvir', opis: 'Širša slika: rezerva, davki in spodnja meja poštene cene.', href: localePath(locale, '/kalkulator/poslovni-nacrt') },
    { Ikona: SquaresFour, kat: 'stranke', h: 312, ime: 'Pregled', opis: 'Nadzorna plošča: promet, odprte ponudbe in čakajoča plačila.', href: localePath(locale, '/kalkulator/pregled') },
  ];
  const vidnaOrodja = ORODJA.filter(o => taRubrika === 'vse' || o.kat === taRubrika);

  /* Interaktivni prikaz (Magnific slog): pill-i zgoraj, spodaj velik predogled ki
     se menja ob kliku. Prihodnji zmožnosti nosijo značko (Agent = Beta, MCP & API = Kmalu). */
  const ZAVIHKI: { id: string; Ikona: React.ElementType; label: string; znacka?: string; zvrst?: 'free' | 'beta' | 'soon'; h: string; p: string; tocke: string[]; cta: string; href: string }[] = [
    { id: 'kalkulator', Ikona: FileText, label: 'Kalkulator', znacka: 'Brezplačno', zvrst: 'free',
      h: 'Poštena cena v nekaj klikih',
      p: 'Kalkulator razbije ceno na izvedbo, avtorske pravice in licenco ter pokaže pošteno številko — brez ugibanja in brez prijave.',
      tocke: ['Trije paketi in urejljivo besedilo', 'Avtorske pravice in licenca vračunane', 'Prenos v PDF ali pretvorba v račun'],
      cta: 'Odpri kalkulator', href: kalkulator },
    { id: 'dokumenti', Ikona: Receipt, label: 'Dokumenti',
      h: 'Od ponudbe do računa, brez podvajanja',
      p: 'Ponudba, pogodba, račun in stroški tečejo iz istih podatkov. En klik in dogovorjena ponudba postane račun.',
      tocke: ['Oštevilčenje, rok in status plačila', 'Pogodbe o sodelovanju in prenosu pravic', 'Enoten videz vseh dokumentov'],
      cta: 'Poglej orodja', href: '#orodja' },
    { id: 'pregled', Ikona: ChartLineUp, label: 'Pregled',
      h: 'Veš, koliko je vredno tvoje delo',
      p: 'Anonimen tržni pregled pokaže, kje je tvoja cena — bližje dnu ali vrhu. Nadzorna plošča spremlja promet, plačila in dobiček.',
      tocke: ['Tržni benchmark iz vpisanih cen', 'Promet, plačila in ocenjeni dobiček', 'Cilji in donosnost strank'],
      cta: 'Odpri pregled', href: localePath(locale, '/kalkulator/pregled') },
    { id: 'agent', Ikona: Robot, label: 'Agent', znacka: 'Beta', zvrst: 'beta',
      h: 'Tvoj pomočnik za ponudbe',
      p: 'Agent pomaga sestaviti ponudbo, predlaga pošteno ceno in pojasni avtorske pravice — zadnjo besedo imaš vedno ti.',
      tocke: ['Predlaga ceno in obseg dela', 'Pojasni pravice po jurisdikciji', 'Ti potrdiš, agent pripravi'],
      cta: 'Kmalu v beti', href: 'mailto:tina@pinart.si?subject=Flow%20Agent%20beta' },
    { id: 'mcpapi', Ikona: Plugs, label: 'MCP & API', znacka: 'Kmalu', zvrst: 'soon',
      h: 'Poveži Flow s svojimi orodji',
      p: 'Prek MCP in API bo Flow dostopen iz tvojega AI pomočnika, urejevalnika ali računovodstva. V pripravi.',
      tocke: ['MCP dostop iz AI orodij', 'API za ponudbe, račune in stranke', 'Na tvojem paketu, brez skritih stroškov'],
      cta: 'Obvesti me', href: 'mailto:tina@pinart.si?subject=Flow%20MCP%20%26%20API' },
  ];
  const zav = ZAVIHKI.find(z => z.id === taZavihek) ?? ZAVIHKI[0];
  const predoglediMock = (id: string) => {
    if (id === 'dokumenti') return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>ponudba · PNR-2026-014</small></div>
        <div className="fl-doc">
          <div className="fl-doc-lp"><strong>Ponudba</strong><span>PNR-2026-014</span></div>
          <div className="fl-doc-row"><b>Oblikovanje logotipa</b><span>480 €</span></div>
          <div className="fl-doc-row"><b>Prenos avtorskih pravic</b><span>240 €</span></div>
          <div className="fl-doc-row"><b>Licenca (2 leti, EU)</b><span>180 €</span></div>
          <div className="fl-doc-total"><b>Skupaj</b><span>900 €</span></div>
        </div>
      </div>
    );
    if (id === 'pregled') return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>poslovni pregled</small></div>
        <div className="fl-dash">
          <div className="fl-dash-top">
            <div className="fl-donut"><i>62%</i></div>
            <div className="fl-dash-kpi"><span>Ocenjeni dobiček</span><strong>1.240 €</strong></div>
          </div>
          <div className="fl-bench">
            <div className="fl-bench-label"><span>Tržni razpon cene</span><span className="fl-bench-you">tvoja cena</span></div>
            <div className="fl-bench-bar"><span className="fl-bench-mark" /></div>
          </div>
        </div>
      </div>
    );
    if (id === 'agent') return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>Flow agent · beta</small></div>
        <div className="fl-mock-body">
          <span className="fl-msg me">Pripravi ponudbo za spletno trgovino.</span>
          <span className="fl-msg bot"><span className="fl-ava" />Predlagam pošteno ceno in obseg …</span>
          <div className="fl-agent-note"><span className="fl-agent-dot"><Robot size={17} weight="regular" /></span><div><b>Ponudba pripravljena</b><br /><small>1.850 € · pravice vračunane</small></div></div>
        </div>
      </div>
    );
    if (id === 'mcpapi') return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>flow API</small></div>
        <div className="fl-code">
          <span className="fl-code-line a" /><span className="fl-code-line b" /><span className="fl-code-line c" /><span className="fl-code-line d" /><span className="fl-code-line b" />
          <div className="fl-soon"><span>Kmalu</span></div>
        </div>
      </div>
    );
    return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>pinart kalkulator</small></div>
        <div className="fl-mock-body">
          <span className="fl-msg bot"><span className="fl-ava" />Živjo! Kako ti je ime?</span>
          <span className="fl-msg me">Tina</span>
          <span className="fl-msg bot"><span className="fl-ava" />Kakšne izkušnje imaš?</span>
          <span className="fl-msg me">Šele začenjam</span>
          <span className="fl-chip"><FileText size={14} weight="regular" />Ponudba · od 0 €</span>
        </div>
      </div>
    );
  };

  const FUNKCIJE = [
    { Ikona: ChartLineUp, ime: 'Veš, koliko si vreden', opis: 'Anonimen tržni pregled ti pokaže, kje je tvoja cena — bližje dnu ali vrhu — da se ne podcenjuješ.' },
    { Ikona: Scales, ime: 'Avtorske pravice vračunane', opis: 'Cena vsakič razbije izvedbo, pravice in licenco — da dela ne prodaš pod ceno.' },
    { Ikona: ShieldCheck, ime: 'Tvoji podatki, tvoja last', opis: 'Tvoji dokumenti in stranke ostanejo zasebni. Osebnih podatkov nikoli ne prodamo.' },
    { Ikona: Receipt, ime: 'Od ponudbe do računa', opis: 'Ponudba, pogodba, račun in stroški tečejo iz istih podatkov, brez podvajanja.' },
    { Ikona: SquaresFour, ime: 'Brez Excela in map', opis: 'Eno mirno mesto namesto dokumentov, razmetanih po računalniku.' },
    { Ikona: ChatCircle, ime: 'Osebna podpora', opis: 'Pišeš neposredno Tini. Pravi človek, ne oddelek.' },
    { Ikona: Sparkle, ime: 'Med beto brezplačno', opis: 'Vsi paketi so med beto na voljo brezplačno. Brez kartice.' },
  ];

  const KORAKI = [
    { n: '01', naslov: 'Lepa ponudba v nekaj klikih', opis: 'Flow napiše IN oblikuje reprezentativno ponudbo — brez ChatGPT-ja in InDesigna.' },
    { n: '02', naslov: 'Prava cena, brez ugibanja', opis: 'Poštena cena z avtorskimi pravicami in tržni pregled, kje si. Nič več ur iskanja cen.' },
    { n: '03', naslov: 'Veš, ali si zaslužil', opis: 'Račun z enim klikom, pregled stroškov in dejanskega zaslužka — pripravljeno za računovodstvo.' },
  ];

  /* Predlog cenika (cene so okvirne — potrdi/prilagodi). */
  const CENIKI = [
    {
      ime: 'Brezplačno', za: 'Za začetek in enkratne projekte', cena: '0', enota: '€ za vedno',
      cta: 'Odpri kalkulator', href: kalkulator, izpost: false, znacka: '', kmalu: false,
      vkljuceno: ['Kalkulator poštenih cen', 'Trije paketi + avtorske pravice', 'Oblikovana in urejljiva ponudba', 'Izvoz v e-pošto / PDF'],
      brez: ['Shranjeni dokumenti', 'Pogodbe in računi', 'Stranke in cilji'],
    },
    {
      ime: 'Premium', za: 'Za redno delo s strankami', cena: '9', enota: '€ / mesec',
      cta: 'Začni s Premium', href: localePath(locale, '/kalkulator/prijava'), izpost: true, znacka: 'Najbolj priljubljeno', kmalu: false,
      vkljuceno: ['Vse iz Brezplačno', 'Shranjene ponudbe, pogodbe, računi', 'Dolgoročni retainerji', 'Kartoteka strank', 'Stroški in cilji', 'Časovnik in donosnost dela', 'Nadzorna plošča'],
      brez: ['Poslovni okvir in davki'],
    },
    {
      ime: 'Pro', za: 'Za polno poslovanje', cena: '19', enota: '€ / mesec',
      cta: 'Kmalu', href: localePath(locale, '/kalkulator/prijava'), izpost: false, znacka: 'Kmalu', kmalu: true,
      vkljuceno: ['Vse iz Premium', 'Celoten analitični pregled — prihodki in dobiček po strankah', 'Sinhronizacija med vsemi orodji', 'Poslovni okvir in davki', 'Posredovanje računovodstvu (izvoz)', 'AI agent (beta)', 'MCP & API dostop (kmalu)', 'Prednostna podpora'],
      brez: [],
    },
  ];

  return (
    <div className="fl">
      <style dangerouslySetInnerHTML={{ __html: `
        .fl { position: relative; z-index: 1; color: var(--ink); font-weight: 300; overflow-x: clip; }

        /* Ozadje: mreza + vijola/zelena animirani blobi (kot naslovnica) */
        /* POZOR: NE position:fixed! Znotraj Lenis transform ovoja se fixed obnaša
           kot absolute in v Safari/Chrome pokvari izris vsebine nad njim (sekcije
           ostanejo prazne). absolute + polna višina .fl deluje pravilno. */
        .fl-ozadje { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; background-color: var(--paper); background-image: linear-gradient(rgba(17,17,17,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,.045) 1px, transparent 1px); background-size: 4.5rem 4.5rem; }
        /* BREZ filter:blur (težek GPU sloj -> v Chromu se sekcije ne izrišejo).
           Mehkobo dosežemo z gradientom samim (transparent že pri ~48%). */
        .fl-blob { position: absolute; width: min(62vw, 720px); aspect-ratio: 1; border-radius: 50%; opacity: .6; }
        .fl-blob.v { background: radial-gradient(circle at 50% 50%, oklch(72% .17 297 / .5), transparent 55%); top: -14%; left: -10%; animation: flBlobV 24s ease-in-out infinite; }
        .fl-blob.g { background: radial-gradient(circle at 50% 50%, oklch(82% .13 165 / .48), transparent 55%); bottom: -16%; right: -12%; animation: flBlobG 28s ease-in-out infinite; }
        .fl-blob.v2 { background: radial-gradient(circle at 50% 50%, oklch(78% .12 320 / .4), transparent 58%); top: 42%; right: 18%; width: min(40vw, 460px); animation: flBlobV 32s ease-in-out infinite reverse; }
        @keyframes flBlobV { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(7vw,6vh) scale(1.12)} 50%{transform:translate(-4vw,10vh) scale(.94)} 75%{transform:translate(5vw,-5vh) scale(1.06)} }
        @keyframes flBlobG { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(-6vw,-5vh) scale(1.1)} 50%{transform:translate(5vw,-9vh) scale(.95)} 75%{transform:translate(-4vw,5vh) scale(1.05)} }
        @media (prefers-reduced-motion: reduce) { .fl-blob { animation: none; } .fl-orb { animation: none !important; } }

        .fl-oder { max-width: 1480px; margin: 0 auto; padding: clamp(5.5rem, 11vw, 8.5rem) clamp(1.5rem, 5vw, 5.5rem) clamp(5rem, 8vw, 8rem); }

        /* Hero — sekcija naravne višine (vsebina + spodobna spodnja praznina za
           mehurčke). isolation: izolira ozadje, da ne pokvari izrisa sekcij pod njim.
           Ozadje (.fl-herobg) je height:100% → se ujema s hero sekcijo in NE štrli. */
        .fl-hero { position: relative; min-height: calc(94svh + 80px); isolation: isolate; }
        .fl .kicker { font-size: .72rem; font-weight: 600; letter-spacing: .24em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl .kicker b { color: var(--accent); font-weight: 700; }
        .fl h1 { font-family: var(--font-serif), Didot, serif; font-weight: 500; font-size: clamp(2.7rem, 8.5vw, 5.2rem); line-height: .97; letter-spacing: -.015em; margin: .7rem 0 1.3rem; max-width: 15ch; }
        .fl h1 em { font-style: italic; }
        .fl .lead { font-size: clamp(1.08rem, 2.1vw, 1.35rem); line-height: 1.55; color: rgba(17,17,17,.82); max-width: 46ch; margin: 0 0 2.2rem; }
        .fl .cta-vrsta { display: flex; flex-wrap: wrap; gap: .8rem; align-items: center; }
        .fl .cta { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: .55rem; font-family: inherit; font-size: .82rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; border-radius: 999px; padding: 1rem 2rem; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); text-decoration: none; transition: transform .2s ease, box-shadow .2s ease; }
        .fl .cta svg { transition: transform .2s ease; }
        .fl .cta:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(40,25,60,.22); }
        .fl .cta:hover svg { transform: translateX(3px); }
        .fl .cta::after { content: ''; position: absolute; top: 0; left: -160%; width: 90%; height: 100%; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.95) 50%, transparent 100%); transform: skewX(-18deg); transition: left .6s cubic-bezier(.19,1,.22,1); pointer-events: none; }
        .fl .cta:hover::after { left: 170%; }
        .fl .cta.duh { background: transparent; color: var(--ink); border-color: rgba(17,17,17,.28); }
        .fl .cta.duh::after { background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.6) 50%, transparent 100%); }
        .fl .cta-note { font-size: .8rem; color: rgba(17,17,17,.6); }

        /* Poteka: od ponudbe do racuna */
        .fl-potek { margin: calc(-11.6875rem - 80px) 0 0; position: relative; z-index: 2; }
        .fl-potek .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-potek h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem 0 2.2rem; max-width: 20ch; }
        .fl-koraki { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.6rem; }
        @media (max-width: 720px) { .fl-koraki { grid-template-columns: 1fr; gap: 1.4rem; } }
        .fl-korak { position: relative; padding: 1.5rem 1.4rem; border-radius: 18px; background: linear-gradient(140deg, oklch(97% .022 297 / .9), oklch(96% .03 165 / .85)); border: 1px solid rgba(255,255,255,.6); box-shadow: 0 12px 34px rgba(40,25,60,.07); }
        .fl-korak .n { font-family: var(--font-serif), serif; font-size: 1.5rem; color: var(--accent); }
        .fl-korak h3 { font-size: 1.02rem; font-weight: 650; margin: .5rem 0 .4rem; }
        .fl-korak p { font-size: .9rem; line-height: 1.6; color: rgba(17,17,17,.74); margin: 0; }

        /* Vmesna sekcija z vrtečim laptopom */
        .fl-laptop { margin: 9.85rem 0 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: clamp(2rem, 5vw, 4.5rem); align-items: center; }
        @media (max-width: 860px) { .fl-laptop { grid-template-columns: 1fr; gap: 1.5rem; } }
        .fl-laptop-txt .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
        .fl-laptop-txt h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 4.4vw, 3rem); line-height: 1.08; letter-spacing: -.01em; margin: .6rem 0 1rem; max-width: 18ch; }
        .fl-laptop-txt h2 em { font-style: italic; color: var(--accent); }
        .fl-laptop-txt p { font-size: 1.02rem; line-height: 1.6; color: rgba(17,17,17,.76); max-width: 42ch; margin: 0; }
        .fl-laptop-vizual { display: flex; justify-content: center; }
        .fl-rl { width: 100%; max-width: 560px; aspect-ratio: 4 / 3; }
        @media (max-width: 860px) { .fl-rl { max-width: 440px; } }

        /* Orodja mreza */
        .fl-orodja { margin: 9.85rem 0 0; padding-top: 2.6rem; }
        .fl-orodja .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-orodja h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem 0 .5rem; max-width: 20ch; }
        .fl-orodja .uvod { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.76); max-width: 50ch; margin: 0 0 2.4rem; }
        .fl-orodja-nadzor { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 1.9rem 0 1.3rem; flex-wrap: wrap; }
        .fl-rubrike { display: inline-flex; gap: .25rem; padding: .28rem; border-radius: 999px; background: oklch(93% .012 87); flex-wrap: wrap; }
        .fl-rubrike button { border: 0; background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; font-weight: 650; color: rgba(17,17,17,.62); padding: .5rem 1rem; border-radius: 999px; cursor: pointer; transition: background .18s, color .18s; white-space: nowrap; }
        .fl-rubrike button.on { background: var(--ink); color: var(--paper); }
        .fl-puscice { display: flex; gap: .5rem; }
        .fl-puscice button { width: 2.7rem; height: 2.7rem; display: grid; place-items: center; border-radius: 50%; border: 1px solid rgba(17,17,17,.16); background: var(--paper); color: var(--ink); cursor: pointer; transition: background .16s, border-color .16s; }
        .fl-puscice button:hover { background: rgba(17,17,17,.05); border-color: var(--ink); }
        @media (max-width: 560px) { .fl-puscice { display: none; } }
        .fl-orodja-vrsta { display: flex; gap: 1rem; overflow-x: auto; padding: .6rem .3rem 1.2rem; padding-right: max(5vw, 3rem); margin: 0 calc(50% - 50vw) 0 -.3rem; scrollbar-width: none; }
        .fl-orodja-vrsta::-webkit-scrollbar { display: none; }
        .fl-tkarta { flex: 0 0 clamp(15rem, 23vw, 17.5rem); display: block; padding: 1.5rem 1.4rem 1.6rem; border-radius: 18px; background: rgba(255,255,255,.94); border: 1px solid rgba(255,255,255,.9); box-shadow: 0 12px 32px rgba(40,25,60,.07); text-decoration: none; color: var(--ink); transition: transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s ease; }
        .fl-tkarta:hover { transform: translateY(-4px); box-shadow: 0 22px 48px rgba(40,25,60,.14); }
        .fl-tkarta-ikona { display: inline-flex; align-items: center; justify-content: center; width: 2.7rem; height: 2.7rem; border-radius: 13px; background: oklch(93% .055 var(--h, 297)); color: oklch(52% .15 var(--h, 297)); margin-bottom: .95rem; transition: transform .22s cubic-bezier(.16,1,.3,1); }
        .fl-tkarta:hover .fl-tkarta-ikona { transform: scale(1.07) rotate(-3deg); }
        .fl-tkarta h3 { font-size: 1.02rem; font-weight: 650; margin: 0 0 .35rem; display: flex; align-items: center; gap: .5rem; }
        .fl-tkarta p { font-size: .86rem; line-height: 1.55; color: rgba(17,17,17,.72); margin: 0; }
        .fl-znacka { font-size: .6rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: oklch(45% .13 155); background: oklch(92% .08 160); border-radius: 999px; padding: .2rem .5rem; }

        /* Interaktivni prikaz orodij (Magnific slog, Flow paleta) */
        .fl-showcase { margin: 9.85rem 0 0; padding-top: 2.6rem; }
        .fl-showcase-glava { text-align: center; max-width: 42ch; margin: 0 auto 1.8rem; }
        .fl-showcase-glava .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-showcase-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem auto .5rem; max-width: 20ch; text-wrap: balance; }
        .fl-showcase-glava p { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.76); margin: 0 auto; }
        .fl-sc-pills { display: flex; flex-wrap: nowrap; justify-content: center; gap: .5rem; margin: 0 auto 1.7rem; max-width: 62rem; }
        @media (max-width: 900px) { .fl-sc-pills { overflow-x: auto; justify-content: flex-start; scrollbar-width: none; padding-bottom: .2rem; } .fl-sc-pills::-webkit-scrollbar { display: none; } .fl-sc-pill { flex: 0 0 auto; } }
        .fl-sc-pill { display: inline-flex; align-items: center; gap: .5rem; padding: .58rem .95rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.14); background: rgba(255,255,255,.72); font-family: var(--font-sans), system-ui, sans-serif; font-size: .85rem; font-weight: 600; color: rgba(17,17,17,.7); cursor: pointer; white-space: nowrap; transition: color .16s, border-color .16s, background .16s, transform .16s; }
        .fl-sc-pill svg { opacity: .75; }
        .fl-sc-pill:hover { color: var(--ink); border-color: rgba(17,17,17,.3); transform: translateY(-1px); }
        .fl-sc-pill.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .fl-sc-pill.on svg { opacity: 1; }
        .fl-sc-badge { font-size: .56rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; border-radius: 999px; padding: .16rem .44rem; }
        .fl-sc-badge.free { color: oklch(45% .13 155); background: oklch(92% .08 160); }
        .fl-sc-badge.beta { color: oklch(50% .17 297); background: oklch(93% .06 300); }
        .fl-sc-badge.soon { color: rgba(17,17,17,.5); background: rgba(17,17,17,.08); }
        .fl-sc-pill.on .fl-sc-badge { background: rgba(255,255,255,.18); color: rgba(255,255,255,.92); }
        .fl-sc-panel { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr); gap: clamp(1.6rem, 4vw, 3.2rem); align-items: center; border-radius: 26px; padding: clamp(2rem, 4vw, 3.2rem); background: linear-gradient(135deg, oklch(96% .03 297), oklch(95% .035 320), oklch(95% .03 165)); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 20px 60px rgba(40,25,60,.1); overflow: hidden; }
        @media (max-width: 860px) { .fl-sc-panel { grid-template-columns: 1fr; } }
        .fl-sc-vizual { position: relative; }
        .fl-sc-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 14px; background: #fff; box-shadow: 0 24px 60px rgba(40,25,60,.18); }
        .fl-sc-info h3 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.55rem, 3.6vw, 2.25rem); line-height: 1.08; margin: 0 0 .6rem; max-width: 18ch; }
        .fl-sc-info > p { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.8); max-width: 46ch; margin: 0; }
        .fl-sc-tocke { list-style: none; margin: 1.25rem 0 1.7rem; padding: 0; display: grid; gap: .6rem; }
        .fl-sc-tocke li { display: flex; align-items: flex-start; gap: .55rem; font-size: .9rem; line-height: 1.4; color: rgba(17,17,17,.82); }
        .fl-sc-tocke li svg { flex: none; margin-top: .08rem; color: oklch(52% .13 155); }
        .fl-sc-anim { animation: flScIn .5s cubic-bezier(.16,1,.3,1); }
        @keyframes flScIn { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .fl-sc-anim { animation: none; } }

        /* Predogledni mocki v prikazu */
        .fl-mock { border-radius: 14px; overflow: hidden; background: #fff; border: 1px solid rgba(17,17,17,.1); box-shadow: 0 24px 60px rgba(40,25,60,.18); }
        .fl-mock-bar { display: flex; align-items: center; gap: .4rem; padding: .5rem .75rem; background: oklch(96% .008 87); border-bottom: 1px solid rgba(17,17,17,.07); }
        .fl-mock-bar i { width: .55rem; height: .55rem; border-radius: 50%; background: rgba(17,17,17,.18); }
        .fl-mock-bar small { margin-left: .5rem; font-size: .62rem; letter-spacing: .04em; color: rgba(17,17,17,.5); }
        .fl-mock-body { padding: 1.15rem; display: grid; gap: .65rem; min-height: 15.5rem; align-content: start; }
        .fl-msg { display: inline-flex; align-items: center; gap: .5rem; max-width: 82%; padding: .55rem .8rem; border-radius: 14px; font-size: .8rem; font-weight: 600; line-height: 1.3; }
        .fl-msg.bot { background: oklch(96% .012 297); color: var(--ink); border-top-left-radius: 4px; justify-self: start; }
        .fl-msg.me { background: oklch(90% .055 190); color: var(--ink); border-top-right-radius: 4px; justify-self: end; }
        .fl-ava { width: 1.4rem; height: 1.4rem; border-radius: 50%; flex: none; background: radial-gradient(58% 48% at 30% 24%, rgba(255,255,255,.9), rgba(255,255,255,0) 62%), conic-gradient(from 210deg, #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); }
        .fl-chip { justify-self: end; display: inline-flex; align-items: center; gap: .4rem; margin-top: .2rem; padding: .5rem .72rem; border-radius: 12px; background: var(--ink); color: var(--paper); font-size: .74rem; font-weight: 700; }
        .fl-doc { padding: 1.3rem 1.25rem; display: grid; gap: .45rem; align-content: start; min-height: 15.5rem; }
        .fl-doc-lp { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(17,17,17,.1); padding-bottom: .55rem; margin-bottom: .35rem; }
        .fl-doc-lp strong { font-family: var(--font-serif), serif; font-weight: 500; font-size: 1.15rem; }
        .fl-doc-lp span { font-size: .66rem; letter-spacing: .04em; color: rgba(17,17,17,.5); }
        .fl-doc-row { display: flex; justify-content: space-between; gap: 1rem; font-size: .82rem; color: rgba(17,17,17,.78); padding: .22rem 0; }
        .fl-doc-row b { font-weight: 550; }
        .fl-doc-total { display: flex; justify-content: space-between; margin-top: .5rem; padding-top: .6rem; border-top: 1px solid rgba(17,17,17,.14); font-family: var(--font-serif), serif; font-size: 1.05rem; }
        .fl-dash { padding: 1.3rem 1.25rem; display: grid; gap: 1.1rem; align-content: start; min-height: 15.5rem; }
        .fl-dash-top { display: flex; align-items: center; gap: 1.1rem; }
        .fl-donut { width: 4.4rem; height: 4.4rem; border-radius: 50%; flex: none; background: conic-gradient(oklch(66% .2 297) 0 62%, oklch(93.5% .005 87) 62% 100%); display: grid; place-items: center; }
        .fl-donut i { width: 2.9rem; height: 2.9rem; border-radius: 50%; background: #fff; display: grid; place-items: center; font-style: normal; font-size: .8rem; font-weight: 700; color: var(--ink); }
        .fl-dash-kpi { display: grid; gap: .2rem; }
        .fl-dash-kpi span { font-size: .7rem; color: rgba(17,17,17,.55); }
        .fl-dash-kpi strong { font-family: var(--font-serif), serif; font-weight: 500; font-size: 1.5rem; }
        .fl-bench { display: grid; gap: .5rem; }
        .fl-bench-label { display: flex; justify-content: space-between; font-size: .7rem; color: rgba(17,17,17,.6); }
        .fl-bench-you { color: var(--ink); font-weight: 700; }
        .fl-bench-bar { position: relative; height: .62rem; border-radius: 999px; background: linear-gradient(90deg, oklch(88% .09 30), oklch(92% .1 90), oklch(85% .13 155)); }
        .fl-bench-mark { position: absolute; top: 50%; left: 68%; width: 1rem; height: 1rem; border-radius: 50%; background: var(--ink); border: 2px solid #fff; transform: translate(-50%, -50%); box-shadow: 0 2px 7px rgba(0,0,0,.28); }
        .fl-agent-note { margin-top: .3rem; display: flex; gap: .65rem; align-items: center; padding: .7rem .85rem; border-radius: 12px; background: oklch(95% .04 297); border: 1px solid oklch(88% .05 297); }
        .fl-agent-note b { font-size: .8rem; }
        .fl-agent-note small { font-size: .7rem; color: rgba(17,17,17,.6); }
        .fl-agent-dot { width: 1.9rem; height: 1.9rem; border-radius: 50%; flex: none; display: grid; place-items: center; background: var(--ink); color: #fff; }
        .fl-code { position: relative; padding: 1.3rem 1.35rem; min-height: 15.5rem; background: oklch(22% .016 285); display: grid; gap: .55rem; align-content: start; }
        .fl-code-line { height: .5rem; border-radius: 999px; background: oklch(40% .03 285); }
        .fl-code-line.a { width: 68%; background: oklch(62% .13 297); }
        .fl-code-line.b { width: 88%; }
        .fl-code-line.c { width: 54%; background: oklch(64% .1 190); }
        .fl-code-line.d { width: 76%; }
        .fl-soon { position: absolute; inset: 0; display: grid; place-content: center; background: oklch(22% .016 285 / .5); backdrop-filter: blur(2px); }
        .fl-soon span { font-family: var(--font-sans), system-ui, sans-serif; font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #fff; border: 1px solid rgba(255,255,255,.4); border-radius: 999px; padding: .35rem .9rem; }

        /* Bento "Zacni preprosto" (Magnific slog, Flow paleta) */
        .fl-bento { margin: 9.85rem 0 0; padding-top: 2.6rem; }
        .fl-bento-glava { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem 2rem; flex-wrap: wrap; margin-bottom: 1.9rem; }
        .fl-bento-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 3rem); line-height: 1.03; margin: 0; max-width: 16ch; }
        .fl-bento-glava p { font-size: 1rem; line-height: 1.55; color: rgba(17,17,17,.72); margin: .5rem 0 0; max-width: 34ch; }
        .fl-bento-glava .cta { flex: none; }
        .fl-bento-mreza { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-auto-rows: 15rem; gap: 1rem; }
        .fl-bkarta { position: relative; overflow: hidden; border-radius: 22px; padding: 1.6rem 1.5rem; display: flex; flex-direction: column; }
        .fl-bkarta h3 { font-size: 1.15rem; font-weight: 650; margin: 0 0 .45rem; line-height: 1.2; }
        .fl-bkarta > p { font-size: .88rem; line-height: 1.5; margin: 0; max-width: 30ch; }
        .fl-bkarta.a { grid-column: 1; grid-row: 1 / span 2; background: rgba(255,255,255,.92); border: 1px solid rgba(255,255,255,.9); box-shadow: 0 12px 32px rgba(40,25,60,.07); color: var(--ink); }
        .fl-bkarta.a > p { color: rgba(17,17,17,.72); }
        .fl-bkarta.b { grid-column: 2 / span 2; grid-row: 1; background: oklch(21% .016 285); color: #fff; }
        .fl-bkarta.c { grid-column: 2; grid-row: 2; background: linear-gradient(150deg, oklch(44% .17 300), oklch(30% .1 300)); color: #fff; }
        .fl-bkarta.d { grid-column: 3; grid-row: 2; background: linear-gradient(150deg, oklch(46% .1 190), oklch(31% .06 200)); color: #fff; }
        .fl-bkarta.b > p, .fl-bkarta.c > p, .fl-bkarta.d > p { color: rgba(255,255,255,.74); }
        .fl-bthumbs { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; margin-top: 1.2rem; }
        .fl-bthumbs span { position: relative; overflow: hidden; aspect-ratio: 1; border-radius: 11px; background: linear-gradient(135deg, oklch(90% .07 297), oklch(90% .07 165)); }
        .fl-bthumbs span img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .fl-bthumbs span:nth-child(3n+2) { background: linear-gradient(135deg, oklch(90% .07 330), oklch(90% .06 90)); }
        .fl-bthumbs span:nth-child(3n) { background: linear-gradient(135deg, oklch(90% .06 200), oklch(90% .07 297)); }
        .fl-bflow { display: flex; align-items: center; gap: .5rem; margin-top: auto; flex-wrap: wrap; }
        .fl-bflow b { font-size: .78rem; font-weight: 600; padding: .42rem .72rem; border-radius: 999px; background: rgba(255,255,255,.12); color: #fff; }
        .fl-bflow i { color: rgba(255,255,255,.5); font-style: normal; }
        .fl-bavatars { display: flex; margin-top: auto; }
        .fl-bavatars span { width: 2.1rem; height: 2.1rem; border-radius: 50%; border: 2px solid oklch(35% .12 300); margin-left: -.55rem; display: grid; place-items: center; font-size: .68rem; font-weight: 700; color: #fff; background: oklch(56% .16 300); }
        .fl-bavatars span:first-child { margin-left: 0; }
        .fl-bprice { margin-top: auto; display: inline-flex; align-items: baseline; gap: .4rem; }
        .fl-bprice strong { font-family: var(--font-serif), serif; font-weight: 500; font-size: 2rem; line-height: 1; color: #fff; }
        .fl-bprice span { font-size: .8rem; color: rgba(255,255,255,.7); }
        @media (max-width: 900px) {
          .fl-bento-mreza { grid-template-columns: 1fr 1fr; grid-auto-rows: 13rem; }
          .fl-bkarta.a { grid-column: 1; grid-row: 1 / span 2; }
          .fl-bkarta.b { grid-column: 2; grid-row: 1; }
          .fl-bkarta.c { grid-column: 2; grid-row: 2; }
          .fl-bkarta.d { grid-column: 1 / span 2; grid-row: 3; }
        }
        @media (max-width: 620px) {
          .fl-bento-mreza { grid-template-columns: 1fr; grid-auto-rows: auto; }
          .fl-bkarta { min-height: 12rem; }
          .fl-bkarta.a, .fl-bkarta.b, .fl-bkarta.c, .fl-bkarta.d { grid-column: 1; grid-row: auto; }
        }

        /* Zakljucni CTA */
        .fl-konec { margin: 9.85rem 0 0; text-align: center; padding-top: 3.4rem; }
        .fl-konec h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(2rem, 6vw, 3.4rem); line-height: 1.02; margin: 0 auto 1.6rem; max-width: 18ch; }
        .fl-konec .cta-vrsta { justify-content: center; }
        .fl-konec .zakljucki { margin: 2rem 0 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 1.6rem; font-size: 1.02rem; color: rgba(17,17,17,.72); }
        .fl-konec .zakljucki span { display: inline-flex; align-items: center; gap: .4rem; }
        .fl-konec .zakljucki svg { color: oklch(52% .13 155); }

        /* Temna "features" sekcija (Magnific slog) */
        .fl-funkcije { position: relative; overflow: hidden; margin: 10.05rem 0 0; border-radius: 26px; padding: clamp(2.4rem, 5vw, 3.8rem); background: oklch(21% .016 285); color: oklch(95% .01 285); }
        /* Prelivajoc gradient v krivulji ZA temno podlago (mehke, blur-ane barvne lise, ki pocasi lebdijo) */
        .fl-funkcije::before { content: ''; position: absolute; inset: -45% -20% -25% -20%; z-index: 0; pointer-events: none; filter: blur(55px); opacity: .9;
          background:
            radial-gradient(42% 52% at 20% 16%, oklch(58% .19 297 / .5), transparent 62%),
            radial-gradient(38% 48% at 84% 40%, oklch(66% .16 200 / .38), transparent 60%),
            radial-gradient(48% 58% at 60% 96%, oklch(70% .15 330 / .32), transparent 62%);
          animation: fnFlow 34s ease-in-out infinite; }
        @keyframes fnFlow { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(2.5%, -2%) scale(1.09); } }
        @media (prefers-reduced-motion: reduce) { .fl-funkcije::before { animation: none; } }
        .fl-funkcije > * { position: relative; z-index: 1; }
        .fl-funkcije-glava { max-width: 46ch; }
        .fl-funkcije-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.7rem, 4vw, 2.6rem); line-height: 1.08; margin: 0 0 .6rem; color: #fff; -webkit-text-stroke: 0; }
        .fl-funkcije-glava p { font-size: 1rem; line-height: 1.55; color: oklch(72% .02 285); margin: 0; }
        .fl-funkcije-mreza { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.8rem 2rem; margin-top: 2.8rem; }
        @media (max-width: 780px) { .fl-funkcije-mreza { grid-template-columns: 1fr; gap: 1.4rem; } }
        .fl-funkcija { display: flex; gap: .9rem; align-items: flex-start; }
        .fl-funkcija-ikona { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; flex-shrink: 0; border-radius: 10px; background: oklch(29% .02 285); color: oklch(84% .11 297); }
        .fl-funkcija strong { display: block; font-size: 1rem; font-weight: 650; color: #fff; margin-bottom: .25rem; }
        .fl-funkcija p { font-size: .88rem; line-height: 1.5; color: oklch(70% .02 285); margin: 0; }

        /* Cenik (price plans, Magnific slog) */
        .fl-cenik { margin: 10.05rem 0 0; padding-top: 2.6rem; text-align: center; }
        .fl-cenik > .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-cenik > h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem 0 .5rem; }
        .fl-cenik > .uvod { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.76); max-width: 46ch; margin: 0 auto 2.8rem; }
        .fl-cenik-mreza { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.1rem; text-align: left; align-items: start; }
        @media (max-width: 860px) { .fl-cenik-mreza { grid-template-columns: 1fr; max-width: 30rem; margin: 0 auto; } }
        .fl-plan { position: relative; display: flex; flex-direction: column; padding: 1.7rem 1.5rem; border-radius: 20px; background: rgba(255,255,255,.92); border: 1px solid rgba(17,17,17,.1); box-shadow: 0 12px 32px rgba(40,25,60,.06); }
        .fl-plan.izpost { border: 1.5px solid var(--ink); box-shadow: 0 22px 50px rgba(40,25,60,.14); }
        .fl-plan-znacka { position: absolute; top: -.7rem; left: 1.5rem; font-size: .6rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--paper); background: var(--ink); border-radius: 999px; padding: .28rem .7rem; }
        .fl-plan h3 { font-family: var(--font-serif), serif; font-weight: 500; font-size: 1.6rem; margin: .3rem 0 .2rem; }
        .fl-plan-za { font-size: .82rem; color: rgba(17,17,17,.6); margin: 0 0 1rem; min-height: 2.4em; }
        .fl-plan-cena { display: flex; align-items: baseline; gap: .35rem; margin-bottom: 1.2rem; }
        .fl-plan-cena strong { font-family: var(--font-serif), serif; font-weight: 500; font-size: 2.6rem; line-height: 1; }
        .fl-plan-cena span { font-size: .8rem; color: rgba(17,17,17,.6); }
        .fl-plan-cta { position: relative; overflow: hidden; display: block; text-align: center; font-size: .82rem; font-weight: 700; letter-spacing: .04em; text-decoration: none; padding: .8rem 1rem; border-radius: 999px; border: 1px solid var(--ink); color: var(--ink); transition: background .16s, color .16s, transform .16s; }
        .fl-plan-cta:hover { transform: translateY(-1px); }
        .fl-plan-cta.polni { background: var(--ink); color: var(--paper); }
        .fl-plan-cta:not(.polni):hover { background: rgba(17,17,17,.04); }
        .fl-plan-cta::after { content: ''; position: absolute; top: 0; left: -160%; width: 90%; height: 100%; background: linear-gradient(120deg, transparent 0%, rgba(124,58,237,.28) 42%, rgba(56,189,248,.28) 58%, transparent 100%); transform: skewX(-18deg); transition: left .6s cubic-bezier(.19,1,.22,1); pointer-events: none; }
        .fl-plan-cta.polni::after { background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.9) 50%, transparent 100%); }
        .fl-plan-cta:hover::after { left: 170%; }
        .fl-plan.kmalu { opacity: .62; }
        .fl-plan.kmalu .fl-plan-znacka { background: rgba(17,17,17,.42); }
        .fl-plan-cta.cakalna { pointer-events: none; border-style: dashed; border-color: rgba(17,17,17,.3); color: rgba(17,17,17,.5); }
        .fl-plan-cta.cakalna::after { display: none; }
        .fl-plan-lista { list-style: none; margin: 1.4rem 0 0; padding: 1.3rem 0 0; border-top: 1px solid rgba(17,17,17,.1); display: grid; gap: .65rem; }
        .fl-plan-lista li { display: flex; align-items: flex-start; gap: .55rem; font-size: .86rem; line-height: 1.4; color: rgba(17,17,17,.82); }
        .fl-plan-lista li svg { flex-shrink: 0; margin-top: .06rem; }
        .fl-plan-lista li.da svg { color: oklch(55% .14 155); }
        .fl-plan-lista li.ne { color: rgba(17,17,17,.42); }
        .fl-plan-lista li.ne svg { color: rgba(17,17,17,.3); }
        .fl-cenik-opomba { font-size: .78rem; color: rgba(17,17,17,.5); margin: 1.9rem 0 0; }

        .fl-faq { margin: 10.05rem 0 0; padding-top: 3rem; display: flex; flex-wrap: wrap; gap: clamp(1.8rem, 4vw, 3.5rem); align-items: flex-start; }
        .fl-faq-glava { flex: 1 1 240px; min-width: 240px; }
        .fl-faq-glava .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-faq-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.8rem, 4vw, 2.55rem); line-height: 1.07; margin: .55rem 0 1.4rem; }
        .fl-faq-podpora { display: inline-block; font-family: var(--font-sans), system-ui, sans-serif; font-size: .84rem; font-weight: 600; color: var(--ink); text-decoration: none; padding: .62rem 1.15rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.24); transition: border-color .16s, background .16s; }
        .fl-faq-podpora:hover { border-color: var(--ink); background: rgba(17,17,17,.04); }
        .fl-faq-lista { flex: 2.3 1 380px; min-width: 300px; display: flex; flex-direction: column; }
        .fl-faq-item { border-top: 1px solid rgba(17,17,17,.12); }
        .fl-faq-item:last-child { border-bottom: 1px solid rgba(17,17,17,.12); }
        .fl-faq-item > button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1.4rem; padding: 1.25rem .2rem; background: none; border: 0; cursor: pointer; text-align: left; font-family: var(--font-sans), system-ui, sans-serif; font-size: 1rem; font-weight: 550; color: var(--ink); transition: color .15s; }
        .fl-faq-item > button:hover { color: var(--accent); }
        .fl-faq-item > button svg { flex: none; color: var(--accent); transition: transform .25s cubic-bezier(.16,1,.3,1); }
        .fl-faq-item.odprt > button svg { transform: rotate(45deg); }
        .fl-faq-odg { max-height: 0; overflow: hidden; transition: max-height .32s cubic-bezier(.16,1,.3,1); }
        .fl-faq-item.odprt .fl-faq-odg { max-height: 320px; }
        .fl-faq-odg p { margin: 0; padding: 0 3rem 1.35rem .2rem; font-size: .92rem; line-height: 1.65; color: rgba(17,17,17,.72); }

        /* Moja zgodba (O nas) — osebni manifesto, editorial */
        .fl-zgodba { margin: 10.05rem 0 0; padding-top: 3rem; }
        .fl-zgodba-glava { max-width: 26ch; margin: 0 0 2.2rem; }
        .fl-zgodba-glava .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-zgodba-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 4.5vw, 2.7rem); line-height: 1.06; margin: .55rem 0 0; }
        .fl-zgodba-telo { display: grid; grid-template-columns: 17rem minmax(0, 1fr); gap: clamp(1.8rem, 4vw, 3.6rem); align-items: start; }
        @media (max-width: 760px) { .fl-zgodba-telo { grid-template-columns: 1fr; } .fl-zgodba-portret { max-width: 16rem; } }
        .fl-zgodba-portret { position: relative; aspect-ratio: 4 / 5; border-radius: 20px; overflow: hidden; background: linear-gradient(150deg, oklch(90% .06 297), oklch(91% .05 330), oklch(90% .06 165)); box-shadow: 0 18px 44px rgba(40,25,60,.12); }
        .fl-zgodba-portret img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .fl-zgodba-tekst p { font-size: 1.02rem; line-height: 1.72; color: rgba(17,17,17,.82); margin: 0 0 1.1rem; max-width: 60ch; }
        .fl-zgodba-tekst p:first-child { font-size: 1.18rem; line-height: 1.6; color: var(--ink); }
        .fl-zgodba-tekst em { font-style: italic; }
        .fl-zgodba-podpis { font-family: var(--font-serif), serif; font-style: italic; font-size: 1.05rem !important; color: var(--ink) !important; margin-top: 1.4rem !important; }

        .fl-footer { margin: 10.05rem calc(50% - 50vw) calc(-1 * clamp(5rem, 8vw, 8rem)); background: oklch(20% .016 285); color: oklch(93% .01 285); border-radius: 0; padding: clamp(2.8rem, 5vw, 4rem) calc(max(0px, (100vw - 1480px) / 2) + clamp(1.5rem, 5vw, 5.5rem)) clamp(2rem, 4vw, 2.6rem); }
        .fl-footer-top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: clamp(2rem, 5vw, 4rem); }
        @media (max-width: 720px) { .fl-footer-top { grid-template-columns: 1fr; gap: 2rem; } }
        .fl-footer-talk { display: inline-block; margin-top: 1.1rem; font-size: .82rem; font-weight: 700; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--accent); padding-bottom: .15rem; }
        .fl-footer-legal { display: flex; flex-wrap: wrap; gap: 1.1rem; }
        .fl-footer-logo { display: inline-flex; align-items: center; gap: .5rem; }
        .fl-footer-logo i { width: 1.2rem; height: 1.2rem; border-radius: 50%; flex: none; background: radial-gradient(58% 48% at 30% 24%, rgba(255,255,255,.92), rgba(255,255,255,0) 62%), conic-gradient(from 210deg, #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); box-shadow: 0 3px 10px rgba(124,58,237,.28); }
        .fl-footer-logo strong { font-family: var(--font-sans), system-ui, sans-serif; font-weight: 800; font-size: 1.12rem; letter-spacing: -.01em; color: #fff; }
        .fl-footer-logo span { font-size: .7rem; font-weight: 700; letter-spacing: .2em; color: rgba(255,255,255,.6); }
        .fl-footer-brand p { margin: .9rem 0 0; font-size: .9rem; line-height: 1.6; color: rgba(255,255,255,.64); max-width: 36ch; }
        .fl-footer-brand a { color: #fff; text-decoration: none; border-bottom: 1px solid var(--accent); }
        .fl-footer-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        @media (max-width: 620px) { .fl-footer-cols { grid-template-columns: 1fr 1fr; gap: 1.6rem; } }
        .fl-footer-cols > div { display: grid; gap: .55rem; align-content: start; }
        .fl-footer-cols strong { font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: .2rem; }
        .fl-footer-cols a { font-size: .9rem; color: rgba(255,255,255,.74); text-decoration: none; transition: color .15s; }
        .fl-footer-cols a:hover { color: #fff; }
        .fl-footer-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-top: 2.6rem; padding: 1.4rem 0 0; border-top: 1px solid rgba(255,255,255,.12); font-size: .8rem; color: rgba(255,255,255,.5); }
        .fl-footer-bottom a { color: rgba(255,255,255,.68); text-decoration: none; }
      `}} />

      <div className="fl-ozadje" aria-hidden>
        <span className="fl-blob v" />
        <span className="fl-blob g" />
        <span className="fl-blob v2" />
      </div>
      <AmbientBubbles />

      <FlowHeroBg />

      <div className="fl-oder">
        <section className="fl-hero">
          <p className="kicker"><b>Pinart Flow</b> · beta · za samostojne kreativce</p>
          <h1>Veš, koliko je vredno <em>tvoje delo?</em></h1>
          <p className="lead">
            V nekaj klikih do lepo oblikovane ponudbe s pravo ceno in avtorskimi pravicami —
            pa vse do računa in pregleda zaslužka. Nič več ugibanja cen ali skakanja med tremi orodji.
          </p>
          <div className="cta-vrsta">
            <a className="cta" href={prijava}>Vstopi v Flow <ArrowRight size={17} weight="bold" /></a>
            <a className="cta duh" href={kalkulator}>Preizkusi kalkulator</a>
            <span className="cta-note">Kalkulator je brezplačen, brez prijave.</span>
          </div>
        </section>

        <section className="fl-potek">
          <div className="fl-koraki">
            {KORAKI.map(k => (
              <div className="fl-korak" key={k.n}>
                <div className="n">{k.n}</div>
                <h3>{k.naslov}</h3>
                <p>{k.opis}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fl-laptop">
          <div className="fl-laptop-txt">
            <div className="k">Tvoja mirna pisarna</div>
            <h2>Ti ustvarjaš vrednost. <em>Flow poskrbi za vse ostalo.</em></h2>
            <p>
              Namesto Excela, map in razmetanih dokumentov imaš eno mirno delovno okolje.
              Ponudbe, pogodbe, računi in stranke ostanejo skupaj, urejeni in tvoji, ti pa
              se lahko posvetiš temu, kar znaš najbolje.
            </p>
          </div>
          <div className="fl-laptop-vizual" aria-hidden>
            <RotatingLaptop className="fl-rl" />
          </div>
        </section>

        <section className="fl-orodja" id="orodja">
          <div className="k">Naša orodja</div>
          <h2>Izbrana orodja za lažje kreativne začetke.</h2>
          <p className="uvod">Tudi ti raje oblikuješ, kot pripravljaš ponudbe, pogodbe in račune? Naša izbrana zbirka orodij prevzame administracijo, da se lahko posvetiš ustvarjanju. Poglej, kaj te čaka.</p>
          <div className="fl-orodja-nadzor">
            <div className="fl-rubrike">
              {RUBRIKE.map(r => (
                <button key={r.id} type="button" className={taRubrika === r.id ? 'on' : ''} onClick={() => setTaRubrika(r.id)}>{r.label}</button>
              ))}
            </div>
            <div className="fl-puscice">
              <button type="button" onClick={() => drsni(-1)} aria-label="Nazaj"><CaretLeft size={18} weight="bold" /></button>
              <button type="button" onClick={() => drsni(1)} aria-label="Naprej"><CaretRight size={18} weight="bold" /></button>
            </div>
          </div>
          <div className="fl-orodja-vrsta" ref={vrstaRef}>
            {vidnaOrodja.map(o => {
              const Ikona = o.Ikona;
              return (
                <a className="fl-tkarta" href={o.href} key={o.ime}>
                  <span className="fl-tkarta-ikona" style={{ ['--h' as string]: o.h } as React.CSSProperties}><Ikona size={22} weight="regular" /></span>
                  <h3>{o.ime} {o.brezplacno && <span className="fl-znacka">Brezplačno</span>}</h3>
                  <p>{o.opis}</p>
                </a>
              );
            })}
          </div>
        </section>

        <section className="fl-showcase" id="showcase">
          <div className="fl-showcase-glava">
            <div className="k">Eno mesto</div>
            <h2>Vse tvoje poslovanje na enem mestu</h2>
            <p>Izberi, kje začneš. Vsako orodje teče iz istih podatkov — od poštene cene do računa.</p>
          </div>
          <div className="fl-sc-pills" role="tablist" aria-label="Orodja Pinart Flow">
            {ZAVIHKI.map(z => {
              const Ik = z.Ikona;
              return (
                <button
                  key={z.id}
                  type="button"
                  role="tab"
                  aria-selected={taZavihek === z.id}
                  className={`fl-sc-pill${taZavihek === z.id ? ' on' : ''}`}
                  onClick={() => setTaZavihek(z.id)}
                >
                  <Ik size={17} weight="regular" />
                  {z.label}
                  {z.znacka && <span className={`fl-sc-badge ${z.zvrst}`}>{z.znacka}</span>}
                </button>
              );
            })}
          </div>
          <div className="fl-sc-panel">
            <div className="fl-sc-info fl-sc-anim" key={`i-${zav.id}`}>
              <h3>{zav.h}</h3>
              <p>{zav.p}</p>
              <ul className="fl-sc-tocke">
                {zav.tocke.map(t => <li key={t}><CheckCircle size={18} weight="fill" />{t}</li>)}
              </ul>
              <a className={`cta${zav.zvrst === 'soon' || zav.zvrst === 'beta' ? ' duh' : ''}`} href={zav.href}>
                {zav.cta} <ArrowRight size={16} weight="bold" />
              </a>
            </div>
            <div className="fl-sc-vizual fl-sc-anim" key={`v-${zav.id}`} aria-hidden>
              {predoglediMock(zav.id)}
              {/* Video predstavitev produkta (kot Magnific). Ce datoteke se ni, onError skrije
                  video in ostane ilustracija spodaj. Odlozi v /public/flow/showcase/<id>.mp4 */}
              <video className="fl-sc-video" src={`/flow/showcase/${zav.id}.mp4`} autoPlay muted loop playsInline preload="metadata"
                onError={e => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }} />
            </div>
          </div>
        </section>

        <section className="fl-bento" id="zgodba">
          <div className="fl-bento-glava">
            <div>
              <h2>Začni preprosto. Rasti, ko si pripravljena.</h2>
              <p>Od enega orodja do celotnega poteka — v svojem tempu.</p>
            </div>
            <a className="cta" href={kalkulator}>Začni brezplačno <ArrowRight size={16} weight="bold" /></a>
          </div>
          <div className="fl-bento-mreza">
            <div className="fl-bkarta a">
              <h3>Vsako orodje pripravljeno</h3>
              <p>Ponudbe, pogodbe, računi, stroški, ceniki. Odpri, kar potrebuješ — brez postavljanja.</p>
              <div className="fl-bthumbs" aria-hidden>{[1, 2, 3, 4, 5, 6].map(n => (
                <span key={n}><img src={`/flow/bento/${n}.jpg`} alt="" loading="lazy" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /></span>
              ))}</div>
            </div>
            <div className="fl-bkarta b">
              <h3>Celoten posel na enem mestu</h3>
              <p>Od poštene cene do plačanega računa. Vse teče iz istih podatkov, brez podvajanja.</p>
              <div className="fl-bflow" aria-hidden><b>Ponudba</b><i>→</i><b>Pogodba</b><i>→</i><b>Račun</b><i>→</i><b>Pregled</b></div>
            </div>
            <div className="fl-bkarta c">
              <h3>Ena baza, vse stranke</h3>
              <p>Kartoteka strank z dokumenti in zgodovino sodelovanja.</p>
              <div className="fl-bavatars" aria-hidden><span>MA</span><span>RK</span><span>LJ</span><span>+</span></div>
            </div>
            <div className="fl-bkarta d">
              <h3>Pošteno ceno v enem kliku</h3>
              <p>Kalkulator predlaga ceno glede na trg in tvoje izkušnje.</p>
              <div className="fl-bprice" aria-hidden><strong>1.850 €</strong><span>predlog</span></div>
            </div>
          </div>
        </section>

        <section className="fl-konec">
          <h2>Pripravljena na bolj mirno poslovanje?</h2>
          <div className="cta-vrsta">
            <a className="cta" href={prijava}>Vstopi v Flow <ArrowRight size={17} weight="bold" /></a>
          </div>
          <div className="zakljucki">
            <span><CheckCircle size={20} weight="fill" /> Brez kartice za začetek</span>
            <span><CheckCircle size={20} weight="fill" /> Kalkulator ostane brezplačen</span>
            <span><CheckCircle size={20} weight="fill" /> Podatki so tvoji</span>
          </div>
        </section>

        <section className="fl-funkcije">
          <div className="fl-funkcije-glava">
            <h2>Zgrajeno za mirno poslovanje samostojnega kreativca.</h2>
            <p>Poštene cene, tvoji podatki in vse na enem mestu — brez skritih pasti.</p>
          </div>
          <div className="fl-funkcije-mreza">
            {FUNKCIJE.map(f => {
              const Ikona = f.Ikona;
              return (
                <div className="fl-funkcija" key={f.ime}>
                  <span className="fl-funkcija-ikona"><Ikona size={20} weight="regular" /></span>
                  <div><strong>{f.ime}</strong><p>{f.opis}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="fl-cenik" id="cenik">
          <div className="k">Cenik</div>
          <h2>Enostavno, pošteno, brez presenečenj.</h2>
          <p className="uvod">Kalkulator je za vedno brezplačen. Ko potrebuješ več, izbereš paket, ki ti ustreza.</p>
          <div className="fl-cenik-mreza">
            {CENIKI.map(c => (
              <div className={`fl-plan${c.izpost ? ' izpost' : ''}${c.kmalu ? ' kmalu' : ''}`} key={c.ime}>
                {c.znacka && <span className="fl-plan-znacka">{c.znacka}</span>}
                <h3>{c.ime}</h3>
                <p className="fl-plan-za">{c.za}</p>
                <div className="fl-plan-cena"><strong>{c.cena}</strong><span>{c.enota}</span></div>
                {c.kmalu
                  ? <span className="fl-plan-cta cakalna" aria-disabled="true">{c.cta}</span>
                  : <a className={`fl-plan-cta${c.izpost ? ' polni' : ''}`} href={c.href}>{c.cta}</a>}
                <ul className="fl-plan-lista">
                  {c.vkljuceno.map(v => <li key={v} className="da"><CheckCircle size={16} weight="fill" /> {v}</li>)}
                  {c.brez.map(b => <li key={b} className="ne"><X size={15} weight="bold" /> {b}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="fl-cenik-opomba">Cene ne vključujejo DDV. Med beto so vsi paketi na voljo brezplačno.</p>
        </section>

        <section className="fl-faq" id="faq">
          <div className="fl-faq-glava">
            <div className="k">Pogosta vprašanja</div>
            <h2>Odgovori na najpogostejša vprašanja.</h2>
            <a className="fl-faq-podpora" href="mailto:tina@pinart.si">Kontaktiraj podporo</a>
          </div>
          <div className="fl-faq-lista">
            {VPRASANJA.map((q, i) => (
              <div className={`fl-faq-item${odprtoVpr === i ? ' odprt' : ''}`} key={q.v}>
                <button type="button" onClick={() => setOdprtoVpr(odprtoVpr === i ? null : i)} aria-expanded={odprtoVpr === i}>
                  <span>{q.v}</span>
                  <Plus size={19} weight="bold" />
                </button>
                <div className="fl-faq-odg"><div><p>{q.o}</p></div></div>
              </div>
            ))}
          </div>
        </section>

        <section className="fl-zgodba" id="onas">
          <div className="fl-zgodba-glava">
            <div className="k">Moja zgodba</div>
            <h2>Zgradila sem Flow, kakršnega sem sama pogrešala.</h2>
          </div>
          <div className="fl-zgodba-telo">
            <div className="fl-zgodba-portret" aria-hidden>
              <img src="/flow/tina.jpg" alt="" loading="lazy" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="fl-zgodba-tekst">
              <p>Sem Tina, oblikovalka in načrtovalka produktov. Oblikovanje je moje veselje — ponudbe in računi pa muka, ki požre ure. Ugibala sem, ali sem dovolj zaračunala, pozabljala na avtorske pravice in skakala med tremi orodji.</p>
              <p>Verjetno poznaš tudi ti: ure pripravljaš ponudbo, potem pa ti stranka pokaže z AI generiran logotip. Pojasniš, da nima pravega tona za njeno panogo — pa dobiš, da se o okusu ne razpravlja. Umetno inteligenco imam rada in mi je v pomoč; a prav zato, ker je tempo z njo hitrejši kot kdaj prej, je naš občutek za pravo rešitev vreden več, ne manj.</p>
              <p>Oblikovalci, kuharji, kritiki, slikarji, modni kreatorji — vsi gojimo občutek, ki zori leta. Podjetjem ne prodajamo zgolj okusa: ustoličimo njihov vizualni glas in ton, jim vdihnemo življenje, držimo konsistenco čez vse njihove znamke in skrbimo, da se njihova zgodba razvija.</p>
              <p>Flow je nastal iz te utrujenosti. Da kreativci postanemo narekovalci okusa in glasu, ne zgolj izvajalci — da vemo, koliko je vredno naše delo, in ga ne prodamo pod ceno.</p>
              <p>Ker sem na isti strani kot ti, je Flow mišljen kot opora: da imaš več časa za svoj okus in izraz, več drznosti in mirno zavest o svojih pravicah. Ne gradimo le okusa — gradimo glas, ton in zgodbo, po katerih znamke zaživijo.</p>
              <p className="fl-zgodba-podpis">— Tina, Pinart</p>
            </div>
          </div>
        </section>

        <footer className="fl-footer">
          <div className="fl-footer-top">
            <div className="fl-footer-brand">
              <span className="fl-footer-logo"><i /><strong>Pinart</strong><span>FLOW</span></span>
              <p>Vse tvoje poslovanje, na enem mestu. Orodje pripravlja Tina, kreativna direktorica studia <a href={localePath(locale, '')}>Pinart</a>.</p>
            </div>
            <nav className="fl-footer-cols">
              <div>
                <strong>Produkt</strong>
                <a href="#orodja">Pinart Flow</a>
                <a href={kalkulatorLanding}>Kalkulator</a>
                <a href="#cenik">Cenik</a>
              </div>
              <div>
                <strong>Začni</strong>
                <a href={prijava}>Prijava</a>
                <a href={prijava}>Ustvari račun</a>
                <a href={kalkulator}>Odpri kalkulator</a>
              </div>
              <div>
                <strong>Podjetje</strong>
                <a href="#onas">O nas</a>
                <a href={localePath(locale, '')}>Studio Pinart</a>
                <a href="#faq">Pogosta vprašanja</a>
              </div>
              <div>
                <strong>Kontakt</strong>
                <a href="mailto:tina@pinart.si">tina@pinart.si</a>
                <a href="mailto:tina@pinart.si">Let&rsquo;s talk</a>
                <a href="#cenik">Načini plačila</a>
              </div>
            </nav>
          </div>
          <div className="fl-footer-bottom">
            <span>© 2026 Pinart · Vse pravice pridržane</span>
            <span className="fl-footer-legal">
              <a href={localePath(locale, '/zasebnost')}>Zasebnost</a>
              <a href={localePath(locale, '/kalkulator/pogoji')}>Pogoji</a>
              <a href="#cenik">Načini plačila</a>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
