'use client';

/* PONOVNO UPORABEN blok za pošiljanje dokumenta po e-pošti (Resend).
   Videz + animacija sta ISTA kot send-blok v kalkulatorju (razredi posl-*).
   Uporaba: <PosljiBlok subject="…" zgradiHtml={() => '<html>…'} privzetiPrejemnik="…" />
   Vsi razredi so scopeani pod .posl-root, da ne trčijo z drugimi pravili. */

import { useEffect, useState } from 'react';
import { PaperPlaneTilt, Check, X, Plus } from '@phosphor-icons/react';
import { posljiMail } from '@/lib/posta';

export interface PosljiBlokProps {
  /* zadeva e-pošte */
  subject: string;
  /* zgradi celoten HTML dokument tik pred pošiljanjem (isti kot prenos/PDF) */
  zgradiHtml: () => string;
  /* e-pošta stranke — seedana kot prvi prejemnik, če je veljavna in seznam prazen */
  privzetiPrejemnik?: string;
  /* ime stranke — za oznako čipa »stranka« (ni obvezno) */
  imeStranke?: string;
  /* e-maili kontaktov stranke za spustnik »+ kontakt«; če prazno, se skrije */
  kontakti?: string[];
  /* neobvezen naslov za odgovore (npr. tvoja e-pošta) */
  replyTo?: string;
  /* v demo/predogledu pošiljanje ni na voljo */
  samoOgled?: boolean;
}

const jeVeljavenEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function PosljiBlok({
  subject,
  zgradiHtml,
  privzetiPrejemnik,
  imeStranke,
  kontakti = [],
  replyTo,
  samoOgled = false,
}: PosljiBlokProps) {
  const [prejemniki, setPrejemniki] = useState<string[]>([]);
  const [prejemnikVnos, setPrejemnikVnos] = useState('');
  const [potrdiPosiljanje, setPotrdiPosiljanje] = useState(false);
  const [posiljamMail, setPosiljamMail] = useState(false);
  const [posljiUspeh, setPosljiUspeh] = useState(false);
  const [mailStatus, setMailStatus] = useState('');
  const [kontaktiOdprt, setKontaktiOdprt] = useState(false);

  /* Ob veljavnem privzetem mailu ga (enkrat) seedaj kot prvega prejemnika.
     NE prepiše, če je uporabnica že kaj dodala/odstranila — efekt teče samo
     ob spremembi privzetiPrejemnik, ne ob spremembi seznama prejemnikov. */
  useEffect(() => {
    const e = (privzetiPrejemnik || '').trim();
    if (jeVeljavenEmail(e)) setPrejemniki(prev => (prev.length === 0 ? [e] : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privzetiPrejemnik]);

  const dodajPrejemnika = (raw: string) => {
    const e = raw.trim().replace(/,+$/, '').trim();
    if (!jeVeljavenEmail(e)) return false;
    setPrejemniki(prev => (prev.some(x => x.toLowerCase() === e.toLowerCase()) ? prev : [...prev, e]));
    return true;
  };
  const odstraniPrejemnika = (e: string) => {
    setPrejemniki(prev => prev.filter(x => x !== e));
    setPotrdiPosiljanje(false);
  };

  /* Kontakti stranke, ki jih še NI med prejemniki (in so veljavni) — samo te
     ponudi spustnik »+ kontakt«. */
  const kontaktiNaVoljo = kontakti.filter(
    k => jeVeljavenEmail(k) && !prejemniki.some(p => p.toLowerCase() === k.toLowerCase()),
  );

  const narocnikEmail = (privzetiPrejemnik || '').trim();

  const posljiDok = async () => {
    if (samoOgled) { setMailStatus('Pošiljanje ni na voljo v predogledu.'); return; }
    if (prejemniki.length === 0) { setMailStatus('Vpiši vsaj enega prejemnika.'); return; }
    setPosiljamMail(true);
    setMailStatus('Pošiljam …');
    try {
      const rez = await posljiMail({ to: prejemniki, subject, html: zgradiHtml(), replyTo: replyTo || undefined });
      if (rez.ok) {
        setMailStatus('Poslano' + (imeStranke ? ' — ' + imeStranke : '') + '.');
        /* kratek uspešni utrip gumba (»Poslano!«), nato zapri potrditev in
           se vrni na »Pošlji« z ikono */
        setPosljiUspeh(true);
        window.setTimeout(() => { setPosljiUspeh(false); setPotrdiPosiljanje(false); }, 1600);
      } else {
        setMailStatus('Napaka: ' + (rez.napaka || 'pošiljanje ni uspelo.'));
      }
    } finally {
      setPosiljamMail(false);
    }
  };

  return (
    <div className="posl-root">
      <div className="posl-blok">
        <div className="posl-glava-vrsta">
          <span className="posl-glava">Pošiljanje dokumenta</span>
          {kontaktiNaVoljo.length > 0 && (
            <div className="posl-kontakti">
              <button type="button" className="povezava" onClick={() => setKontaktiOdprt(o => !o)}>
                <Plus size={15} /> kontakt
              </button>
              {kontaktiOdprt && (
                <div className="posl-kontakti-list">
                  {kontaktiNaVoljo.map(k => (
                    <button key={k} type="button" className="posl-kontakt-opt"
                      onClick={() => { dodajPrejemnika(k); setKontaktiOdprt(false); }}>
                      <span>{k}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="posl-za">
          <span className="posl-za-l">Za</span>
          <div className="posl-cipi">
            {prejemniki.map(e => {
              const jeStranka = jeVeljavenEmail(narocnikEmail) && e.toLowerCase() === narocnikEmail.toLowerCase();
              return (
                <span key={e} className={'posl-cip' + (jeStranka ? ' posl-cip-stranka' : '')}>
                  {jeStranka && <span className="posl-cip-oznaka">stranka</span>}
                  <span className="posl-cip-mail">{e}</span>
                  <button type="button" className="posl-cip-x" onClick={() => odstraniPrejemnika(e)} aria-label={'Odstrani ' + e}>
                    <X size={11} weight="bold" />
                  </button>
                </span>
              );
            })}
            <input type="email" className="posl-vnos" value={prejemnikVnos}
              onChange={e => { setPrejemnikVnos(e.target.value); setPotrdiPosiljanje(false); }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  if (dodajPrejemnika(prejemnikVnos)) setPrejemnikVnos('');
                } else if (e.key === 'Backspace' && !prejemnikVnos && prejemniki.length) {
                  odstraniPrejemnika(prejemniki[prejemniki.length - 1]);
                }
              }}
              onBlur={() => { if (dodajPrejemnika(prejemnikVnos)) setPrejemnikVnos(''); }}
              placeholder="dodaj email"
              aria-label="Dodaj prejemnika" />
          </div>
        </div>
        {!potrdiPosiljanje ? (
          <div className="posl-gumb-vrsta">
            <button type="button" className="posl-gumb" disabled={posiljamMail || samoOgled || prejemniki.length === 0}
              title={samoOgled ? 'V predogledu pošiljanje ni na voljo' : undefined}
              onClick={() => { setMailStatus(''); setPotrdiPosiljanje(true); }}>
              <PaperPlaneTilt size={17} /> Pošlji
            </button>
          </div>
        ) : (
          <div className="posl-potrdi">
            <span className="posl-potrdi-txt">
              {'Pošiljam ' + prejemniki.length + (prejemniki.length === 1 ? ' prejemniku:' : ' prejemnikom:')}{' '}
              <b>{prejemniki.join(', ')}</b>
            </span>
            <div className="posl-potrdi-gumbi">
              <button type="button"
                className={'posl-gumb' + (posiljamMail ? ' je-poslano' : '') + (posljiUspeh ? ' je-uspeh' : '')}
                disabled={posiljamMail || posljiUspeh}
                onClick={() => { posljiDok(); }}>
                {posljiUspeh ? (
                  <><Check size={17} weight="bold" /> Poslano!</>
                ) : posiljamMail ? (
                  <span className="posl-poslji-nalag">
                    <span className="posl-letalo-ovoj"><PaperPlaneTilt size={17} /></span>
                    <span>Pošiljam</span>
                    <span className="posl-pike" aria-hidden><span>.</span><span>.</span><span>.</span></span>
                  </span>
                ) : (
                  <><PaperPlaneTilt size={17} className="posl-letalo-mir" /> Pošlji</>
                )}
              </button>
              {!posiljamMail && !posljiUspeh && (
                <button type="button" className="povezava" onClick={() => setPotrdiPosiljanje(false)}>
                  Prekliči
                </button>
              )}
            </div>
          </div>
        )}
        {mailStatus && <p className="posl-status" role="status">{mailStatus}</p>}
      </div>

      <style>{`
        .posl-root { --posl-ink: var(--ink, #111); --posl-paper: var(--paper, #f4f1ea); --posl-accent: var(--accent, #B25476); }
        .posl-root .posl-blok { text-align: left; max-width: 560px; margin: 1.4rem auto 0; border: 1px solid rgba(17,17,17,.14); border-radius: 16px; background: rgba(255,255,255,.6); padding: 1.25rem 1.4rem 1.35rem; }
        .posl-root .posl-glava-vrsta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .85rem; }
        .posl-root .posl-glava { font-size: .68rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(17,17,17,.5); }
        .posl-root .posl-za { display: flex; align-items: center; gap: .6rem; }
        .posl-root .posl-za-l { flex: 0 0 auto; font-size: .9rem; color: rgba(17,17,17,.6); }
        .posl-root .posl-cipi { flex: 1 1 auto; display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; min-height: 2.7rem; padding: .38rem .5rem; border: 1px solid rgba(17,17,17,.2); border-radius: 12px; background: #fff; }
        .posl-root .posl-cipi:focus-within { border-color: var(--posl-accent); }
        .posl-root .posl-cip { display: inline-flex; align-items: center; gap: .35rem; padding: .26rem .32rem .26rem .62rem; border-radius: 999px; font-size: .85rem; color: var(--posl-ink); background: var(--posl-paper); border: 1px solid rgba(17,17,17,.12); }
        .posl-root .posl-cip-mail { line-height: 1.2; }
        .posl-root .posl-cip-x { display: inline-flex; align-items: center; justify-content: center; width: 1.15rem; height: 1.15rem; padding: 0; border: 0; border-radius: 999px; cursor: pointer; color: rgba(17,17,17,.55); background: rgba(17,17,17,.08); }
        .posl-root .posl-cip-x:hover { color: var(--posl-ink); background: rgba(17,17,17,.16); }
        .posl-root .posl-cip-oznaka { font-size: .6rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: .1rem .32rem; border-radius: 999px; background: rgba(17,17,17,.08); color: rgba(17,17,17,.55); }
        .posl-root .posl-vnos { flex: 1 1 8rem; min-width: 8rem; border: 0; outline: none; background: transparent; font: inherit; font-size: .9rem; color: var(--posl-ink); padding: .32rem .2rem; }
        .posl-root .posl-vnos::placeholder { color: rgba(17,17,17,.4); }
        .posl-root .posl-kontakti { position: relative; flex: 0 0 auto; }
        .posl-root .posl-kontakti > .povezava { white-space: nowrap; }
        .posl-root .posl-kontakti-list { position: absolute; right: 0; z-index: 6; margin-top: .35rem; min-width: 15rem; max-width: 24rem; padding: .3rem; border: 1px solid rgba(17,17,17,.16); border-radius: 12px; background: #fff; box-shadow: 0 12px 28px rgba(35,18,45,.16); display: flex; flex-direction: column; }
        .posl-root .posl-kontakt-opt { display: flex; flex-direction: column; gap: .1rem; text-align: left; padding: .5rem .6rem; border: 0; border-radius: 8px; background: none; font: inherit; font-size: .86rem; color: var(--posl-ink); cursor: pointer; }
        .posl-root .posl-kontakt-opt b { font-weight: 700; }
        .posl-root .posl-kontakt-opt span { color: rgba(17,17,17,.6); }
        .posl-root .posl-kontakt-opt:hover { background: var(--posl-paper); }
        /* Primarni gumb: črni pill z oživljenimi besedilnimi stanji. Vodoravno centriran. */
        .posl-root .posl-gumb-vrsta { display: flex; justify-content: center; margin-top: 1.05rem; }
        .posl-root .posl-gumb { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-width: 11rem; font-family: inherit; font-size: .92rem; font-weight: 600; letter-spacing: .01em; cursor: pointer; border-radius: 999px; padding: .8rem 2rem; border: 1px solid var(--posl-ink); background: var(--posl-ink); color: var(--posl-paper); transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease, background .3s ease, border-color .3s ease; }
        .posl-root .posl-gumb:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(35,18,45,.2); }
        .posl-root .posl-gumb:active:not(:disabled) { transform: translateY(0) scale(.98); }
        .posl-root .posl-gumb:disabled { cursor: default; opacity: .4; }
        .posl-root .posl-gumb.je-poslano { opacity: .9; }
        .posl-root .posl-gumb.je-uspeh { opacity: 1; background: #1f7a4d; border-color: #1f7a4d; color: #fff; animation: poslUspeh .5s cubic-bezier(.2,1.4,.4,1); }
        @keyframes poslUspeh { 0% { transform: scale(.92); } 55% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .posl-root .posl-poslji-nalag { display: inline-flex; align-items: center; }
        .posl-root .posl-letalo-ovoj { display: inline-flex; align-items: center; overflow: visible; animation: poslLetOvoj .6s ease-out forwards; }
        .posl-root .posl-letalo-ovoj svg { animation: poslLet .6s ease-out forwards; }
        @keyframes poslLet { 0% { transform: translate(0,0) rotate(0); opacity: 1; } 100% { transform: translate(1.5rem,-1.15rem) rotate(22deg); opacity: 0; } }
        @keyframes poslLetOvoj { 0% { max-width: 1.6rem; margin-right: .45rem; } 100% { max-width: 0; margin-right: 0; } }
        .posl-root .posl-letalo-mir { animation: poslPrilet .42s ease-out; }
        @keyframes poslPrilet { 0% { transform: translate(.5rem,-.4rem) rotate(14deg); opacity: 0; } 100% { transform: translate(0,0) rotate(0); opacity: 1; } }
        .posl-root .posl-pike { display: inline-flex; margin-left: .12rem; }
        .posl-root .posl-pike span { opacity: .25; animation: poslPika 1.4s infinite; }
        .posl-root .posl-pike span:nth-child(2) { animation-delay: .2s; }
        .posl-root .posl-pike span:nth-child(3) { animation-delay: .4s; }
        @keyframes poslPika { 0%, 60%, 100% { opacity: .25; } 30% { opacity: 1; } }
        .posl-root .posl-potrdi { margin-top: 1.05rem; display: flex; flex-direction: column; align-items: center; gap: .7rem; text-align: center; }
        .posl-root .posl-potrdi-txt { font-size: .88rem; color: var(--posl-ink); line-height: 1.5; }
        .posl-root .posl-potrdi-txt b { font-weight: 700; word-break: break-word; }
        .posl-root .posl-potrdi-gumbi { display: flex; align-items: center; justify-content: center; gap: 1.1rem; flex-wrap: wrap; }
        .posl-root .posl-status { margin: .6rem 0 0; font-size: .85rem; color: var(--posl-ink); text-align: center; }
        /* povezava (tekstovni gumb) — samostojno pravilo, ker blok ni nujno pod .cw */
        .posl-root .povezava { font-family: inherit; font-size: .88rem; font-weight: 500; cursor: pointer; border: none; background: none; color: var(--posl-ink); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: .28em; padding: 0; display: inline-flex; align-items: center; gap: .38rem; }
        .posl-root .povezava:hover { opacity: .6; }
        @media (prefers-reduced-motion: reduce) {
          .posl-root .posl-gumb, .posl-root .posl-gumb.je-uspeh { animation: none; transition: none; }
          .posl-root .posl-pike span { animation: none; opacity: 1; }
          .posl-root .posl-letalo-ovoj, .posl-root .posl-letalo-ovoj svg, .posl-root .posl-letalo-mir { animation: none; }
          .posl-root .posl-letalo-ovoj { margin-right: .45rem; }
        }
        @media (max-width: 640px) {
          .posl-root .posl-za { flex-direction: column; gap: .35rem; align-items: stretch; }
          .posl-root .posl-za-l { padding-top: 0; }
          .posl-root .posl-gumb { width: 100%; }
        }
      `}</style>
    </div>
  );
}
