'use client';

/* VPRAŠALNIK O CENAH — javna stran.
 *
 * Prej je bil Excel priponka. Excel se v pošti izgubi, človeka ustraši in ga
 * na telefonu ni mogoče odpreti. Tu je isti vprašalnik kot pogovor s Pupo:
 * sklop na korak, kartice kot v kalkulatorju, prazno polje je veljaven odgovor.
 *
 * Osnutek se sproti hrani v brskalniku — štirideset vprašanj je preveč, da bi
 * jih človek izgubil ob osvežitvi strani (Tina, 3. 9. 2026).
 */

import { useEffect, useMemo, useState } from 'react';
import PupaObraz from '@/components/PupaObraz';
import { localePath } from '@/i18n/routing';
import { PRIMERJAVA_FLAGSHIP, stevilkaIzOdgovora } from '@/lib/vprasalnikPrimerjava';
import { okvirZa, imaRazpon, zapisRazpona } from '@/lib/trzniOkvir';
import type { Panoga, VprasalnikVprasanje } from '@/lib/vprasalnikPanoge';
import { SKLOPI_EN, UVOD_EN, prevodVprasanja, type PrevodVprasanja } from '@/lib/vprasalnikPanogeEn';

const KLJUC = (panoga: string) => `pinart-vprasalnik-${panoga}`;

type Odgovori = Record<string, string>;

export default function VprasalnikPanoge({ panoga, jeEn }: { panoga: Panoga; jeEn: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const locale = jeEn ? 'en' : 'sl';
  const [korak, setKorak] = useState(0);
  const [odg, setOdg] = useState<Odgovori>({});
  const [ime, setIme] = useState('');
  const [email, setEmail] = useState('');
  const [posiljam, setPosiljam] = useState(false);
  const [poslano, setPoslano] = useState(false);
  const [napaka, setNapaka] = useState('');
  /* Ali je branje osnutka ze konceno. Brez te straze sta ucinka "preberi
     osnutek" in "shrani ob vsaki spremembi" tekmovala: drugi je pisal PRAZNO
     zacetno stanje nazaj v localStorage, preden je prvi sploh prisel do
     setOdg — v razvoju (React StrictMode podvoji ucinke) je to zanesljivo
     povozilo vsak osnutek takoj ob nalaganju strani (Tina, 3. 9. 2026). */
  const [obnovljeno, setObnovljeno] = useState(false);
  /* Kljukica se pokaze SAMO, ce je ime ali e-posta izpolnjena — brez njiju
     vrstica ne vsebuje osebnih podatkov in soglasja ni cemu vprasati.
     Privzeto NEOBKLJUKANA: vnaprej obkljukano soglasje po GDPR ne velja kot
     veljavno (Tina, 3. 9. 2026). */
  const [soglasje, setSoglasje] = useState(false);
  const rabiSoglasje = Boolean(ime.trim() || email.trim());

  /* Osnutek prezivi osvezitev strani. Brez tega bi clovek, ki se ustavi pri
     tridesetem vprasanju in zapre zavihek, zacel znova — in ne bi. */
  useEffect(() => {
    try {
      const shranjeno = localStorage.getItem(KLJUC(panoga.id));
      if (shranjeno) {
        const p = JSON.parse(shranjeno) as { odg?: Odgovori; ime?: string; email?: string };
        if (p.odg) setOdg(p.odg);
        if (p.ime) setIme(p.ime);
        if (p.email) setEmail(p.email);
      }
    } catch { /* prazen ali pokvarjen osnutek ni napaka */ }
    finally { setObnovljeno(true); }
  }, [panoga.id]);

  useEffect(() => {
    if (poslano || !obnovljeno) return;
    try { localStorage.setItem(KLJUC(panoga.id), JSON.stringify({ odg, ime, email })); }
    catch { /* poln ali zaklenjen localStorage ne sme ustaviti izpolnjevanja */ }
  }, [odg, ime, email, panoga.id, poslano, obnovljeno]);

  const zadnji = panoga.sklopi.length;          /* zadnji korak je oddaja */
  const sklop = korak < zadnji ? panoga.sklopi[korak] : null;
  const skupaj = useMemo(
    () => panoga.sklopi.reduce((a, s) => a + s.vprasanja.length, 0),
    [panoga],
  );
  const izpolnjenih = useMemo(
    () => Object.values(odg).filter(v => String(v).trim()).length,
    [odg],
  );

  const nastavi = (id: string, v: string) => setOdg(prej => ({ ...prej, [id]: v }));

  const posljí = async () => {
    if (posiljam || (rabiSoglasje && !soglasje)) return;
    setPosiljam(true); setNapaka('');
    try {
      const odgovor = await fetch('/api/vprasalnik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panoga: panoga.id, odgovori: odg, ime: ime.trim(), email: email.trim() }),
      });
      const telo = await odgovor.json().catch(() => ({})) as { napaka?: string };
      if (!odgovor.ok) throw new Error(telo.napaka || L('Pošiljanje ni uspelo.', 'Sending failed.'));
      setPoslano(true);
      try { localStorage.removeItem(KLJUC(panoga.id)); } catch { /* ni pomembno */ }
    } catch (e) {
      setNapaka(e instanceof Error ? e.message : L('Pošiljanje ni uspelo.', 'Sending failed.'));
    } finally { setPosiljam(false); }
  };

  /* PRIMERJAVA S TRZNIM POVPRECJEM — nagrada za izpolnjevanje, ki jo je Tina
     predlagala 3. 9. 2026. Nikoli ne primerja z drugim testerjem, samo z
     Tinino ze javno raziskavo (glej lib/vprasalnikPrimerjava.ts za zakaj). */
  const flagship = PRIMERJAVA_FLAGSHIP[panoga.id];
  const flagshipOdgovor = flagship ? odg[flagship.vprasanjeId] : undefined;
  const flagshipStevilka = flagshipOdgovor ? stevilkaIzOdgovora(flagshipOdgovor) : null;
  const flagshipOkvir = flagship ? okvirZa(flagship.storitev) : null;
  const flagshipVprasanje = flagship
    ? panoga.sklopi.flatMap(s => s.vprasanja).find(v => v.id === flagship.vprasanjeId)
    : null;
  const pokaziPrimerjavo = Boolean(
    flagshipStevilka && flagshipOkvir && imaRazpon(flagshipOkvir) && flagshipVprasanje,
  );

  if (poslano) {
    const razmerje = pokaziPrimerjavo && flagshipStevilka && flagshipOkvir && imaRazpon(flagshipOkvir)
      ? (flagshipStevilka < flagshipOkvir.od ? 'pod' : flagshipStevilka > flagshipOkvir.do ? 'nad' : 'znotraj')
      : null;
    return <div className="vpr">
      <div className="vpr-konec">
        <PupaObraz px={72} />
        <h1>{L('Hvala.', 'Thank you.')}</h1>
        <p>{L('Tvoje številke so prišle. Iz njih izpeljem razmerja med izbirami — tvojih zneskov ne objavim, ne pokažem posamično in jih ne delim naprej.',
              'Your figures have arrived. I derive the ratios between choices from them — I will not publish your amounts, show them individually or share them further.')}</p>

        {pokaziPrimerjavo && razmerje && flagshipOkvir && flagshipVprasanje && (
          <div className="vpr-primerjava">
            <p className="vpr-primerjava-vp">{(jeEn && prevodVprasanja(panoga.id, flagshipVprasanje.id)?.q) || flagshipVprasanje.q}</p>
            <p className="vpr-primerjava-tvoja">{L('Tvoj odgovor', 'Your answer')}: <b>{Math.round(flagshipStevilka!)} €</b></p>
            <p className="vpr-primerjava-izid">
              {razmerje === 'pod'
                ? L('To je pod tem, kar drugi po objavljenih cenikih v Sloveniji za to običajno zaračunajo.',
                    'This is below what others in Slovenia typically charge for this, per published price lists.')
                : razmerje === 'nad'
                  ? L('To je nad tem, kar drugi po objavljenih cenikih v Sloveniji za to običajno zaračunajo.',
                      'This is above what others in Slovenia typically charge for this, per published price lists.')
                  : L('To je znotraj tega, kar drugi po objavljenih cenikih v Sloveniji za to običajno zaračunajo.',
                      'This is within what others in Slovenia typically charge for this, per published price lists.')}
            </p>
            <p className="vpr-primerjava-trg">{L('Trg', 'Market')}: {zapisRazpona(flagshipOkvir, jeEn)}</p>
          </div>
        )}

        <p className="vpr-zasebnost">
          <a href={localePath(locale, '/zasebnost')} target="_blank" rel="noopener noreferrer">{L('politika zasebnosti', 'privacy policy')}</a>
        </p>
      </div>
      <style jsx>{slog}</style>
    </div>;
  }

  return <div className="vpr">
    <header className="vpr-glava">
      <PupaObraz px={56} />
      <div>
        <p className="vpr-kdo">{L('Pupa · Pinart Flow', 'Pupa · Pinart Flow')}</p>
        <h1>{jeEn ? panoga.imeEn : panoga.ime}</h1>
      </div>
      {/* Jezik doloca povezava (/en ali brez). Stikalo je tu, ker glava strani
          na vprasalniku ni prikazana in bi bil clovek sicer ujet v jeziku, v
          katerem je dobil povezavo. Osnutek je vezan na panogo, ne na jezik,
          zato ob preklopu nic ne izgubi (Tina, 3. 9. 2026). */}
      <nav className="vpr-jezik" aria-label={L('Jezik', 'Language')}>
        <a href={localePath('sl', `/vprasalnik/${panoga.id}`)} aria-current={jeEn ? undefined : 'page'}>SL</a>
        <span>·</span>
        <a href={localePath('en', `/vprasalnik/${panoga.id}`)} aria-current={jeEn ? 'page' : undefined}>EN</a>
      </nav>
    </header>

    {korak === 0 && (
      <section className="vpr-uvod">
        <p>{(jeEn && UVOD_EN[panoga.id]) || panoga.uvod}</p>
        <p><b>{L('Zakaj sprašujem.', 'Why I am asking.')}</b> {L('Delam orodje, ki kreativcu pomaga postaviti pošteno ceno. Upoštevati zna izkušnje, trg in velikost naročnika, ne pa še obsega dela. Brez tvojih pravih številk izračun delo podcenjuje.',
              'I am building a tool that helps creatives set a fair price. It already accounts for experience, market and client size, but not yet the scope of work. Without your real figures the calculation undervalues the work.')}</p>
        <p><b>{L('Kaj obljubim.', 'What I promise.')}</b> {L('Tvojih cen ne objavim, ne pokažem posamično in jih ne delim naprej. V orodje gredo samo razmerja med izbirami, ne tvoji zneski.',
              'I will not publish your prices, show them individually or share them further. Only the ratios between choices go into the tool, not your amounts.')}</p>
        <p className="vpr-tiho">{L('Petnajst minut. Kar ne velja zate, pusti prazno — prazno polje mi pove enako kot odgovor.',
              'Fifteen minutes. Leave anything that does not apply to you blank — a blank field tells me as much as an answer.')}</p>
      </section>
    )}

    <div className="vpr-napredek">
      <div className="vpr-crta"><i style={{ width: `${Math.round((korak / zadnji) * 100)}%` }} /></div>
      <span>{korak < zadnji
        ? L(`Sklop ${korak + 1} od ${zadnji}`, `Section ${korak + 1} of ${zadnji}`)
        : L('Zadnji korak', 'Last step')}{izpolnjenih > 0 ? ` · ${izpolnjenih}/${skupaj}` : ''}</span>
    </div>

    {sklop ? (
      <section className="vpr-sklop">
        <h2>{(jeEn && SKLOPI_EN[sklop.sklop]) || sklop.sklop}</h2>
        {sklop.vprasanja.map(v => (
          <Vprasanje key={v.id} v={v} p={jeEn ? prevodVprasanja(panoga.id, v.id) : undefined}
            vrednost={odg[v.id] || ''} dopolnilo={odg[`${v.id}::dop`] || ''}
            naVrednost={x => nastavi(v.id, x)} naDopolnilo={x => nastavi(`${v.id}::dop`, x)} jeEn={jeEn} />
        ))}
      </section>
    ) : (
      <section className="vpr-sklop">
        <h2>{L('Kdo je odgovarjal', 'Who answered')}</h2>
        <p className="vpr-tiho">{L('Neobvezno. Rabim ga samo zato, da se ti lahko zahvalim in ti pošljem, kaj je iz tega nastalo.',
              'Optional. I only need it so I can thank you and send you what came of it.')}</p>
        <div className="vpr-vp">
          <label htmlFor="vpr-ime">{L('Ime', 'Name')}</label>
          <input id="vpr-ime" value={ime} onChange={e => setIme(e.target.value)} autoComplete="name" />
        </div>
        <div className="vpr-vp">
          <label htmlFor="vpr-email">{L('E-pošta', 'Email')}</label>
          <input id="vpr-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>
        {rabiSoglasje && (
          <label className="vpr-soglasje">
            <input type="checkbox" checked={soglasje} onChange={e => setSoglasje(e.target.checked)} />
            <span>{L('Strinjam se, da ime in e-pošto uporabite za zahvalo in pošiljanje rezultatov, v skladu s ', 'I agree that you use my name and email to say thanks and send me the results, as described in the ')}
              <a href={localePath(locale, '/zasebnost')} target="_blank" rel="noopener noreferrer">{L('politiko zasebnosti', 'privacy policy')}</a>.</span>
          </label>
        )}
        {napaka && <p className="vpr-napaka">{napaka}</p>}
      </section>
    )}

    {/* Na zadnjem koraku ze stoji ista povezava ob kljukici soglasja — dvojna
        povezava tik druga pod drugo bi bila odvecna (Tina, 3. 9. 2026). */}
    {sklop && (
      <p className="vpr-zasebnost">
        {L('Kako ravnamo s tvojimi odgovori piše v', 'How we handle your answers is explained in our')}{' '}
        <a href={localePath(locale, '/zasebnost')} target="_blank" rel="noopener noreferrer">{L('politiki zasebnosti', 'privacy policy')}</a>.
      </p>
    )}

    <footer className="vpr-noga">
      <button type="button" className="vpr-nazaj" disabled={korak === 0}
        onClick={() => { setKorak(k => Math.max(0, k - 1)); window.scrollTo({ top: 0 }); }}>
        {L('Nazaj', 'Back')}
      </button>
      {korak < zadnji ? (
        <button type="button" className="vpr-naprej"
          onClick={() => { setKorak(k => k + 1); window.scrollTo({ top: 0 }); }}>
          {L('Naprej', 'Next')}
        </button>
      ) : (
        <button type="button" className="vpr-naprej" onClick={posljí} disabled={posiljam || (rabiSoglasje && !soglasje)}>
          {posiljam ? L('Pošiljam …', 'Sending …') : L('Pošlji', 'Send')}
        </button>
      )}
    </footer>

    <style jsx>{slog}</style>
  </div>;
}

/* Ena kartica. Videz je isti kot v kalkulatorju: crka, bel list, vijolicen rob
   ob izbiri — da clovek, ki pride iz Flowa, ne sreca druge aplikacije. */
function Vprasanje({ v, p, vrednost, dopolnilo, naVrednost, naDopolnilo, jeEn }: {
  v: VprasalnikVprasanje; p?: PrevodVprasanja; vrednost: string; dopolnilo: string;
  naVrednost: (x: string) => void; naDopolnilo: (x: string) => void; jeEn: boolean;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const crka = (i: number) => String.fromCharCode(65 + i);
  /* Prevod (p) je samo za prikaz: shrani se vedno slovenska vrednost izbire
     in »da«/»ne«, da so odgovori v bazi primerljivi ne glede na jezik. */
  const namig = p?.namig ?? v.namig;

  return <div className="vpr-vp">
    <label htmlFor={`vpr-${v.id}`}>{p?.q ?? v.q}</label>

    {v.vrsta === 'izbira' && v.izbire ? (
      <div className="vpr-izbire">
        {v.izbire.map((x, i) => (
          <button key={x} type="button" className={vrednost === x ? 'on' : ''}
            onClick={() => naVrednost(vrednost === x ? '' : x)}>
            <i>{crka(i)}</i><span>{p?.izbire?.[i] ?? x}</span>
          </button>
        ))}
      </div>
    ) : v.vrsta === 'daNe' ? (
      <>
        <div className="vpr-izbire">
          {(['da', 'ne'] as const).map((x, i) => (
            <button key={x} type="button" className={vrednost === x ? 'on' : ''}
              onClick={() => naVrednost(vrednost === x ? '' : x)}>
              <i>{crka(i)}</i><span>{x === 'da' ? L('da', 'yes') : L('ne', 'no')}</span>
            </button>
          ))}
        </div>
        {vrednost === 'da' && (
          <input className="vpr-dopolnilo" value={dopolnilo} onChange={e => naDopolnilo(e.target.value)}
            placeholder={(p?.dopolnilo ?? v.dopolnilo) || L('Koliko?', 'How much?')} />
        )}
      </>
    ) : v.vrsta === 'besedilo' ? (
      <textarea id={`vpr-${v.id}`} rows={3} value={vrednost} onChange={e => naVrednost(e.target.value)} />
    ) : (
      <input id={`vpr-${v.id}`} value={vrednost} onChange={e => naVrednost(e.target.value)}
        inputMode={v.vrsta === 'znesek' || v.vrsta === 'stevilo' ? 'decimal' : undefined}
        placeholder={v.vrsta === 'znesek' || v.vrsta === 'stevilo' ? namig || '' : ''} />
    )}

    {/* Kratke enote (EUR, let) so v polju; daljsi namigi pod poljem, da ostanejo
        vidni tudi med tipkanjem in se ne prikazejo dvakrat (Tina, 3. 9. 2026). */}
    {namig && (v.vrsta === 'kratko' || v.vrsta === 'besedilo') && (
      <small>{namig}</small>
    )}
  </div>;
}

/* Slogi so tu in ne v modulu, ker je stran samostojna in mora biti berljiva
   tudi, ce se katera globalna datoteka ne nalozi. Serif prek --font-serif-flow:
   samostojne strani sicer padejo na Bodoni. */
const slog = `
  .vpr { max-width: 46rem; margin: 0 auto; padding: 2rem 1.2rem 7rem; color: var(--ink, #1c1518); }
  .vpr-glava { display: flex; align-items: center; gap: .9rem; margin-bottom: 1.6rem; }
  .vpr-glava :global(span) { flex: none; }
  .vpr-kdo { margin: 0 0 .15rem; font-size: .72rem; font-weight: 600; letter-spacing: .16em;
             text-transform: uppercase; color: color-mix(in oklch, var(--ink, #1c1518) 60%, transparent); }
  .vpr-glava h1 { margin: 0; font-family: var(--font-serif-flow), Georgia, serif;
                  font-size: clamp(1.5rem, 4.5vw, 2.1rem); line-height: 1.15; font-weight: 500; }
  .vpr-jezik { margin-left: auto; align-self: flex-start; display: flex; gap: .4rem;
               font-size: .72rem; font-weight: 600; letter-spacing: .12em;
               color: color-mix(in oklch, var(--ink, #1c1518) 45%, transparent); }
  .vpr-jezik a { color: inherit; text-decoration: none; padding: .2rem .1rem; }
  .vpr-jezik a[aria-current] { color: var(--ink, #1c1518); border-bottom: 2px solid var(--purple, #7C3AED); }

  .vpr-uvod { margin-bottom: 1.8rem; padding: 1.1rem 1.2rem; border-radius: 1rem;
              background: color-mix(in oklch, var(--ink, #1c1518) 4%, transparent); }
  .vpr-uvod p { margin: 0 0 .7rem; font-size: .92rem; line-height: 1.65; }
  .vpr-uvod p:last-child { margin-bottom: 0; }
  .vpr-tiho { color: color-mix(in oklch, var(--ink, #1c1518) 65%, transparent); font-size: .86rem; }

  .vpr-napredek { display: flex; align-items: center; gap: .8rem; margin-bottom: 1.4rem; }
  .vpr-crta { flex: 1; height: 3px; border-radius: 3px;
              background: color-mix(in oklch, var(--ink, #1c1518) 10%, transparent); overflow: hidden; }
  .vpr-crta i { display: block; height: 100%; background: var(--purple, #7C3AED); transition: width .3s ease; }
  .vpr-napredek span { flex: none; font-size: .74rem; font-weight: 600; letter-spacing: .08em;
                       color: color-mix(in oklch, var(--ink, #1c1518) 60%, transparent); }

  .vpr-sklop h2 { margin: 0 0 1.2rem; font-family: var(--font-serif-flow), Georgia, serif;
                  font-size: 1.4rem; font-weight: 500; }

  .vpr-vp { margin-bottom: 1.5rem; }
  .vpr-vp label { display: block; margin-bottom: .5rem; font-size: .95rem; line-height: 1.45; font-weight: 500; }
  .vpr-vp small { display: block; margin-top: .35rem; font-size: .78rem;
                  color: color-mix(in oklch, var(--ink, #1c1518) 58%, transparent); }
  .vpr-vp input, .vpr-vp textarea {
    box-sizing: border-box; width: 100%; min-height: 2.9rem; padding: .7rem .9rem;
    border: 1px solid color-mix(in oklch, var(--ink, #1c1518) 14%, transparent);
    border-radius: .8rem; background: #fff; color: var(--ink, #1c1518);
    font: 400 .95rem/1.5 inherit; }
  .vpr-vp textarea { resize: vertical; }
  .vpr-vp input:focus, .vpr-vp textarea:focus {
    outline: none; border-color: var(--purple, #7C3AED);
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--purple, #7C3AED) 18%, transparent); }
  .vpr-dopolnilo { margin-top: .55rem; }

  .vpr-izbire { display: flex; flex-direction: column; gap: .45rem; }
  .vpr-izbire button {
    display: flex; align-items: center; gap: .8rem; width: 100%; min-height: 3.1rem;
    padding: .7rem .9rem; text-align: left; cursor: pointer;
    border: 1px solid color-mix(in oklch, var(--ink, #1c1518) 12%, transparent);
    border-radius: .9rem; background: #fff; color: var(--ink, #1c1518);
    font: 500 .95rem/1.4 inherit; transition: border-color .15s, background .15s; }
  .vpr-izbire button i {
    flex: none; display: inline-flex; align-items: center; justify-content: center;
    width: 1.7rem; height: 1.7rem; border-radius: .55rem; font-style: normal;
    font-size: .78rem; font-weight: 700;
    background: color-mix(in oklch, var(--ink, #1c1518) 7%, transparent); }
  .vpr-izbire button:hover { border-color: color-mix(in oklch, var(--ink, #1c1518) 30%, transparent); }
  .vpr-izbire button.on { border-color: var(--purple, #7C3AED);
                          background: color-mix(in oklch, var(--purple, #7C3AED) 7%, #fff); }
  .vpr-izbire button.on i { background: var(--purple, #7C3AED); color: #fff; }

  .vpr-napaka { margin: .8rem 0 0; font-size: .85rem; color: var(--red, #B3261E); }
  .vpr-zasebnost { max-width: 46rem; margin: 0 auto 1rem; text-align: center; font-size: .76rem;
                   color: color-mix(in oklch, var(--ink, #1c1518) 55%, transparent); }
  .vpr-zasebnost a { color: inherit; text-decoration: underline; text-underline-offset: .15em; }
  .vpr-soglasje { display: flex; align-items: flex-start; gap: .55rem; margin-top: .3rem;
                  font-size: .84rem; line-height: 1.5; cursor: pointer; }
  .vpr-soglasje input { margin-top: .2rem; flex: none; width: 1.05rem; height: 1.05rem; accent-color: var(--purple, #7C3AED); }
  .vpr-soglasje a { color: var(--purple, #7C3AED); }

  .vpr-noga { position: fixed; left: 0; right: 0; bottom: 0; z-index: 5;
              display: flex; align-items: center; justify-content: space-between; gap: 1rem;
              max-width: 46rem; margin: 0 auto;
              padding: .9rem 1.2rem calc(.9rem + env(safe-area-inset-bottom, 0px));
              background: color-mix(in oklch, var(--paper, #faf7f2) 92%, transparent);
              backdrop-filter: blur(10px);
              border-top: 1px solid color-mix(in oklch, var(--ink, #1c1518) 8%, transparent); }
  .vpr-noga button { min-height: 2.9rem; padding: .7rem 1.4rem; border-radius: 999px;
                     font: 700 .82rem inherit; cursor: pointer; }
  .vpr-nazaj { border: 1px solid color-mix(in oklch, var(--ink, #1c1518) 18%, transparent);
               background: transparent; color: var(--ink, #1c1518); }
  .vpr-nazaj:disabled { opacity: .35; cursor: default; }
  .vpr-naprej { border: 0; background: var(--ink, #1c1518); color: var(--paper, #faf7f2); }
  .vpr-naprej:disabled { opacity: .5; cursor: default; }

  .vpr-konec { text-align: center; padding: 3rem 0; }
  .vpr-konec :global(span) { margin: 0 auto; }
  .vpr-konec h1 { margin: 1rem 0 .6rem; font-family: var(--font-serif-flow), Georgia, serif;
                  font-size: 2rem; font-weight: 500; }
  .vpr-konec p { max-width: 34rem; margin: 0 auto; font-size: .95rem; line-height: 1.65;
                 color: color-mix(in oklch, var(--ink, #1c1518) 75%, transparent); }
  .vpr-primerjava { max-width: 26rem; margin: 1.6rem auto 0; padding: 1.1rem 1.3rem;
                    border-radius: 1rem; text-align: left;
                    background: color-mix(in oklch, var(--purple, #7C3AED) 6%, var(--paper, #faf7f2));
                    border: 1px solid color-mix(in oklch, var(--purple, #7C3AED) 20%, transparent); }
  .vpr-primerjava-vp { margin: 0 0 .5rem; font-size: .78rem; font-weight: 600;
                       color: color-mix(in oklch, var(--ink, #1c1518) 65%, transparent); }
  .vpr-primerjava-tvoja { margin: 0 0 .4rem; font-size: .95rem; }
  .vpr-primerjava-tvoja b { font-variant-numeric: tabular-nums; }
  .vpr-primerjava-izid { margin: 0 0 .6rem; font-size: .88rem; line-height: 1.55; }
  .vpr-primerjava-trg { margin: 0; padding-top: .6rem; font-size: .8rem;
                        border-top: 1px solid color-mix(in oklch, var(--purple, #7C3AED) 15%, transparent);
                        color: color-mix(in oklch, var(--ink, #1c1518) 65%, transparent); }
`;
