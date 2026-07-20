'use client';

import {
  FileText, Handshake, Scroll, Receipt, Wallet, Tag, Clock,
  Users, Target, Suitcase, SquaresFour, ArrowRight, CheckCircle,
} from '@phosphor-icons/react';
import { localePath } from '@/i18n/routing';
import FlowHeroBg from '@/components/FlowHeroBg';
import RotatingLaptop from '@/components/RotatingLaptop';

/* Predstavitev celotnega paketa Pinart Flow (pinartflow.com). Prodaja
   celoto — od ponudbe do racuna na enem mestu — in vodi v prijavo (Flow)
   ali v brezplacni kalkulator (funnel). Dizajn = naslovnica ponudbe:
   Bodoni, mreza, vijola/zelena blobi, pastelne gradientne kartice, lesk. */

export default function FlowLanding({ locale = 'sl' }: { locale?: string }) {
  const prijava = localePath(locale, '/kalkulator/prijava');
  const kalkulator = localePath(locale, '/kalkulator/orodje');
  const kalkulatorLanding = localePath(locale, '/kalkulator');

  const ORODJA = [
    { Ikona: FileText, ime: 'Kalkulator ponudb', opis: 'Poštena cena projekta: izvedba, avtorske pravice in licenca. Trije paketi in urejljivo besedilo.', href: kalkulator, brezplacno: true },
    { Ikona: Handshake, ime: 'Dolgoročno sodelovanje', opis: 'Retainer z mesečnim obsegom, urami in dobo. Jasni pogoji dolgoročnega dogovora.', href: localePath(locale, '/kalkulator/dolgorocno') },
    { Ikona: Scroll, ime: 'Pogodbe', opis: 'Pogodbe o sodelovanju in prenosu pravic, pripravljene za podpis.', href: localePath(locale, '/kalkulator/pogodbe') },
    { Ikona: Receipt, ime: 'Računi', opis: 'Iz ponudbe v račun z enim klikom. Številčenje, rok in status plačila.', href: localePath(locale, '/kalkulator/racuni') },
    { Ikona: Wallet, ime: 'Stroški', opis: 'Odhodki in ponavljajoči se stroški, zbrani na enem mestu.', href: localePath(locale, '/kalkulator/stroski') },
    { Ikona: Tag, ime: 'Ceniki', opis: 'Tvoji cenovni profili: shraniš, urediš in znova uporabiš.', href: localePath(locale, '/kalkulator/ceniki') },
    { Ikona: Clock, ime: 'Cena & čas', opis: 'Koliko je vredna tvoja ura glede na cilje in obseg dela.', href: localePath(locale, '/kalkulator/cas') },
    { Ikona: Users, ime: 'Stranke', opis: 'Kartoteka naročnikov s podatki, dokumenti in zgodovino sodelovanja.', href: localePath(locale, '/kalkulator/stranke') },
    { Ikona: Target, ime: 'Cilji', opis: 'Mesečni cilj prihodkov in koliko projektov te loči do njega.', href: localePath(locale, '/kalkulator/cilji') },
    { Ikona: Suitcase, ime: 'Poslovni okvir', opis: 'Širša slika: rezerva, davki in spodnja meja poštene cene.', href: localePath(locale, '/kalkulator/poslovni-nacrt') },
    { Ikona: SquaresFour, ime: 'Pregled', opis: 'Nadzorna plošča: promet, odprte ponudbe in čakajoča plačila.', href: localePath(locale, '/kalkulator/pregled') },
  ];

  const KORAKI = [
    { n: '01', naslov: 'Izračunaj ponudbo', opis: 'Kalkulator ti pokaže pošteno ceno: izvedbo, pravice in licenco, uglašeno z naročnikom.' },
    { n: '02', naslov: 'Dogovori sodelovanje', opis: 'Pogodba ali dolgoročni retainer nastane iz iste ponudbe, brez ponovnega tipkanja.' },
    { n: '03', naslov: 'Izstavi in spremljaj', opis: 'Ponudbo z enim klikom pretvoriš v račun, Flow pa sledi plačilom, stroškom in ciljem.' },
  ];

  return (
    <div className="fl">
      <style>{`
        .fl { position: relative; z-index: 1; color: var(--ink); font-weight: 300; overflow-x: clip; }

        /* Ozadje: mreza + vijola/zelena animirani blobi (kot naslovnica) */
        .fl-ozadje { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; background-color: var(--paper); background-image: linear-gradient(rgba(17,17,17,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,.045) 1px, transparent 1px); background-size: 4.5rem 4.5rem; }
        .fl-blob { position: absolute; width: min(62vw, 720px); aspect-ratio: 1; border-radius: 50%; filter: blur(72px); opacity: .55; }
        .fl-blob.v { background: radial-gradient(circle at 50% 50%, oklch(72% .17 297 / .55), transparent 68%); top: -14%; left: -10%; animation: flBlobV 24s ease-in-out infinite; }
        .fl-blob.g { background: radial-gradient(circle at 50% 50%, oklch(82% .13 165 / .5), transparent 68%); bottom: -16%; right: -12%; animation: flBlobG 28s ease-in-out infinite; }
        .fl-blob.v2 { background: radial-gradient(circle at 50% 50%, oklch(78% .12 320 / .4), transparent 70%); top: 42%; right: 18%; width: min(40vw, 460px); animation: flBlobV 32s ease-in-out infinite reverse; }
        @keyframes flBlobV { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(7vw,6vh) scale(1.12)} 50%{transform:translate(-4vw,10vh) scale(.94)} 75%{transform:translate(5vw,-5vh) scale(1.06)} }
        @keyframes flBlobG { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(-6vw,-5vh) scale(1.1)} 50%{transform:translate(5vw,-9vh) scale(.95)} 75%{transform:translate(-4vw,5vh) scale(1.05)} }
        @media (prefers-reduced-motion: reduce) { .fl-blob { animation: none; } .fl-orb { animation: none !important; } }

        .fl-oder { max-width: 1480px; margin: 0 auto; padding: clamp(5.5rem, 11vw, 8.5rem) clamp(1.5rem, 5vw, 5.5rem) clamp(5rem, 8vw, 8rem); }

        /* Hero */
        .fl-hero { position: relative; }
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
        .fl-potek { margin: 5.5rem 0 0; border-top: 1px solid rgba(17,17,17,.16); padding-top: 2.6rem; }
        .fl-potek .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-potek h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem 0 2.2rem; max-width: 20ch; }
        .fl-koraki { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.6rem; }
        @media (max-width: 720px) { .fl-koraki { grid-template-columns: 1fr; gap: 1.4rem; } }
        .fl-korak { position: relative; padding: 1.5rem 1.4rem; border-radius: 18px; background: linear-gradient(140deg, oklch(97% .022 297 / .9), oklch(96% .03 165 / .85)); border: 1px solid rgba(255,255,255,.6); box-shadow: 0 12px 34px rgba(40,25,60,.07); }
        .fl-korak .n { font-family: var(--font-serif), serif; font-size: 1.5rem; color: var(--accent); }
        .fl-korak h3 { font-size: 1.02rem; font-weight: 650; margin: .5rem 0 .4rem; }
        .fl-korak p { font-size: .9rem; line-height: 1.6; color: rgba(17,17,17,.74); margin: 0; }

        /* Vmesna sekcija z vrtečim laptopom */
        .fl-laptop { margin: 6rem 0 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: clamp(2rem, 5vw, 4.5rem); align-items: center; }
        @media (max-width: 860px) { .fl-laptop { grid-template-columns: 1fr; gap: 1.5rem; } }
        .fl-laptop-txt .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
        .fl-laptop-txt h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 4.4vw, 3rem); line-height: 1.08; letter-spacing: -.01em; margin: .6rem 0 1rem; max-width: 18ch; }
        .fl-laptop-txt h2 em { font-style: italic; color: var(--accent); }
        .fl-laptop-txt p { font-size: 1.02rem; line-height: 1.6; color: rgba(17,17,17,.76); max-width: 42ch; margin: 0; }
        .fl-laptop-vizual { display: flex; justify-content: center; }
        .fl-rl { width: 100%; max-width: 560px; aspect-ratio: 4 / 3; }
        @media (max-width: 860px) { .fl-rl { max-width: 440px; } }

        /* Orodja mreza */
        .fl-orodja { margin: 6rem 0 0; border-top: 1px solid rgba(17,17,17,.16); padding-top: 2.6rem; }
        .fl-orodja .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-orodja h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem 0 .5rem; max-width: 20ch; }
        .fl-orodja .uvod { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.76); max-width: 50ch; margin: 0 0 2.4rem; }
        .fl-mreza { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 900px) { .fl-mreza { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .fl-mreza { grid-template-columns: 1fr; } }
        .fl-karta { position: relative; display: block; padding: 1.4rem 1.35rem 1.5rem; border-radius: 18px; background: rgba(255,255,255,.72); border: 1px solid rgba(255,255,255,.8); box-shadow: 0 12px 32px rgba(40,25,60,.07); -webkit-backdrop-filter: blur(14px) saturate(1.3); backdrop-filter: blur(14px) saturate(1.3); text-decoration: none; color: var(--ink); transition: transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s ease; overflow: hidden; }
        .fl-karta:hover { transform: translateY(-4px); box-shadow: 0 22px 48px rgba(40,25,60,.14); }
        .fl-karta-ikona { display: inline-flex; align-items: center; justify-content: center; width: 2.7rem; height: 2.7rem; border-radius: 13px; background: linear-gradient(140deg, oklch(94% .05 297), oklch(92% .06 165)); color: var(--accent); margin-bottom: .95rem; }
        .fl-karta h3 { font-size: 1.02rem; font-weight: 650; margin: 0 0 .35rem; display: flex; align-items: center; gap: .5rem; }
        .fl-karta p { font-size: .86rem; line-height: 1.55; color: rgba(17,17,17,.72); margin: 0; }
        .fl-znacka { font-size: .6rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: oklch(45% .13 155); background: oklch(92% .08 160); border-radius: 999px; padding: .2rem .5rem; }

        /* Brezplacni kalkulator pas */
        .fl-brez { margin: 6rem 0 0; position: relative; overflow: hidden; border-radius: 26px; padding: clamp(2.2rem, 5vw, 3.4rem); background: linear-gradient(135deg, oklch(96% .03 297), oklch(95% .035 320), oklch(95% .03 165)); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 20px 60px rgba(40,25,60,.1); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(1.6rem, 4vw, 3rem); align-items: center; }
        @media (max-width: 820px) { .fl-brez { grid-template-columns: 1fr; } .fl-brez-vizual { display: none; } }
        .fl-browser { border-radius: 14px; overflow: hidden; background: #fff; border: 1px solid rgba(17,17,17,.1); box-shadow: 0 24px 60px rgba(40,25,60,.18); }
        .fl-browser-bar { display: flex; align-items: center; gap: .4rem; padding: .5rem .75rem; background: oklch(96% .008 87); border-bottom: 1px solid rgba(17,17,17,.07); }
        .fl-browser-bar i { width: .55rem; height: .55rem; border-radius: 50%; background: rgba(17,17,17,.18); }
        .fl-browser-bar small { margin-left: .5rem; font-size: .62rem; letter-spacing: .04em; color: rgba(17,17,17,.5); }
        .fl-browser-screen { display: block; position: relative; aspect-ratio: 4 / 3; overflow: hidden; }
        .fl-browser-screen iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; pointer-events: none; background: var(--paper); }
        .fl-brez .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
        .fl-brez h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.8rem, 4.5vw, 2.6rem); line-height: 1.08; margin: .5rem 0 .7rem; max-width: 22ch; }
        .fl-brez p { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.8); max-width: 48ch; margin: 0 0 1.8rem; }

        /* Zakljucni CTA */
        .fl-konec { margin: 6rem 0 0; text-align: center; border-top: 1px solid rgba(17,17,17,.16); padding-top: 3.4rem; }
        .fl-konec h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(2rem, 6vw, 3.4rem); line-height: 1.02; margin: 0 auto 1.6rem; max-width: 18ch; }
        .fl-konec .cta-vrsta { justify-content: center; }
        .fl-konec .zakljucki { margin: 1.8rem 0 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 1.4rem; font-size: .84rem; color: rgba(17,17,17,.7); }
        .fl-konec .zakljucki span { display: inline-flex; align-items: center; gap: .4rem; }
        .fl-konec .zakljucki svg { color: oklch(52% .13 155); }

        .fl-footer { margin: 6.5rem 0 0; border-top: 1px solid rgba(17,17,17,.14); padding-top: 3rem; }
        .fl-footer-top { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.6fr); gap: clamp(2rem, 5vw, 4rem); }
        @media (max-width: 720px) { .fl-footer-top { grid-template-columns: 1fr; gap: 2rem; } }
        .fl-footer-logo { display: inline-flex; align-items: baseline; gap: .45rem; }
        .fl-footer-logo i { width: .8rem; height: .8rem; align-self: center; border-radius: 50%; background: linear-gradient(140deg, oklch(72% .17 297), oklch(80% .13 165)); }
        .fl-footer-logo strong { font-family: var(--font-serif), serif; font-weight: 500; font-size: 1.25rem; }
        .fl-footer-logo span { font-size: .7rem; font-weight: 700; letter-spacing: .2em; color: rgba(17,17,17,.6); }
        .fl-footer-brand p { margin: .9rem 0 0; font-size: .9rem; line-height: 1.6; color: rgba(17,17,17,.66); max-width: 36ch; }
        .fl-footer-brand a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--accent); }
        .fl-footer-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        @media (max-width: 480px) { .fl-footer-cols { grid-template-columns: 1fr 1fr; } }
        .fl-footer-cols > div { display: grid; gap: .55rem; align-content: start; }
        .fl-footer-cols strong { font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(17,17,17,.5); margin-bottom: .2rem; }
        .fl-footer-cols a { font-size: .9rem; color: rgba(17,17,17,.75); text-decoration: none; transition: color .15s; }
        .fl-footer-cols a:hover { color: var(--ink); }
        .fl-footer-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-top: 2.6rem; padding: 1.4rem 0 0; border-top: 1px solid rgba(17,17,17,.08); font-size: .8rem; color: rgba(17,17,17,.55); }
        .fl-footer-bottom a { color: rgba(17,17,17,.7); text-decoration: none; }
      `}</style>

      <div className="fl-ozadje" aria-hidden>
        <span className="fl-blob v" />
        <span className="fl-blob g" />
        <span className="fl-blob v2" />
      </div>

      <FlowHeroBg />

      <div className="fl-oder">
        <section className="fl-hero">
          <p className="kicker"><b>Pinart Flow</b> · beta · za samostojne kreativce</p>
          <h1>Vse tvoje poslovanje, <em>na enem mestu.</em></h1>
          <p className="lead">
            Od poštene ponudbe do izdanega računa. Pinart Flow poveže kalkulator cen,
            pogodbe, retainerje, stranke in cilje v eno mirno delovno okolje, da se lahko
            posvetiš ustvarjanju, ne administraciji.
          </p>
          <div className="cta-vrsta">
            <a className="cta" href={prijava}>Vstopi v Flow <ArrowRight size={17} weight="bold" /></a>
            <a className="cta duh" href={kalkulator}>Preizkusi kalkulator</a>
            <span className="cta-note">Kalkulator je brezplačen, brez prijave.</span>
          </div>
        </section>

        <section className="fl-potek">
          <div className="k">Kako deluje</div>
          <h2>Od ponudbe do računa, brez podvajanja dela.</h2>
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
          <div className="k">Orodja v paketu</div>
          <h2>Eno okolje, vsa orodja kreativca.</h2>
          <p className="uvod">
            Vsako orodje dela z istimi podatki: kar vneseš enkrat, se prenese naprej.
            Kalkulator je odprt vsem, ostalo te čaka v Flowu.
          </p>
          <div className="fl-mreza">
            {ORODJA.map(o => {
              const Ikona = o.Ikona;
              return (
                <a className="fl-karta" href={o.href} key={o.ime}>
                  <span className="fl-karta-ikona"><Ikona size={22} weight="regular" /></span>
                  <h3>{o.ime} {o.brezplacno && <span className="fl-znacka">Brezplačno</span>}</h3>
                  <p>{o.opis}</p>
                </a>
              );
            })}
          </div>
        </section>

        <section className="fl-brez" id="cenik">
          <div className="fl-brez-txt">
            <div className="k">Začni brez tveganja</div>
            <h2>Brezplačni kalkulator je tvoj vstop.</h2>
            <p>
              Izračunaj pošteno ceno naslednjega projekta že danes, brez prijave. Ko boš
              želela ponudbe, pogodbe in račune držati skupaj, te Flow počaka na istem mestu.
            </p>
            <div className="cta-vrsta">
              <a className="cta" href={kalkulator}>Odpri kalkulator <ArrowRight size={17} weight="bold" /></a>
              <a className="cta duh" href={kalkulatorLanding}>Zakaj cena ni ura →</a>
            </div>
          </div>
          <div className="fl-brez-vizual" aria-hidden>
            <div className="fl-browser">
              <span className="fl-browser-bar"><i /><i /><i /><small>pinart kalkulator</small></span>
              <span className="fl-browser-screen">
                <iframe src={kalkulator} loading="lazy" title="Predogled kalkulatorja" tabIndex={-1} scrolling="no" />
              </span>
            </div>
          </div>
        </section>

        <section className="fl-konec">
          <h2>Pripravljena na bolj mirno poslovanje?</h2>
          <div className="cta-vrsta">
            <a className="cta" href={prijava}>Vstopi v Flow <ArrowRight size={17} weight="bold" /></a>
          </div>
          <div className="zakljucki">
            <span><CheckCircle size={16} weight="fill" /> Brez kartice za začetek</span>
            <span><CheckCircle size={16} weight="fill" /> Kalkulator ostane brezplačen</span>
            <span><CheckCircle size={16} weight="fill" /> Podatki so tvoji</span>
          </div>
        </section>

        <footer className="fl-footer" id="onas">
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
                <strong>Podjetje</strong>
                <a href="#onas">O nas</a>
                <a href="mailto:tina@pinart.si">Kontakt</a>
                <a href={localePath(locale, '')}>Studio Pinart</a>
              </div>
              <div>
                <strong>Račun</strong>
                <a href={prijava}>Prijava</a>
                <a href={prijava}>Ustvari račun</a>
              </div>
            </nav>
          </div>
          <div className="fl-footer-bottom">
            <span>© 2026 Pinart · Vse pravice pridržane</span>
            <a href="mailto:tina@pinart.si">tina@pinart.si</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
