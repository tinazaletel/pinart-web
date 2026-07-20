'use client';

import { useEffect, useState } from 'react';
import { localePath } from '@/i18n/routing';

/* Header/nav za Pinart Flow produkt (pinartflow.com) — locen od pinart.si.
   Logo + Produkt/Kalkulator/Cenik/O nas/Kontakt + Prijava/Ustvari racun. */

export default function FlowNav({ locale = 'sl' }: { locale?: string }) {
  const [open, setOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const flow = localePath(locale, '/flow');
  const kalk = localePath(locale, '/kalkulator');
  const prijava = localePath(locale, '/kalkulator/prijava');

  const LINKS = [
    { label: 'Cenik', href: `${flow}#cenik` },
    { label: 'Vprašanja', href: `${flow}#faq` },
    { label: 'O nas', href: `${flow}#onas` },
    { label: 'Kontakt', href: 'mailto:tina@pinart.si' },
  ];

  const close = () => { setOpen(false); setProdOpen(false); };

  return (
    <header className={`flnav${scrolled ? ' scrolled' : ''}`}>
      <a className="flnav-brand" href={flow} onClick={close} aria-label="Pinart Flow">
        <strong className="flnav-pinart">Pinart</strong><span className="flnav-ff">FLOW</span><small>BETA</small>
      </a>

      <nav className="flnav-links" aria-label="Glavna navigacija">
        <div className={`flnav-prod${prodOpen ? ' odprt' : ''}`}>
          <button type="button" onClick={() => setProdOpen(v => !v)} aria-expanded={prodOpen}>
            Produkt
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 7.5 4.5 4.5 4.5-4.5" /></svg>
          </button>
          <div className="flnav-menu">
            <a href={`${flow}#orodja`} onClick={close}><strong>Pinart Flow</strong><span>Vsa orodja za poslovanje kreativca</span></a>
            <a href={kalk} onClick={close}><strong>Brezplačni kalkulator</strong><span>Poštena cena projekta, brez prijave</span></a>
          </div>
        </div>
        {LINKS.map(l => <a key={l.label} href={l.href} onClick={close}>{l.label}</a>)}
      </nav>

      <div className="flnav-actions">
        <a className="flnav-login" href={prijava} onClick={close}>Prijava</a>
        <a className="flnav-signup" href={prijava} onClick={close}>Ustvari račun</a>
      </div>

      <button className="flnav-burger" type="button" onClick={() => setOpen(v => !v)} aria-label={open ? 'Zapri meni' : 'Meni'} aria-expanded={open}>
        <span /><span /><span />
      </button>

      {open && (
        <div className="flnav-drawer">
          <a href={`${flow}#orodja`} onClick={close}>Pinart Flow</a>
          <a href={kalk} onClick={close}>Brezplačni kalkulator</a>
          {LINKS.map(l => <a key={l.label} href={l.href} onClick={close}>{l.label}</a>)}
          <a className="flnav-login" href={prijava} onClick={close}>Prijava</a>
          <a className="flnav-signup" href={prijava} onClick={close}>Ustvari račun</a>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .flnav { position: fixed; inset: 0 0 auto 0; z-index: 100; display: flex; align-items: center; gap: 1.4rem;
          padding: clamp(.85rem, 1.6vw, 1.25rem) clamp(1.25rem, 5vw, 5.5rem);
          background: color-mix(in oklch, var(--paper) 90%, transparent);
          transition: background .28s ease, box-shadow .28s ease, border-color .28s ease; border-bottom: 1px solid transparent; }
        .flnav.scrolled { background: var(--paper); border-bottom-color: rgba(17,17,17,.08); box-shadow: 0 6px 24px rgba(40,25,60,.05); }

        .flnav-brand { display: inline-flex; align-items: center; gap: .5rem; text-decoration: none; color: var(--ink); }
        .flnav-logo { height: 1.55rem; width: auto; display: block; }
        .flnav-brand .flnav-pinart { font-family: var(--font-sans), system-ui, sans-serif; font-weight: 800; font-size: 1.12rem; letter-spacing: -.01em; color: var(--ink); line-height: 1; }
        .flnav-brand .flnav-ff { font-size: .84rem; font-weight: 700; letter-spacing: .12em; color: var(--ink); line-height: 1; }
        .flnav-brand small { font-size: .56rem; font-weight: 700; letter-spacing: .1em; color: #b25476; border: 1px solid color-mix(in oklch, #b25476 45%, transparent); border-radius: 999px; padding: .12rem .4rem; align-self: center; }

        .flnav-links { display: flex; align-items: center; gap: 1.7rem; margin-left: auto; }
        .flnav-links > a, .flnav-prod > button { font-family: var(--font-sans), system-ui, sans-serif; font-size: .84rem; font-weight: 600; letter-spacing: .01em; color: rgba(17,17,17,.72); text-decoration: none; background: none; border: 0; cursor: pointer; padding: 0; transition: color .16s; display: inline-flex; align-items: center; gap: .3rem; }
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
        .flnav-login { font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; font-weight: 600; color: var(--ink); text-decoration: none; padding: .55rem .95rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.2); transition: border-color .16s, background .16s; }
        .flnav-login:hover { border-color: var(--ink); background: rgba(17,17,17,.04); }
        .flnav-signup { font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; font-weight: 700; color: var(--paper); text-decoration: none; padding: .58rem 1.1rem; border-radius: 999px; background: var(--ink); transition: transform .16s, box-shadow .16s; }
        .flnav-signup:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(40,25,60,.2); }

        .flnav-burger { display: none; flex-direction: column; gap: 4px; width: 2.6rem; height: 2.6rem; align-items: center; justify-content: center; background: none; border: 1px solid rgba(17,17,17,.16); border-radius: 999px; cursor: pointer; margin-left: auto; }
        .flnav-burger span { width: 1.05rem; height: 1.5px; background: var(--ink); border-radius: 2px; transition: transform .2s, opacity .2s; }

        .flnav-drawer { position: fixed; inset: 3.9rem 0 0 0; z-index: 99; display: flex; flex-direction: column; gap: .2rem; padding: 1.2rem clamp(1.25rem, 5vw, 2rem) 2rem; background: var(--paper); overflow-y: auto; animation: flnavDrawer .26s cubic-bezier(.2,.8,.3,1) both; }
        @keyframes flnavDrawer { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .flnav-drawer > a { font-family: var(--font-sans), system-ui, sans-serif; font-size: 1.05rem; font-weight: 600; color: var(--ink); text-decoration: none; padding: .95rem .3rem; border-bottom: 1px solid rgba(17,17,17,.08); }
        .flnav-drawer .flnav-login, .flnav-drawer .flnav-signup { text-align: center; margin-top: .9rem; border-bottom: 0; font-size: .95rem; }
        .flnav-drawer .flnav-login { border: 1px solid rgba(17,17,17,.2); }

        @media (max-width: 900px) {
          .flnav-links, .flnav-actions { display: none; }
          .flnav-burger { display: flex; }
          .flnav { background: color-mix(in oklch, var(--paper) 92%, transparent); }
        }
      `}} />
    </header>
  );
}
