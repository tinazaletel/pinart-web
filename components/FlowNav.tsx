'use client';

import { useEffect, useState } from 'react';
import { localePath } from '@/i18n/routing';

/* Header/nav za Pinart Flow produkt (pinartflow.com) — locen od pinart.si.
   Logo + Produkt/Kalkulator/Cenik/O nas/Kontakt + Prijava/Ustvari racun. */

export default function FlowNav({ locale = 'sl' }: { locale?: string }) {
  const isEn = locale === 'en';
  const [open, setOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);   /* mobilno: ob scrollu navzdol se umakne */

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const oceni = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      /* 6px prag: brez njega drobno tresenje prsta vklaplja/izklaplja vrstico.
         Navzdol (in mimo ~90px) => skrij; navzgor => takoj pokaži. (Umik le na mobilu — CSS.) */
      if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > 90);
        lastY = y;
      }
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(oceni); } };
    oceni();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const flow = localePath(locale, '/flow');
  const kalk = localePath(locale, '/kalkulator/orodje');
  const prijava = localePath(locale, '/kalkulator/prijava');
  const languageHref = localePath(isEn ? 'sl' : 'en', '/flow');

  const LINKS = [
    { label: isEn ? 'Pricing' : 'Cenik', href: `${flow}#cenik` },
    { label: isEn ? 'FAQ' : 'Vprašanja', href: `${flow}#faq` },
    { label: isEn ? 'About' : 'O nas', href: `${flow}#onas` },
    { label: isEn ? 'Contact' : 'Kontakt', href: 'mailto:tina@pinart.si' },
  ];

  const close = () => { setOpen(false); setProdOpen(false); };

  return (
    <>
    <header className={`flnav${scrolled ? ' scrolled' : ''}${hidden && !open ? ' flnav-hidden' : ''}`}>
      <a className="flnav-brand" href={flow} onClick={close} aria-label="Pinart Flow">
        <span className="flnav-dot" aria-hidden />
        <strong className="flnav-pinart">Pinart</strong><span className="flnav-ff">FLOW</span><small>BETA</small>
      </a>

      <nav className="flnav-links" aria-label={isEn ? 'Main navigation' : 'Glavna navigacija'}>
        <div className={`flnav-prod${prodOpen ? ' odprt' : ''}`}>
          <button type="button" onClick={() => setProdOpen(v => !v)} aria-expanded={prodOpen}>
            {isEn ? 'Product' : 'Produkt'}
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 7.5 4.5 4.5 4.5-4.5" /></svg>
          </button>
          <div className="flnav-menu">
            {/* Ime je bilo »Pinart Flow« — krozno, ker si ze na strani Pinart Flow.
                Klik tudi ni naredil nicesar, ker je naslov ze bil /flow#orodja in
                brskalnik iste povezave ne odpre znova. Zdaj pove, KAM pelje, in
                se premakne tudi, ce si ze tam. */}
            <a href={`${flow}#orodja`} onClick={e => {
              const cilj = typeof document !== 'undefined' ? document.getElementById('orodja') : null;
              if (cilj) {
                e.preventDefault();
                cilj.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (typeof history !== 'undefined') history.replaceState(null, '', `${flow}#orodja`);
              }
              close();
            }}><strong>{isEn ? 'All tools' : 'Vsa orodja'}</strong><span>{isEn ? 'Every tool a creative business needs' : 'Vse za poslovanje kreativca na enem mestu'}</span></a>
            <a href={kalk} onClick={close}><strong>{isEn ? 'Free calculator' : 'Brezplačni kalkulator'}</strong><span>{isEn ? 'A fair project price, no account required' : 'Poštena cena projekta, brez prijave'}</span></a>
          </div>
        </div>
        {LINKS.map(l => <a key={l.label} href={l.href} onClick={close}>{l.label}</a>)}
      </nav>

      <div className="flnav-actions">
        <a className="flnav-login" href={prijava} onClick={close}>{isEn ? 'Log in' : 'Prijava'}</a>
        <a className="flnav-signup" href={`${prijava}?nov=1`} onClick={close}>{isEn ? 'Create account' : 'Ustvari račun'}</a>
        <a className="flnav-lang" href={languageHref} hrefLang={isEn ? 'sl' : 'en'} aria-label={isEn ? 'Preklopi na slovenščino' : 'Switch to English'}>
          <span aria-hidden>{isEn ? '🇸🇮' : '🇬🇧'}</span>{isEn ? 'SL' : 'EN'}
        </a>
      </div>

      <button className="flnav-burger" type="button" onClick={() => setOpen(v => !v)} aria-label={open ? (isEn ? 'Close menu' : 'Zapri meni') : (isEn ? 'Menu' : 'Meni')} aria-expanded={open}>
        <span /><span /><span />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .flnav { position: fixed; inset: 0 0 auto 0; z-index: 100; display: flex; align-items: center; gap: 1.4rem;
          padding: clamp(.85rem, 1.6vw, 1.25rem) clamp(1.25rem, 5vw, 5.5rem);
          background: color-mix(in oklch, var(--paper) 94%, transparent);
          /* frosted: ko hero presije skozi (0-24px skrola), je zabrisan, ne berljiv ghost-tekst */
          -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
          /* NE will-change/transform tu: to naredi header containing block za position:fixed predal,
             ki se potem ne razpre čez zaslon. Umik ob scrollu dosežemo z .flnav-hidden (transform). */
          transition: transform .32s cubic-bezier(.22,1,.36,1), background .28s ease, box-shadow .28s ease, border-color .28s ease; border-bottom: 1px solid transparent; }
        .flnav.scrolled { background: var(--paper); border-bottom-color: rgba(17,17,17,.08); box-shadow: 0 6px 24px rgba(40,25,60,.05); }

        .flnav-brand { display: inline-flex; align-items: center; gap: .5rem; text-decoration: none; color: var(--ink); }
        .flnav-logo { height: 1.55rem; width: auto; display: block; }
        .flnav-dot { width: 1.2rem; height: 1.2rem; border-radius: 50%; flex: none; background: radial-gradient(58% 48% at 30% 24%, rgba(255,255,255,.92), rgba(255,255,255,0) 62%), conic-gradient(from 210deg, #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); box-shadow: 0 3px 10px rgba(124,58,237,.28); }
        .flnav-brand .flnav-pinart { font-family: var(--font-sans), system-ui, sans-serif; font-weight: 800; font-size: 1.12rem; letter-spacing: -.01em; color: var(--ink); line-height: 1; }
        .flnav-brand .flnav-ff { font-size: .84rem; font-weight: 700; letter-spacing: .12em; color: var(--ink); line-height: 1; }
        .flnav-brand small { font-size: .56rem; font-weight: 700; letter-spacing: .1em; color: #b25476; border: 1px solid color-mix(in oklch, #b25476 45%, transparent); border-radius: 999px; padding: .12rem .4rem; align-self: center; }

        .flnav-links { display: flex; align-items: center; gap: 1.7rem; margin-left: auto; }
        .flnav-links > a, .flnav-prod > button { font-family: var(--font-sans), system-ui, sans-serif; font-size: .84rem; font-weight: 600; letter-spacing: .01em; color: rgba(17,17,17,.72); text-decoration: none; background: none; border: 0; cursor: pointer; padding: 0; transition: color .16s; display: inline-flex; align-items: center; gap: .3rem; white-space: nowrap; }
        .flnav-links > a:hover, .flnav-prod > button:hover { color: var(--ink); }
        .flnav-prod { position: relative; }
        .flnav-prod > button svg { width: .8rem; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: transform .2s; }
        .flnav-prod.odprt > button svg { transform: rotate(180deg); }
        .flnav-menu { position: absolute; top: calc(100% + .9rem); left: -1rem; min-width: 17rem; display: grid; gap: .2rem; padding: .5rem; border-radius: 1rem; background: var(--paper); border: 1px solid rgba(17,17,17,.1); box-shadow: 0 18px 44px rgba(40,25,60,.14); opacity: 0; visibility: hidden; transform: translateY(-6px); transition: opacity .18s, transform .18s, visibility .18s; }
        .flnav-prod.odprt .flnav-menu { opacity: 1; visibility: visible; transform: translateY(0); }
        .flnav-menu a { display: grid; gap: .1rem; padding: .6rem .7rem; border-radius: .65rem; text-decoration: none; transition: background .15s; }
        .flnav-menu a:hover { background: linear-gradient(125deg, oklch(96% .03 297), oklch(96% .03 165)); }
        .flnav-menu strong { font-size: .88rem; font-weight: 650; color: var(--ink); }
        .flnav-menu span { font-size: .74rem; color: rgba(17,17,17,.6); }

        .flnav-actions { display: flex; align-items: center; gap: .6rem; }
        .flnav-lang { display: inline-flex; align-items: center; gap: .34rem; min-height: 2.35rem; padding: .42rem .5rem; border: 0; border-radius: 999px; color: rgba(17,17,17,.58); font: 600 .75rem/1 var(--font-sans), system-ui, sans-serif; text-decoration: none; background: transparent; transition: color .15s, background .15s; }
        .flnav-lang:hover { color: var(--ink); background: rgba(17,17,17,.05); }
        .flnav-lang span { font-size: 1rem; line-height: 1; }
        .flnav-login { position: relative; overflow: hidden; white-space: nowrap; font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; font-weight: 600; color: var(--ink); text-decoration: none; padding: .55rem .95rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.2); transition: border-color .16s, background .16s; }
        .flnav-login:hover { border-color: var(--ink); background: rgba(17,17,17,.04); }
        .flnav-signup { position: relative; overflow: hidden; white-space: nowrap; font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; font-weight: 700; color: var(--paper); text-decoration: none; padding: .58rem 1.1rem; border-radius: 999px; background: var(--ink); transition: transform .16s, box-shadow .16s; }
        .flnav-signup:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(40,25,60,.2); }
        .flnav-login::after, .flnav-signup::after { content: ''; position: absolute; top: 0; left: -160%; width: 90%; height: 100%; transform: skewX(-18deg); transition: left .6s cubic-bezier(.19,1,.22,1); pointer-events: none; }
        .flnav-signup::after { background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.9) 50%, transparent 100%); }
        .flnav-login::after { background: linear-gradient(120deg, transparent 0%, rgba(124,58,237,.28) 42%, rgba(56,189,248,.28) 58%, transparent 100%); }
        .flnav-login:hover::after, .flnav-signup:hover::after { left: 170%; }

        .flnav-burger { display: none; flex-direction: column; gap: 4px; width: 2.6rem; height: 2.6rem; align-items: center; justify-content: center; background: none; border: 1px solid rgba(17,17,17,.16); border-radius: 999px; cursor: pointer; margin-left: auto; }
        .flnav-burger span { width: 1.05rem; height: 1.5px; background: var(--ink); border-radius: 2px; transform-origin: center; transition: transform .22s cubic-bezier(.2,.8,.3,1), opacity .18s ease; }
        /* lojtrica -> X ko je meni odprt */
        .flnav-burger[aria-expanded="true"] span:nth-child(1) { transform: translateY(5.5px) rotate(45deg); }
        .flnav-burger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
        .flnav-burger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg); }

        /* full-screen overlay (kot pinart.si): vedno izrisan, se PRELIJE (opacity). z-index 99 <
           header 100, zato logo + X ostaneta vidna/klikljiva nad njim. Povezave se pojavijo z zamikom. */
        .flnav-drawer { position: fixed; inset: 0; z-index: 99; display: flex; flex-direction: column; gap: .2rem; padding: 4.6rem clamp(1.25rem, 5vw, 2rem) 2rem; background: var(--paper); overflow-y: auto; opacity: 0; pointer-events: none; transition: opacity .38s ease; }
        .flnav-drawer[data-open="true"] { opacity: 1; pointer-events: auto; }
        .flnav-drawer > * { opacity: 0; transform: translateY(10px); transition: opacity .45s ease, transform .45s ease; }
        .flnav-drawer[data-open="true"] > * { opacity: 1; transform: none; }
        .flnav-drawer[data-open="true"] > *:nth-child(1) { transition-delay: .05s; }
        .flnav-drawer[data-open="true"] > *:nth-child(2) { transition-delay: .1s; }
        .flnav-drawer[data-open="true"] > *:nth-child(3) { transition-delay: .15s; }
        .flnav-drawer[data-open="true"] > *:nth-child(4) { transition-delay: .2s; }
        .flnav-drawer[data-open="true"] > *:nth-child(5) { transition-delay: .25s; }
        .flnav-drawer[data-open="true"] > *:nth-child(6) { transition-delay: .3s; }
        .flnav-drawer[data-open="true"] > *:nth-child(7) { transition-delay: .35s; }
        .flnav-drawer[data-open="true"] > *:nth-child(8) { transition-delay: .4s; }
        .flnav-drawer > a { font-family: var(--font-sans), system-ui, sans-serif; font-size: 1.05rem; font-weight: 600; color: var(--ink); text-decoration: none; padding: .95rem .3rem; border-bottom: 1px solid rgba(17,17,17,.08); }
        .flnav-drawer .flnav-login, .flnav-drawer .flnav-signup { text-align: center; margin-top: .9rem; border-bottom: 0; font-size: .95rem; }
        .flnav-drawer .flnav-login { border: 1px solid rgba(17,17,17,.2); }
        /* .flnav-drawer > a nastavi color:var(--ink) -> je prevozil bel tekst na signupu
           (temno na temnem = prazen gumb). Vrni belo besedilo na CTA. */
        .flnav-drawer .flnav-signup { color: var(--paper); }

        @media (max-width: 900px) {
          .flnav-links, .flnav-actions { display: none; }
          .flnav-burger { display: flex; width: 2.4rem; height: 2.4rem; }
          /* nižja vrstica na telefonu (Tina: header je bil previsok) */
          .flnav { padding-top: .5rem; padding-bottom: .5rem; background: color-mix(in oklch, var(--paper) 92%, transparent); }
          /* umik ob scrollu navzdol (samo mobilno) — se vrne ob scrollu navzgor */
          .flnav.flnav-hidden { transform: translateY(-100%); box-shadow: none; }
        }
      `}} />
    </header>

    {/* Full-screen overlay IZVEN headerja (kot pinart.si) — vedno izrisan, se PRELIJE (opacity),
        z-index < header, da logo + X ostaneta zgoraj. Povezave se pojavijo z zamikom. */}
    <div className="flnav-drawer" data-open={open} aria-hidden={!open}>
      <a href={kalk} onClick={close}>{isEn ? 'Free calculator' : 'Brezplačni kalkulator'}</a>
      {LINKS.map(l => <a key={l.label} href={l.href} onClick={close}>{l.label}</a>)}
      <a className="flnav-lang" href={languageHref} hrefLang={isEn ? 'sl' : 'en'}><span aria-hidden>{isEn ? '🇸🇮' : '🇬🇧'}</span>{isEn ? 'Slovenščina' : 'English'}</a>
      <a className="flnav-login" href={prijava} onClick={close}>{isEn ? 'Log in' : 'Prijava'}</a>
      <a className="flnav-signup" href={`${prijava}?nov=1`} onClick={close}>{isEn ? 'Create account' : 'Ustvari račun'}</a>
    </div>
    </>
  );
}
