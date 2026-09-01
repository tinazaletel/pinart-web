'use client';

/* ZAPOREDJE SPOROČIL — panel s svojim stanjem.
 *
 * Zakaj svoja komponenta: ko je osnutek živel v starševski komponenti, je vsaka
 * tipka izrisala cel Marketing, polje pod prsti pa je izgubilo fokus — »napišem
 * črko in me vrže ven« (Tina, 1. 9. 2026). Tu osnutek pripada panelu; tipkanje
 * torej ne izriše ničesar zunaj njega, starš pa dobi podatke šele ob shranjevanju.
 *
 * Panel gre v portal na <body> (sicer ga ujame prednik z transform in je
 * odrezan zgoraj), nima pa samodejnega prevzema fokusa — ta je pisanje lomil.
 */

import { useEffect, useState } from 'react';
import { ArrowRight, CheckSquare, Plus, Trash } from '@phosphor-icons/react';
import type { KampanjaKorak, MarketingStatus, MarketingVrsta } from '@/lib/marketing';
import DokPanel from './DokPanel';

export type Zaporedje = {
  id?: string;
  naslov: string;
  vrsta: MarketingVrsta;
  status: MarketingStatus;
  datumOd: string;
  projekt: string;
  opis: string;
  koraki: KampanjaKorak[];
};

type Props = {
  odprt: boolean;
  zacetno: Zaporedje;
  projekti: Array<{ id: string; naslov: string }>;
  jeEn?: boolean;
  napaka?: string;
  onZapri: () => void;
  onShrani: (z: Zaporedje) => void;
  onNaloga: (korak: KampanjaKorak, zap: Zaporedje) => string | null;
  onSporocilo: (korak: KampanjaKorak, zap: Zaporedje) => void;
};

export default function MarketingZaporedjePanel({
  odprt, zacetno, projekti, jeEn = false, napaka,
  onZapri, onShrani, onNaloga, onSporocilo,
}: Props) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [z, setZ] = useState<Zaporedje>(zacetno);

  /* Ob vsakem odprtju vzamemo sveže izhodišče; med tipkanjem se ne dotikamo. */
  useEffect(() => {
    if (!odprt) return;
    setZ(zacetno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odprt, zacetno]);

  useEffect(() => {
    if (!odprt) return;
    const naTipko = (e: KeyboardEvent) => { if (e.key === 'Escape') onZapri(); };
    window.addEventListener('keydown', naTipko);
    return () => window.removeEventListener('keydown', naTipko);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odprt]);

  if (!odprt) return null;

  /* Iz zamika naredimo pravi datum: »0 · takoj« sama po sebi ni povedala
     ničesar (Tina, 1. 9. 2026: »kaj pomeni ta takoj«). */
  const datumKoraka = (zamikDni: number) => {
    if (!z.datumOd) return '';
    const d = new Date(`${z.datumOd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + zamikDni);
    return d.toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const uredi = (i: number, del: Partial<KampanjaKorak>) =>
    setZ(s => ({ ...s, koraki: s.koraki.map((x, j) => (j === i ? { ...x, ...del } : x)) }));

  return (
    <DokPanel
      odprt={odprt}
      jeEn={jeEn}
      nadnaslov={L('ZAPOREDJE SPOROČIL', 'MESSAGE SEQUENCE')}
      naslov={z.naslov || L('Nova kampanja', 'New campaign')}
      pupaDelo={z.naslov
        ? L(`pripravljaš kampanjo »${z.naslov}«`, `preparing the “${z.naslov}” campaign`)
        : L('pripravljaš novo kampanjo', 'preparing a new campaign')}
      onZapri={onZapri}
      dejanja={<>
        <button className="mz-tiho" type="button" onClick={onZapri}>{L('Prekliči', 'Cancel')}</button>
        <button className="mz-glavni" type="button" onClick={() => onShrani(z)}>{L('Shrani kampanjo', 'Save campaign')}</button>
      </>}
    >
      <div className="mz-vsebina">
          <div className="mz-meta">
            <label>{L('Ime kampanje', 'Campaign name')}
              <input value={z.naslov} autoComplete="off" onChange={e => setZ({ ...z, naslov: e.target.value })} />
            </label>
            <label>{L('Začetek', 'Start')}
              <input type="date" value={z.datumOd} onChange={e => setZ({ ...z, datumOd: e.target.value })} />
            </label>
            <label>Status
              <select value={z.status} onChange={e => setZ({ ...z, status: e.target.value as MarketingStatus })}>
                <option value="osnutek">{L('Osnutek', 'Draft')}</option>
                <option value="nacrtovano">{L('Načrtovano', 'Planned')}</option>
                <option value="aktivno">{L('Aktivno', 'Active')}</option>
                <option value="zakljuceno">{L('Zaključeno', 'Done')}</option>
              </select>
            </label>
            <label>{L('Projekt', 'Project')}
              <select value={z.projekt} onChange={e => setZ({ ...z, projekt: e.target.value })}>
                <option value="">{L('Brez projekta', 'No project')}</option>
                {projekti.map(p => <option key={p.id} value={p.id}>{p.naslov}</option>)}
              </select>
            </label>
          </div>

          <ol className="mz-koraki">
            {z.koraki.map((k, i) => (
              <li key={i}>
                <div className="mz-rok">
                  <input type="number" min={0} value={k.zamikDni}
                    onChange={e => uredi(i, { zamikDni: Math.max(0, Number(e.target.value) || 0) })} />
                  <span>
                    {L('dni po začetku', 'days after start')}
                    {datumKoraka(k.zamikDni) && (
                      <b>{k.zamikDni === 0 ? L('· na dan začetka, ', '· on the start date, ') : '· '}{datumKoraka(k.zamikDni)}</b>
                    )}
                  </span>
                  <button type="button" onClick={() => setZ(s => ({ ...s, koraki: s.koraki.filter((_, j) => j !== i) }))}
                    aria-label={L('Odstrani korak', 'Remove step')}><Trash size={17} /></button>
                </div>
                <input className="mz-naslov" value={k.naslov} autoComplete="off"
                  placeholder={L('Naslov sporočila', 'Message title')}
                  onChange={e => uredi(i, { naslov: e.target.value })} />
                <textarea rows={3} value={k.besedilo} placeholder={L('Kaj sporočilo pove', 'What the message says')}
                  onChange={e => uredi(i, { besedilo: e.target.value })} />
                <div className="mz-izhodi">
                  <button type="button" disabled={Boolean(k.nalogaId)}
                    onClick={() => { const id = onNaloga(k, z); if (id) uredi(i, { nalogaId: id }); }}>
                    <CheckSquare size={15} />
                    {k.nalogaId ? L('Naloga ustvarjena', 'Task created') : L('Ustvari nalogo', 'Create task')}
                  </button>
                  <button type="button" onClick={() => onSporocilo(k, z)}>
                    <ArrowRight size={15} /> {L('Pripravi sporočilo', 'Prepare message')}
                  </button>
                </div>
              </li>
            ))}
          </ol>

          {napaka && <p className="mz-napaka" role="alert">{napaka}</p>}

          <button className="mz-dodaj" type="button"
            onClick={() => setZ(s => ({
              ...s,
              koraki: [...s.koraki, { zamikDni: (s.koraki.length ? Math.max(...s.koraki.map(x => x.zamikDni)) : 0) + 7, naslov: '', besedilo: '' }],
            }))}>
            <Plus size={17} /> {L('Dodaj korak', 'Add step')}
          </button>
      </div>
      <style jsx>{`
        /* Obrazec: polja brez skatel, crta se pokaze ob dotiku. */
        .mz-vsebina { min-width: 0; }
        .mz-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem 1.6rem; }
        .mz-meta > label { min-width: 0; display: grid; gap: .2rem;
                           font: 800 .6rem var(--font-sans), sans-serif; letter-spacing: .18em;
                           text-transform: uppercase; color: rgba(17,17,17,.38); }
        /* Pravi inputi, kot povsod v Flowu — ne crte pod besedilom
           (Tina, 1. 9. 2026: »crt ne uporabljamo, ampak imamo inpute«). */
        /* Velikosti so iz panela vprašalnikov (.vpp-vnos), da so polja povsod
           enaka: padding .6/.8rem, radij .7rem, pisava .92rem. Select dobi se
           izrecno visino, ker je sicer v Safariju nizji od inputa
           (Tina, 1. 9. 2026). */
        .mz-meta input, .mz-meta select {
          width: 100%; box-sizing: border-box; height: 2.5rem; padding: .6rem .8rem;
          border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .7rem; background: #fff;
          font: inherit; font-size: .92rem; color: #1a1a1a;
          transition: border-color .18s ease, box-shadow .18s ease;
        }
        /* Panel visi v portalu na <body>, torej zunaj .shell, kjer aplikacija
           odstrani sistemski videz izbirnika. Brez tega Safari nariše svojo
           kontrolo in radij se razlikuje od inputov (Tina, 1. 9. 2026). */
        .mz-meta select {
          appearance: none; -webkit-appearance: none;
          padding-right: 2.4rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='m5 7.5 5 5 5-5' fill='none' stroke='%231c1815' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right .7rem center;
        }
        .mz-meta input:hover, .mz-meta select:hover { border-color: rgba(17,17,17,.24); }
        .mz-meta input:focus, .mz-meta select:focus { outline: none; border-color: oklch(66% .2 297);
          box-shadow: 0 0 0 3px color-mix(in oklch, oklch(66% .2 297) 12%, transparent); }

        /* Panel kaze DOKUMENT, ki nastaja: nacrt kampanje kot stran s stevilcenimi
           koraki. Mehurcki ostanejo tam, kjer je pogovor — v levem stolpcu
           (Tina, 1. 9. 2026). */
        .mz-koraki { list-style: none; counter-reset: korak; margin: 2rem 0 1rem; padding: 0; display: grid; gap: 1.7rem; }
        .mz-koraki li { counter-increment: korak; display: grid; gap: .4rem;
                        padding-top: 1.5rem; border-top: 1px solid rgba(17,17,17,.08); }
        .mz-koraki li:first-child { padding-top: 0; border-top: 0; }
        .mz-koraki li::before {
          content: counter(korak, decimal-leading-zero);
          font: 800 .68rem var(--font-sans), sans-serif; letter-spacing: .16em;
          color: color-mix(in oklch, oklch(60% .2 297) 75%, transparent);
        }

        .mz-rok { display: flex; align-items: center; gap: .55rem; }
        .mz-rok input { width: 3.4rem; height: 2.1rem; padding: .3rem .4rem;
                        border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .6rem; background: #fff;
                        font: inherit; font-size: .88rem; font-weight: 700; color: #1a1a1a; text-align: center; }
        .mz-rok input:focus { outline: none; border-color: oklch(66% .2 297);
                              box-shadow: 0 0 0 3px color-mix(in oklch, oklch(66% .2 297) 12%, transparent); }
        .mz-rok span { display: inline-flex; flex-wrap: wrap; gap: .35rem;
                       font: 700 .66rem var(--font-sans), sans-serif; letter-spacing: .14em;
                       text-transform: uppercase; color: rgba(17,17,17,.42); }
        .mz-rok span b { font-weight: 800; text-transform: none; letter-spacing: 0; color: rgba(17,17,17,.6); }
        .mz-rok > button { margin-left: auto; display: grid; place-items: center; width: 2rem; height: 2rem;
                           border: 0; border-radius: 50%; background: none; color: rgba(17,17,17,.3); cursor: pointer;
                           opacity: 0; transition: opacity .15s ease, color .15s ease; }
        .mz-koraki li:hover .mz-rok > button, .mz-rok > button:focus-visible { opacity: 1; }
        .mz-rok > button:hover { color: oklch(52% .17 25); }

        .mz-naslov { width: 100%; box-sizing: border-box; height: 2.5rem; padding: .6rem .8rem;
                     border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .7rem; background: #fff;
                     font: inherit; font-size: .95rem; font-weight: 650; color: var(--ink, #1a1a1a); }
        .mz-naslov::placeholder { color: rgba(17,17,17,.35); }
        .mz-koraki textarea { width: 100%; box-sizing: border-box; padding: .6rem .8rem;
                              border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .7rem;
                              background: #fff; resize: vertical; font: inherit; font-size: .92rem;
                              line-height: 1.55; color: rgba(17,17,17,.8); }
        .mz-naslov:focus, .mz-koraki textarea:focus { outline: none; border-color: oklch(66% .2 297);
                              box-shadow: 0 0 0 3px color-mix(in oklch, oklch(66% .2 297) 12%, transparent); }
        .mz-koraki textarea::placeholder { color: rgba(17,17,17,.35); }

        .mz-izhodi { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: .3rem; }
        .mz-izhodi button { display: inline-flex; align-items: center; gap: .35rem; padding: 0; border: 0; background: none;
                            font: 700 .82rem var(--font-sans), sans-serif; color: rgba(17,17,17,.5); cursor: pointer;
                            transition: color .15s ease; }
        .mz-izhodi button:hover:not(:disabled) { color: oklch(45% .18 297); }
        .mz-izhodi button:disabled { opacity: .45; cursor: default; }

        .mz-napaka { margin: 1rem 0 0; font: 600 .88rem var(--font-sans), sans-serif; color: oklch(52% .17 25); }

        .mz-dodaj { display: inline-flex; align-items: center; gap: .4rem; margin-top: 1.4rem; padding: 0;
                    border: 0; background: none; font: 700 .88rem var(--font-sans), sans-serif;
                    color: rgba(17,17,17,.5); cursor: pointer; }
        .mz-dodaj:hover { color: oklch(45% .18 297); }

        .mz-tiho { border: 0; background: none; padding: 0; font: 700 .88rem var(--font-sans), sans-serif;
                   color: rgba(17,17,17,.5); cursor: pointer; }
        .mz-tiho:hover { color: #1a1a1a; }
        .mz-glavni { padding: .8rem 1.5rem; border: 0; border-radius: 999px; background: #111; color: #fff;
                     font: 750 .88rem var(--font-sans), sans-serif; cursor: pointer;
                     transition: transform .18s ease, box-shadow .18s ease; }
        .mz-glavni:hover { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(35,18,45,.22); }

        /* Telefon: zaporedje zgoraj, pogovor prilepljen na dno kot v sporocilih. */
        @media (max-width: 900px) {
          .mz-stolpca { grid-template-columns: 1fr; gap: 1.4rem; }
          .mz-obrazec { order: 1; }
          .mz-klepet { order: 2; position: sticky; bottom: 0; z-index: 2;
                       margin: 0 clamp(-2.6rem, -3vw, -1.4rem); padding: .9rem clamp(1.4rem, 3vw, 2.6rem) 1rem;
                       background: rgba(255,255,255,.94); backdrop-filter: blur(18px);
                       -webkit-backdrop-filter: blur(18px); border-top: 1px solid rgba(17,17,17,.07); }
          .mz-niti { max-height: 22vh; }
          .mz-pupa-glava { display: none; }
          .mz-meta { grid-template-columns: 1fr; }
          .mz-rok > button { opacity: 1; }
        }
      `}</style>
    </DokPanel>
  );
}
