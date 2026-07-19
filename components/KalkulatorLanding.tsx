'use client';

import { PenNib, MagnifyingGlass, FileText } from '@phosphor-icons/react';
import { localePath } from '@/i18n/routing';

/* Landing / predstavitev kalkulatorja: proda motivacijo, vodi v orodje
   (samostojna stran /kalkulator/orodje) in na koncu ponudi zanimive clanke.
   Editorial slog pinart.si (papir/crnilo, Bodoni, kickerji). */

const ZGODBE = [
  {
    znak: '35 $',
    naslov: 'Nikejev swoosh',
    kdo: 'Carolyn Davidson, 1971',
    telo: 'Študentka ga je narisala v 17,5 ure za 35 dolarjev. Danes je med najprepoznavnejšimi znaki na svetu; Knight ji je pozneje podaril delnice. Cena izvedbe ni povedala ničesar o vrednosti.',
  },
  {
    znak: '15 $',
    naslov: 'Twitterjev ptiček',
    kdo: 'Simon Oxley',
    telo: 'Kupljen s stock strani za ceno sendviča. Vrednost ni nastala pri risanju, ampak pri milijardah uporabnikov, ki so ga videli.',
  },
  {
    znak: '1.000.000 $',
    naslov: 'Pepsijeva prenova',
    kdo: 'Arnell Group, 2008',
    telo: 'Milijon dolarjev za prenovo znaka (in 1,2 milijarde za vse spremembe). Dražje ni pomenilo boljše. Dokaz, da cena ni merilo kakovosti.',
  },
  {
    znak: '130 $',
    naslov: 'Superman',
    kdo: 'Siegel & Shuster, 1938',
    telo: 'Avtorja sta vse pravice prodala za 130 dolarjev. Lik je zaslužil milijarde; onadva sta desetletja tožila za priznanje. Kdor pravice proda naenkrat in poceni, jih ne dobi nazaj.',
  },
  {
    znak: '7 mio $',
    naslov: 'Spider-Man',
    kdo: 'Marvel → Sony, 1999',
    telo: 'Pred stečajem je Marvel filmske pravice prodal za sedem milijonov, nato pa ponudil vse svoje like za 25. Danes vredno milijarde. Pravice, prodane pod pritiskom, so podcenjene.',
  },
  {
    znak: '∞',
    naslov: 'Hello Kitty',
    kdo: 'Yuko Shimizu, 1974',
    telo: 'Sanrio lika ni nikoli prodal naenkrat: služi z licenciranjem, leto za letom, na tisočih izdelkih. Nasprotje enkratnega honorarja.',
  },
];

export default function KalkulatorLanding({ locale = 'sl' }: { locale?: string }) {
  const orodje = localePath(locale, `/kalkulator/orodje`);
  const flow = localePath(locale, `/flow`);

  return (
    <div className="kland">
      <style>{`
        .kland { max-width: 1100px; margin: 0 auto; padding: clamp(6rem, 12vw, 9rem) clamp(1.25rem, 4vw, 4.5rem) clamp(5rem, 8vw, 8rem); color: var(--ink); font-weight: 300; position: relative; }
        .kland .hero-vizual { position: absolute; top: 4rem; right: -6rem; width: clamp(260px, 34vw, 460px); opacity: .9; pointer-events: none; z-index: -1; }
        @media (max-width: 900px) { .kland .hero-vizual { position: static; width: min(70vw, 340px); margin: -2rem auto 1.5rem; } }
        .kland .hero-vizual img { width: 100%; height: auto; display: block; }
        .kland .hero-vizual video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
        .kland .hero-vizual video:not([src]):not(:has(source)) { display: none; }
        .kland .kicker { font-size: .72rem; font-weight: 600; letter-spacing: .24em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .kland h1 { font-family: var(--font-serif), Didot, serif; font-weight: 500; font-size: clamp(2.8rem, 9vw, 5rem); line-height: .96; letter-spacing: -.015em; margin: .7rem 0 1.4rem; }
        .kland h1 em { font-style: italic; }
        .kland .lead { font-size: clamp(1.1rem, 2.2vw, 1.35rem); line-height: 1.55; color: rgba(17,17,17,.82); max-width: 42ch; margin: 0 0 2.4rem; }
        .kland .cta { display: inline-flex; align-items: center; gap: .6rem; font-family: inherit; font-size: .82rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; border-radius: 999px; padding: 1rem 2.1rem; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); text-decoration: none; transition: opacity .18s ease; }
        .kland .cta:hover { opacity: .78; }

        .kland .zakaj { margin: 5.5rem 0 0; border-top: 1px solid rgba(17,17,17,.18); padding-top: 2.4rem; }
        .kland .zakaj .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); margin-bottom: 1rem; }
        .kland .zakaj p { font-size: clamp(1.3rem, 3vw, 1.75rem); font-family: var(--font-serif), serif; line-height: 1.35; margin: 0; max-width: 26ch; }
        .kland .zakaj p em { font-style: italic; }

        .kland .kako { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.4rem; margin: 5.5rem 0 0; }
        @media (max-width: 620px) { .kland .kako { grid-template-columns: 1fr; gap: 2.2rem; } }
        .kland .korak-ikona { width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--accent); color: var(--paper); display: inline-flex; align-items: center; justify-content: center; margin-bottom: .9rem; }
        .kland .korak .n { font-family: var(--font-serif), serif; font-size: 1.35rem; line-height: 1; color: rgba(17,17,17,.5); }
        .kland .korak h3 { font-size: .95rem; font-weight: 600; margin: .5rem 0 .4rem; display: flex; align-items: baseline; gap: .5rem; }
        .kland .korak p { font-size: .88rem; line-height: 1.6; color: rgba(17,17,17,.72); margin: 0; }

        .kland .ctamid { margin: 5rem 0 0; }

        .kland .flow-namig { margin: 5.5rem 0 0; border-radius: 22px; padding: clamp(1.8rem, 4vw, 2.6rem); background: linear-gradient(135deg, oklch(96% .03 297), oklch(95% .03 165)); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 16px 44px rgba(40,25,60,.08); }
        .kland .flow-namig .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); margin-bottom: .7rem; }
        .kland .flow-namig p { font-size: clamp(1.05rem, 2.4vw, 1.3rem); font-family: var(--font-serif), serif; line-height: 1.4; margin: 0; max-width: 40ch; }
        .kland .flow-namig p strong { font-weight: 600; }
        .kland .flow-namig a { display: inline-block; margin-top: 1.1rem; font-family: var(--font-sans), system-ui, sans-serif; font-size: .8rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--accent); padding-bottom: .2rem; }

        .kland .clanki { margin: 6.5rem 0 0; border-top: 1px solid rgba(17,17,17,.18); padding-top: 2.6rem; }
        .kland .clanki .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .kland .clanki h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.8rem); line-height: 1.05; margin: .6rem 0 .6rem; }
        .kland .clanki .uvod { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.78); max-width: 52ch; margin: 0 0 2.6rem; }
        .kland .zgodbe { display: grid; grid-template-columns: 1fr 1fr; gap: 2.4rem 3rem; }
        @media (max-width: 620px) { .kland .zgodbe { grid-template-columns: 1fr; gap: 2.4rem; } }
        .kland .zgodba .znak { font-family: var(--font-serif), Didot, serif; font-size: clamp(1.9rem, 5vw, 2.6rem); font-weight: 500; letter-spacing: -.01em; }
        .kland .zgodba h3 { font-size: 1rem; font-weight: 600; margin: .3rem 0 .1rem; }
        .kland .zgodba .kdo { font-size: .78rem; letter-spacing: .04em; text-transform: uppercase; color: rgba(17,17,17,.6); margin-bottom: .6rem; }
        .kland .zgodba p { font-size: .9rem; line-height: 1.65; color: rgba(17,17,17,.78); margin: 0; }

        .kland .nauk { margin: 3.4rem 0 0; font-family: var(--font-serif), serif; font-size: clamp(1.2rem, 3vw, 1.6rem); line-height: 1.4; color: var(--ink); max-width: 34ch; }
        .kland .nauk em { font-style: italic; }
        .kland .podpis { margin-top: 3.6rem; font-size: .85rem; color: rgba(17,17,17,.7); line-height: 1.7; }
        .kland .podpis a { color: var(--ink); }
      `}</style>

      <div className="hero-vizual" aria-hidden>
        {/* Ko Tina izvozi video pupe (ustvarja, sestankuje), ga da v
            public/kalkulator/pupa-hero.mp4 in se vklopi sam; do takrat
            je v ozadju njena pupa ilustracija. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pupa_pinart.svg" alt="" />
        <video muted loop autoPlay playsInline preload="none"
          onError={e => { (e.target as HTMLVideoElement).style.display = 'none'; }}>
          <source src="/kalkulator/pupa-hero.mp4" type="video/mp4" />
        </video>
      </div>

      <p className="kicker">Pinart kalkulator · brezplačno orodje za kreativce</p>
      <h1>Nehaj računati <em>po urah.</em> Začni računati po vrednosti.</h1>
      <p className="lead">
        Ura te kaznuje, ker si hitra. Kalkulator ti pokaže pošteno ceno projekta:
        izvedbo, avtorske pravice in licenco, uglašeno s tvojim trgom in velikostjo naročnika.
        Brez prijave, brez Excela.
      </p>
      <a className="cta" href={orodje}>Odpri kalkulator →</a>

      <div className="zakaj">
        <div className="k">Zakaj sploh</div>
        <p>Za samostojne kreativce cene niso objavljene nikjer. <em>Agencije jih varujejo kot recept.</em> To orodje ti da strukturo, ki je nikoli nisi imel.</p>
      </div>

      <div className="kako">
        <div className="korak">
          <div className="korak-ikona" aria-hidden><PenNib size={20} weight="light" /></div>
          <h3><span className="n">01</span> Povej, kaj ustvarjaš</h3>
          <p>Storitve, izkušnje, tvoj trg. Dodaš lahko svoje postavke in cene: od animacije do fotografije, besedil in AI.</p>
        </div>
        <div className="korak">
          <div className="korak-ikona" aria-hidden><MagnifyingGlass size={20} weight="light" /></div>
          <h3><span className="n">02</span> Poglej naročnika</h3>
          <p>Promet in dobiček podjetja (javno na bizi.si in tujih registrih) povesta, koliko je tvoje delo zanj vredno.</p>
        </div>
        <div className="korak">
          <div className="korak-ikona" aria-hidden><FileText size={20} weight="light" /></div>
          <h3><span className="n">03</span> Dobiš ponudbo</h3>
          <p>Trije paketi, avtorske pravice ločeno, urejljivo besedilo. Kopiraš v mail ali izvoziš postavke za svoj račun.</p>
        </div>
      </div>

      <div className="ctamid">
        <a className="cta" href={orodje}>Odpri kalkulator →</a>
      </div>

      <div className="flow-namig">
        <div className="k">Del Pinart Flow</div>
        <p>Kalkulator je brezplačen vstop v <strong>Pinart Flow</strong> — okolje, kjer ponudbe, pogodbe, računi in stranke ostanejo skupaj.</p>
        <a href={flow}>Spoznaj Flow →</a>
      </div>

      <div className="clanki">
        <div className="k">Zanimivosti · zakaj cena ni ura</div>
        <h2>Logotip za 35 dolarjev in logotip za milijon</h2>
        <p className="uvod">
          Najbolj znani znaki na svetu so nastali za nenavadne vsote: nekateri za ceno sendviča,
          drugi za milijon. Skupna nit ni cena izvedbe, ampak vrednost pravic in rabe. Nekaj zgodb,
          ki jih je vredno poznati, preden pošlješ naslednjo ponudbo.
        </p>

        <div className="zgodbe">
          {ZGODBE.map(z => (
            <div className="zgodba" key={z.naslov}>
              <div className="znak">{z.znak}</div>
              <h3>{z.naslov}</h3>
              <div className="kdo">{z.kdo}</div>
              <p>{z.telo}</p>
            </div>
          ))}
        </div>

        <p className="nauk">
          Nauk vseh teh zgodb je isti: <em>tvoj honorar za delo je enak, tvoja vrednost pa ne.</em>{' '}
          Zato Pinart kalkulator ceno vedno razbije na izvedbo, avtorske pravice in možnost letne licence.
        </p>

        <p className="podpis">
          Orodje in zapise je pripravila Tina, kreativna direktorica studia <a href={localePath(locale, ``)}>Pinart</a>.{' '}
          Za projekte: <a href="mailto:tina@pinart.si">tina@pinart.si</a> · <a href={localePath(locale, `/kalkulator/pogoji`)}>Pogoji uporabe</a>.
        </p>
      </div>
    </div>
  );
}
