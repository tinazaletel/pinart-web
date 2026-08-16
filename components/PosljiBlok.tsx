'use client';

/* PONOVNO UPORABEN blok za pošiljanje dokumenta po e-pošti (Resend).
   Videz + animacija sta ISTA kot send-blok v kalkulatorju (razredi posl-*).
   Uporaba: <PosljiBlok subject="…" zgradiHtml={() => '<html>…'} privzetiPrejemnik="…" />
   Vsi razredi so scopeani pod .posl-root, da ne trčijo z drugimi pravili. */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PaperPlaneTilt, Check, X, Plus } from '@phosphor-icons/react';
import { posljiMail } from '@/lib/posta';
import { dodajPosto } from '@/lib/postaDnevnik';

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
  /* neobvezno: če je podan, se ob uspešnem pošiljanju zabeleži v dnevnik pošte
     (lib/postaDnevnik), da se pokaže na strani projekta */
  projektId?: string;
  /* neobvezno: id stranke — zabeleži se skupaj s projektId (ali sam) */
  clientId?: string;
  /* neobvezne dodatne akcije (npr. Prenesi PDF, Kopiraj) — na desktopu inline pod
     send-blokom, na mobilu skrite pod gumbom »Več možnosti« (slide-up sheet). */
  dodatneAkcije?: Array<{ label: string; onClick: () => void; disabled?: boolean; ikona?: ReactNode }>;
  /* naslov »Več možnosti« sheeta (privzeto »Več možnosti«) */
  vecNaslov?: string;
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
  projektId,
  clientId,
  dodatneAkcije = [],
  vecNaslov = 'Več možnosti',
}: PosljiBlokProps) {
  const [vecOdprt, setVecOdprt] = useState(false);
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
      /* Ko je pošta vezana na projekt (projektId), NE nastavljamo reply-to na
         lastnika — strežnik iz projectExternalId nastavi reply-to token in ODHODNO
         pošto zapiše v project_mail. Owner reply-to obdržimo le za nevezano pošto. */
      const rez = await posljiMail({
        to: prejemniki,
        subject,
        html: zgradiHtml(),
        projectExternalId: projektId || undefined,
        clientId: clientId || undefined,
        replyTo: projektId ? undefined : (replyTo || undefined),
      });
      if (rez.ok) {
        /* Lokalni dnevnik pošte (prikaz na strani projekta brez čakanja na oblak).
           Odhodni zapis v oblak (project_mail) naredi strežnik ob projectExternalId —
           zato tu ne kličemo več pushProjectMail (sicer bi bil zapis podvojen). */
        if (projektId || clientId) {
          try {
            dodajPosto({ projectId: projektId, clientId, smer: 'poslano', prejemniki, zadeva: subject, povzetek: undefined });
          } catch { /* zapis v dnevnik ne sme prekiniti uspešnega pošiljanja */ }
        }
        /* uspeh sporoči GUMB (»Poslano naročniku«); statusne vrstice ob uspehu
           NE kažemo (njeno pojavljanje/izginjanje je povzročalo skok) */
        setMailStatus('');
        /* kratek uspešni utrip gumba (»Poslano naročniku«), nato zapri potrditev
           in se vrni na »Pošlji« z ikono */
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
        <div className="posl-akcija">
          <span className={'posl-potrdi-txt' + (potrdiPosiljanje ? '' : ' je-skrit')} aria-hidden={!potrdiPosiljanje}>
            {'Pošiljam ' + prejemniki.length + (prejemniki.length === 1 ? ' prejemniku:' : ' prejemnikom:')}{' '}
            <b>{prejemniki.join(', ')}</b>
          </span>
          {!potrdiPosiljanje ? (
            <div className="posl-gumb-vrsta">
              <button type="button" className="posl-gumb" disabled={posiljamMail || samoOgled || prejemniki.length === 0}
                title={samoOgled ? 'V predogledu pošiljanje ni na voljo' : undefined}
                onClick={() => { setMailStatus(''); setPotrdiPosiljanje(true); }}>
                <PaperPlaneTilt size={17} /> Pošlji
              </button>
            </div>
          ) : (
            <div className="posl-gumb-vrsta posl-potrdi-gumbi">
              <button type="button"
                className={'posl-gumb' + (posiljamMail ? ' je-poslano' : '') + (posljiUspeh ? ' je-uspeh' : '')}
                disabled={posiljamMail || posljiUspeh}
                onClick={() => { posljiDok(); }}>
                {posljiUspeh ? (
                  <><Check size={17} weight="bold" /> Poslano naročniku</>
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
          )}
        </div>
        {mailStatus && <p className="posl-status" role="status">{mailStatus}</p>}
      </div>

      {dodatneAkcije.length > 0 && (<>
        {/* desktop: inline povezave; mobilno: skrite -> pod gumbom »Več možnosti« */}
        <div className="posl-sekundarne">
          {dodatneAkcije.map((a, i) => (
            <button key={i} type="button" className="povezava" disabled={a.disabled} onClick={a.onClick}>{a.ikona}{a.label}</button>
          ))}
        </div>
        <button type="button" className="posl-vec-gumb" onClick={() => setVecOdprt(true)}>{vecNaslov}</button>
        {vecOdprt && typeof document !== 'undefined' && createPortal(
          <div className="posl-root">
            <div className="pmsheet-back" onClick={() => setVecOdprt(false)} aria-hidden />
            <div className="pmsheet" role="dialog" aria-label={vecNaslov}>
              <div className="pmsheet-glava"><span>{vecNaslov}</span><button type="button" onClick={() => setVecOdprt(false)} aria-label="Zapri"><X size={15} weight="bold" /></button></div>
              {dodatneAkcije.map((a, i) => (
                <button key={i} type="button" className="pmsheet-akcija" disabled={a.disabled} onClick={() => { a.onClick(); setVecOdprt(false); }}>{a.ikona}{a.label}</button>
              ))}
            </div>
          </div>, document.body)}
      </>)}

      <style>{`
        .posl-root { --posl-ink: var(--ink, #111); --posl-paper: var(--paper, #f4f1ea); --posl-accent: var(--accent, #B25476); }
        .posl-root .posl-blok { text-align: left; max-width: 560px; margin: 1.4rem auto 0; border: 1px solid oklch(92% .006 82 / .55); border-radius: 16px; background: rgba(255,255,255,.6); padding: 1.25rem 1.4rem 1.35rem; }
        .posl-root .posl-glava-vrsta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .85rem; }
        .posl-root .posl-glava { font-size: .68rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(17,17,17,.5); }
        .posl-root .posl-za { display: flex; align-items: center; gap: .6rem; }
        .posl-root .posl-za-l { flex: 0 0 auto; font-size: .9rem; font-weight: 700; color: var(--posl-ink); }
        .posl-root .posl-cipi { flex: 1 1 auto; display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; min-height: 2.7rem; padding: .38rem .5rem; border: 1px solid oklch(92% .006 82 / .7); border-radius: 12px; background: #fff; }
        .posl-root .posl-cipi:focus-within { border-color: var(--posl-accent); }
        .posl-root .posl-cip { display: inline-flex; align-items: center; gap: .35rem; padding: .26rem .32rem .26rem .62rem; border-radius: 999px; font-size: .85rem; color: var(--posl-ink); background: var(--posl-paper); border: 1px solid rgba(17,17,17,.12); }
        .posl-root .posl-cip-mail { line-height: 1.2; }
        .posl-root .posl-cip-x { display: inline-flex; align-items: center; justify-content: center; width: 1.15rem; height: 1.15rem; padding: 0; border: 0; border-radius: 999px; cursor: pointer; color: rgba(17,17,17,.55); background: rgba(17,17,17,.08); }
        .posl-root .posl-cip-x:hover { color: var(--posl-ink); background: rgba(17,17,17,.16); }
        .posl-root .posl-cip-oznaka { font-size: .6rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: .1rem .32rem; border-radius: 999px; background: rgba(17,17,17,.08); color: rgba(17,17,17,.55); }
        .posl-root .posl-vnos { flex: 1 1 8rem; min-width: 8rem; border: 0; outline: none; background: transparent; font: inherit; font-size: .9rem; color: var(--posl-ink); padding: .32rem .2rem; }
        .posl-root .posl-vnos::placeholder { color: rgba(17,17,17,.4); }
        .posl-root .posl-vnos:focus, .posl-root .posl-vnos:focus-visible { outline: none; box-shadow: none; }
        /* prepreči rumeno ozadje ob samodejnem izpolnjevanju (Chrome/Safari autofill) */
        .posl-root .posl-vnos:-webkit-autofill, .posl-root .posl-vnos:-webkit-autofill:hover, .posl-root .posl-vnos:-webkit-autofill:focus { -webkit-box-shadow: 0 0 0 100px #fff inset; -webkit-text-fill-color: var(--posl-ink); caret-color: var(--posl-ink); transition: background-color 9999s ease 0s; }
        .posl-root .posl-kontakti { position: relative; flex: 0 0 auto; }
        .posl-root .posl-kontakti > .povezava { white-space: nowrap; }
        .posl-root .posl-kontakti-list { position: absolute; right: 0; z-index: 6; margin-top: .35rem; min-width: 15rem; max-width: 24rem; padding: .3rem; border: 1px solid rgba(17,17,17,.16); border-radius: 12px; background: #fff; box-shadow: 0 12px 28px rgba(35,18,45,.16); display: flex; flex-direction: column; }
        .posl-root .posl-kontakt-opt { display: flex; flex-direction: column; gap: .1rem; text-align: left; padding: .5rem .6rem; border: 0; border-radius: 8px; background: none; font: inherit; font-size: .86rem; color: var(--posl-ink); cursor: pointer; }
        .posl-root .posl-kontakt-opt b { font-weight: 700; }
        .posl-root .posl-kontakt-opt span { color: rgba(17,17,17,.6); }
        .posl-root .posl-kontakt-opt:hover { background: var(--posl-paper); }
        /* Primarni gumb: črni pill z oživljenimi besedilnimi stanji. Vodoravno centriran. */
        .posl-root .posl-akcija { margin-top: 1.05rem; }
        .posl-root .posl-gumb-vrsta { display: flex; justify-content: center; }
        .posl-root .posl-gumb { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-width: 11rem; min-height: 2.85rem; box-sizing: border-box; font-family: inherit; font-size: .92rem; font-weight: 600; letter-spacing: .01em; cursor: pointer; border-radius: 999px; padding: .8rem 2rem; border: 1px solid var(--posl-ink); background: var(--posl-ink); color: var(--posl-paper); transition: transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s cubic-bezier(.22,1,.36,1), opacity .3s ease, background .55s cubic-bezier(.22,1,.36,1), border-color .55s cubic-bezier(.22,1,.36,1), color .55s cubic-bezier(.22,1,.36,1); }
        .posl-root .posl-gumb:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(35,18,45,.2); }
        .posl-root .posl-gumb:active:not(:disabled) { transform: translateY(0) scale(.98); }
        .posl-root .posl-gumb:disabled { cursor: default; opacity: .4; }
        .posl-root .posl-gumb.je-poslano { opacity: .9; }
        .posl-root .posl-gumb.je-uspeh { opacity: 1; background: #1f7a4d; border-color: #1f7a4d; color: #fff; animation: poslUspeh .6s cubic-bezier(.22,1,.36,1); }
        @keyframes poslUspeh { 0% { transform: scale(.985); } 45% { transform: scale(1.02); } 100% { transform: scale(1); } }
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
        /* potrditveno besedilo je vedno prisotno (rezervira prostor), ob mirovanju
           samo nevidno — tako menjava faze ne premakne gumba navpično */
        .posl-root .posl-potrdi-txt { display: block; text-align: center; font-size: .88rem; color: var(--posl-ink); line-height: 1.5; margin-bottom: .7rem; }
        .posl-root .posl-potrdi-txt.je-skrit { visibility: hidden; }
        .posl-root .posl-potrdi-txt b { font-weight: 700; word-break: break-word; }
        .posl-root .posl-potrdi-gumbi { display: flex; align-items: center; justify-content: center; gap: 1.1rem; flex-wrap: wrap; }
        .posl-root .posl-status { margin: .6rem 0 0; font-size: .85rem; color: var(--posl-ink); text-align: center; }
        /* povezava (tekstovni gumb) — samostojno pravilo, ker blok ni nujno pod .cw */
        .posl-root .povezava { font-family: inherit; font-size: .88rem; font-weight: 500; cursor: pointer; border: none; background: none; color: var(--posl-ink); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: .28em; padding: 0; display: inline-flex; align-items: center; gap: .38rem; }
        .posl-root .povezava:hover { opacity: .6; }
        /* dodatne akcije: desktop inline, mobilno pod »Več možnosti« sheetom (portal na body) */
        .posl-root .posl-sekundarne { display: flex; flex-wrap: wrap; justify-content: center; gap: .9rem 1.4rem; max-width: 560px; margin: 1.1rem auto 0; }
        .posl-root .posl-vec-gumb { display: none; }
        .posl-root .pmsheet-back { position: fixed; inset: 0; z-index: 200; background: rgba(28,21,24,.42); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
        .posl-root .pmsheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 201; box-sizing: border-box; max-height: 85dvh; overflow-y: auto; display: flex; flex-direction: column; gap: .1rem; padding: 1rem 1.1rem calc(1.4rem + env(safe-area-inset-bottom,0px)); background: #fff; border-radius: 22px 22px 0 0; box-shadow: 0 -16px 44px rgba(40,25,40,.22); }
        .posl-root .pmsheet-glava { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .5rem; }
        .posl-root .pmsheet-glava span { font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .posl-root .pmsheet-glava button { display: inline-flex; align-items: center; justify-content: center; width: 2.1rem; height: 2.1rem; flex: none; border-radius: 50%; border: 1px solid rgba(17,17,17,.16); background: #fff; color: var(--posl-ink); cursor: pointer; }
        .posl-root .pmsheet-akcija { min-height: 3rem; padding: .7rem .6rem; display: flex; align-items: center; justify-content: flex-start; gap: .7rem; width: 100%; text-align: left; border: 0; background: none; font: inherit; font-size: .95rem; color: var(--posl-ink); cursor: pointer; border-radius: 10px; }
        .posl-root .pmsheet-akcija:hover { background: rgba(17,17,17,.05); }
        .posl-root .pmsheet-akcija:disabled { opacity: .5; cursor: default; }
        @media (prefers-reduced-motion: reduce) {
          .posl-root .posl-gumb, .posl-root .posl-gumb.je-uspeh { animation: none; transition: none; }
          .posl-root .posl-pike span { animation: none; opacity: 1; }
          .posl-root .posl-letalo-ovoj, .posl-root .posl-letalo-ovoj svg, .posl-root .posl-letalo-mir { animation: none; }
          .posl-root .posl-letalo-ovoj { margin-right: .45rem; }
        }
        @media (max-width: 640px) {
          /* »Za« INLINE z inputom (kot ponudba), ne zložen; input čez preostalo širino */
          .posl-root .posl-za { flex-direction: row; gap: .5rem; align-items: center; }
          .posl-root .posl-za-l { padding-top: 0; }
          .posl-root .posl-gumb { width: 100%; }
          .posl-root .posl-sekundarne { display: none; }
          .posl-root .posl-vec-gumb { display: flex; align-items: center; justify-content: center; gap: .4rem; width: fit-content; margin: .9rem auto 0; padding: .7rem 1.4rem; border: 1px solid rgba(17,17,17,.22); border-radius: 999px; background: transparent; color: var(--posl-ink); font-family: inherit; font-size: .82rem; font-weight: 700; cursor: pointer; }
        }
      `}</style>
    </div>
  );
}
