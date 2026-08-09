'use client';

/* ARHIV FILTER — SKUPNA orodna vrstica za VSE arhive (projekti, ponudbe,
   pogodbe, racuni). Povsod isti videz in isti vrstni red:
     iskalnik → datum (od–do) → status → akcijski gumb.

   NAMIZJE (>=641px): vse v ENI vrsti, brez velikih oznak STATUS/OBDOBJE.
     [🔍 iskalnik (flex:1)] [📅 24.7.2026 – 24.7.2026] [status <select>] [akcija]
     flex-wrap poskrbi za lep prelom pri ozkem namizju; min-width:0 povsod.
     Datum je diskreten sprozilec (ikona + slovensko besedilo); klik odpre
     PRAVI KOLEDAR RAZPONA (KoledarRazpon) kot popover pod gumbom.
   MOBILNO (<=640px): strnjeno — [🔍][filtri] … [akcija]; lupa razsiri input
     cez vrstico, gumb Filtri odpre spodnji sheet (portal na body) z
     obdobjem (koledar razpona INLINE, ne popover) in status dropdownom.

   Datum = KoledarRazpon (od–do v enem koledarju: prvi klik = od, drugi
   klik = do). Vec NI native <input type="date"> — brskalnikov format
   (Safari = MM/DD/YYYY) je zbegal, zato je bil ze prej prekrit s slovenskim
   zapisom; zdaj je cel koledar nas, tako da je vedenje (teden od ponedeljka,
   skok po mesecih/letih, oznaceni razpon) enotno v vseh brskalnikih.
   Filtriranje: prazno od/do ne omejuje.

   Status = PODATKOVNI prop (statusOpcije/statusVrednost/onStatus), NE gotov
   element. ArhivFilter sam izrise: na NAMIZJU kompakten <select> (chevron),
   na MOBILNEM v Filtri sheetu tappable seznam vrstic (isti .af-sheet vzorec).
   Tako je vedenje enotno povsod, brez podvajanja. Prva opcija = Vse/Vsi =
   brez filtra.

   Sheet MORA biti v portalu na document.body: transform na prednikih
   (animacije sekcij) ukrade sidro position:fixed — znana past.

   Barve: SAMO style-guide tokeni (var(--ink), var(--accent), var(--paper))
   in njihov color-mix; z fallbacki, ker sheet zivi v portalu izven .shell.
   .shell ima agresivna pravila (input font 16px !important, select chevron),
   zato so namizni popravki visje specificni + kjer je treba !important. Stili
   so samostojni (prefiks af-), brez odvisnosti od pregled.module.css. */

import { useLocale } from 'next-intl';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, FunnelSimple, MagnifyingGlass } from '@phosphor-icons/react';
import KoledarRazpon from '@/components/KoledarRazpon';

type StatusOpcija = { vrednost: string; oznaka: string };

type Props = {
  iskanje: string;
  onIskanje: (vrednost: string) => void;
  placeholder?: string;
  /* DATUM lasti vrstica, da sta vrstni red in videz povsod enaka. Samo od–do
     (koledar razpona); prazno od/do ne omejuje. */
  datumOd: string;
  datumDo: string;
  onDatumOd: (vrednost: string) => void;
  onDatumDo: (vrednost: string) => void;
  /* STATUS (neobvezno) — podatkovni prop; vrstica sama izrise select/seznam.
     Prva opcija naj bo Vse/Vsi = brez filtra. */
  statusOpcije?: StatusOpcija[];
  statusVrednost?: string;
  onStatus?: (vrednost: string) => void;
  statusOznaka?: string;
  /* stevilo aktivnih filtrov — stevec na gumbu Filtri */
  aktivnihFiltrov?: number;
  onPocisti?: () => void;
  /* trailing gumb, npr. <Link>+ Nova ponudba</Link> */
  akcija?: ReactNode;
};

export default function ArhivFilter({ iskanje, onIskanje, placeholder, datumOd, datumDo, onDatumOd, onDatumDo, statusOpcije, statusVrednost, onStatus, statusOznaka = 'Status', aktivnihFiltrov = 0, onPocisti, akcija }: Props) {
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);
  const ph = placeholder ?? L('Poišči …', 'Search …');
  const [iskanjeOdprto, setIskanjeOdprto] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [koledarOdprt, setKoledarOdprt] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const datumRef = useRef<HTMLDivElement | null>(null);

  /* autofocus ob razsiritvi — sele po animaciji sirine se input ne premika pod prstom */
  useEffect(() => { if (iskanjeOdprto) inputRef.current?.focus(); }, [iskanjeOdprto]);

  /* namizni popover koledarja: klik zunaj ali Escape zapre (isti vzorec kot IzbirnikDrzave) */
  useEffect(() => {
    if (!koledarOdprt) return;
    const klik = (e: MouseEvent) => { if (datumRef.current && !datumRef.current.contains(e.target as Node)) setKoledarOdprt(false); };
    const tipka = (e: KeyboardEvent) => { if (e.key === 'Escape') setKoledarOdprt(false); };
    document.addEventListener('mousedown', klik);
    document.addEventListener('keydown', tipka);
    return () => { document.removeEventListener('mousedown', klik); document.removeEventListener('keydown', tipka); };
  }, [koledarOdprt]);

  /* slovenski zapis brez vodilnih nicel/presledkov: "24.7.2026" */
  const formatSl = (iso: string) => { const d = iso ? iso.split('-') : []; return d.length === 3 ? `${Number(d[2])}.${Number(d[1])}.${d[0]}` : ''; };
  /* prikazno besedilo sprozilca: prazno -> "Vsi datumi"; sicer slovenski razpon
     (ce manjka "do" -> "…" namesto drugega datuma, in obratno); besedilo je
     v obeh primerih enak mehak siv ton (glej .af-datum-tekst) */
  const datumBesedilo = (): string => {
    if (!datumOd && !datumDo) return L('Vsi datumi', 'All dates');
    if (datumOd && datumDo) return `${formatSl(datumOd)} – ${formatSl(datumDo)}`;
    if (datumOd) return `${formatSl(datumOd)} – …`;
    return `… – ${formatSl(datumDo)}`;
  };
  const datumTekst = datumBesedilo();

  return <div className="af">
    <div className="af-vrstica">
      {/* MOBILNO (<=640): kompaktni ikoni + prekrivni iskalnik + akcija; sheet spodaj.
          display:contents -> otroci ostanejo v af-vrstici (af-iskanje absolute
          se sidra na af-vrstico), na namizju cel blok skrijemo. */}
      <div className="af-mob">
        <button type="button" className="af-krog" aria-label={L('Išči', 'Search')} aria-expanded={iskanjeOdprto} onClick={() => setIskanjeOdprto(true)}>
          <MagnifyingGlass size={17} />
          {iskanje.trim() !== '' && <span className="af-stevec" aria-hidden>1</span>}
        </button>
        <button type="button" className="af-krog" aria-label={L('Filtri', 'Filters')} aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)}>
          <FunnelSimple size={17} />
          {aktivnihFiltrov > 0 && <span className="af-stevec" aria-hidden>{aktivnihFiltrov}</span>}
        </button>
        {akcija && <span className="af-mob-akcija">{akcija}</span>}
        <div className={'af-iskanje' + (iskanjeOdprto ? ' odprt' : '')} aria-hidden={!iskanjeOdprto}>
          <MagnifyingGlass size={16} aria-hidden />
          <input ref={inputRef} type="search" value={iskanje} onChange={event => onIskanje(event.target.value)} placeholder={ph} aria-label={ph} tabIndex={iskanjeOdprto ? 0 : -1} />
          <button type="button" className="af-iskanje-x" aria-label={L('Zapri iskanje', 'Close search')} tabIndex={iskanjeOdprto ? 0 : -1} onClick={() => { onIskanje(''); setIskanjeOdprto(false); }}>✕</button>
        </div>
      </div>

      {/* NAMIZJE (>640): vse v vrsti, brez oznak skupin.
          vrstni red: iskalnik → datum → status dropdown → akcija */}
      <div className="af-namizje">
        <span className="af-poln">
          <MagnifyingGlass size={16} aria-hidden />
          <input type="search" value={iskanje} onChange={event => onIskanje(event.target.value)} placeholder={ph} aria-label={ph} />
        </span>
        <div className="af-datum" ref={datumRef}>
          <button type="button" className="af-datum-sprozilec" aria-haspopup="dialog" aria-expanded={koledarOdprt} aria-label={L('Izberi obdobje', 'Select period')} onClick={() => setKoledarOdprt(v => !v)}>
            <span className="af-kolgumb" aria-hidden><CalendarPlus size={16} /></span>
            <span className="af-datum-tekst">{datumTekst}</span>
          </button>
          {koledarOdprt && (
            <div className="af-datum-popover" role="dialog" aria-label={L('Izbira obdobja', 'Period selection')}>
              <KoledarRazpon od={datumOd} do={datumDo} onOd={onDatumOd} onDo={onDatumDo} onZapri={() => setKoledarOdprt(false)} />
            </div>
          )}
        </div>
        {statusOpcije && <div className="af-status">
          <FunnelSimple size={15} aria-hidden className="af-status-ikona" />
          <select className="af-select" aria-label={statusOznaka} value={statusVrednost} onChange={event => onStatus?.(event.target.value)}>
            {statusOpcije.map(o => <option key={o.vrednost} value={o.vrednost}>{o.oznaka}</option>)}
          </select>
        </div>}
        {akcija && <div className="af-akcija">{akcija}</div>}
      </div>
    </div>

    {typeof document !== 'undefined' && createPortal(
      <>
        {sheet && <div className="af-zastor" onClick={() => setSheet(false)} aria-hidden />}
        <div className={'af-sheet' + (sheet ? ' odprt' : '')} role="dialog" aria-label={L('Filtri', 'Filters')} aria-hidden={!sheet}>
          <div className="af-glava"><b>{L('Filtri', 'Filters')}</b><button type="button" className="af-sheet-x" onClick={() => setSheet(false)} aria-label={L('Zapri', 'Close')}>✕</button></div>
          <div className="af-vsebina">
            <div className="af-sk">
              <span className="af-sk-oznaka">{L('Obdobje', 'Period')}</span>
              {/* mobilno: koledar razpona INLINE (namesto native polj); "Koncano" zapre cel sheet */}
              <div className="af-sheet-datum">
                <KoledarRazpon od={datumOd} do={datumDo} onOd={onDatumOd} onDo={onDatumDo} onZapri={() => setSheet(false)} />
              </div>
            </div>
            {statusOpcije && <div className="af-sk">
              <span className="af-sk-oznaka">{statusOznaka}</span>
              <div className="af-status-list" role="group" aria-label={statusOznaka}>
                {statusOpcije.map(o => (
                  <button key={o.vrednost} type="button" className={'af-p' + (statusVrednost === o.vrednost ? ' on' : '')} aria-pressed={statusVrednost === o.vrednost} onClick={() => onStatus?.(o.vrednost)}>{o.oznaka}</button>
                ))}
              </div>
            </div>}
          </div>
          {onPocisti && <div className="af-noga">
            <button type="button" className="af-pocisti" aria-label={L('Počisti filtre', 'Clear filters')} onClick={onPocisti}>{L('Počisti filtre', 'Clear filters')}</button>
          </div>}
        </div>
      </>,
      document.body,
    )}

    <style>{`
      .af{position:relative;width:100%;min-width:0}
      .af-vrstica{position:relative;display:flex;align-items:center;gap:.6rem;min-height:2.75rem;min-width:0}
      /* privzeto (mobilno) = kompaktni ikoni; namizni blok skrit */
      .af-mob{display:contents}
      .af-mob-akcija{margin-left:auto;display:inline-flex;align-items:center;gap:.4rem;min-width:0}
      .af-namizje{display:none}
      /* NAMIZJE: vse vidno v eni vrsti, iskalnik → datum → status → akcija */
      @media (min-width:641px){
        .af-mob{display:none}
        .af-namizje{display:flex;flex:1 1 auto;flex-wrap:wrap;align-items:center;gap:.5rem .7rem;min-width:0}
        /* POENOTENA VIŠINA vseh elementov vrstice (iskalnik/datum/status/akcija),
           da niso različno visoki; box-sizing, da padding ne razbije višine */
        .af-poln,.af-datum-sprozilec,.af-status,.af-akcija > *{height:2.75rem;box-sizing:border-box;display:inline-flex;align-items:center}
        .af-akcija > *{white-space:nowrap}
        .af-sheet,.af-zastor{display:none !important}
        /* iskalnik ne raste greedy cez cel prostor -> max-width, da vrstica ni predolga/zbita */
        .af-poln{flex:1 1 11rem;max-width:17rem;min-width:0;display:flex;align-items:center;gap:.45rem;box-sizing:border-box;background-color:color-mix(in oklch,var(--paper,#fff) 85%,transparent);border:1px solid color-mix(in oklch,var(--ink,#111) 16%,transparent);border-radius:999px;padding:0 .95rem;color:color-mix(in oklch,var(--ink,#111) 50%,transparent)}
        .af-poln:focus-within{border-color:var(--ink,#111);box-shadow:0 0 0 2.5px color-mix(in oklch,var(--purple,oklch(66% 0.2 297)) 42%,transparent)}
        .af-poln input{flex:1;min-width:0;border:none;background:none;font:inherit;font-weight:500;color:var(--ink,#111);padding:.62rem .25rem}
        .af-poln input:focus{outline:none;box-shadow:none}
        .af-poln input::placeholder{color:color-mix(in oklch,var(--ink,#111) 45%,transparent)}
        /* datum: sprozilec (ikona + slovensko besedilo) + koledar kot popover pod njim */
        .af-datum{position:relative;flex:0 0 auto;min-width:0;display:inline-flex}
        .af-akcija{margin-left:auto;display:inline-flex;align-items:center;gap:.5rem;flex:0 0 auto;min-width:0}
        /* status dropdown kompakten na namizju (premaga .shell font 16px) */
        .af .af-namizje .af-select{font-size:.85rem !important;padding:.5rem 1.5rem .5rem .1rem !important;background-position:right 0 center !important;background-size:.95rem !important}
      }

      /* ── DATUM SPROZILEC (namizje): cela pilula je gumb — enak jezik kot
         iskalnik/status (rob+ozadje+radius), afordanca pride iz roba/hoverja
         pilule, NE iz kroga okrog ikone (ikona ostane mirna/svetla). Klik
         odpre koledar kot popover pod njim ── */
      .af-datum-sprozilec{display:inline-flex;align-items:center;gap:.5rem;min-width:0;box-sizing:border-box;border:1px solid color-mix(in oklch,var(--ink,#111) 18%,transparent);background-color:color-mix(in oklch,var(--paper,#fff) 85%,transparent);border-radius:999px;padding:.55rem .95rem;font:inherit;color:inherit;cursor:pointer;transition:border-color .15s,background-color .15s}
      .af-datum-sprozilec:hover{border-color:var(--ink,#111);background-color:color-mix(in oklch,var(--paper,#fff) 70%,transparent)}
      .af-kolgumb{display:inline-flex;align-items:center;justify-content:center;flex:none;color:color-mix(in oklch,var(--ink,#111) 55%,transparent);transition:color .15s}
      .af-datum-sprozilec:hover .af-kolgumb{color:var(--ink,#111)}
      .af-datum-tekst{font-size:.85rem;font-weight:500;color:color-mix(in oklch,var(--ink,#111) 45%,transparent);white-space:nowrap}
      .af-datum-popover{position:absolute;top:calc(100% + .5rem);left:0;z-index:40;border-radius:16px;border:1px solid color-mix(in oklch,var(--ink,#111) 14%,transparent);box-shadow:0 18px 44px color-mix(in oklch,var(--ink,#111) 20%,transparent);overflow:hidden}
      /* mobilni sheet: koledar razpona inline v lastnem zaobljenem okvirju (namesto native polj) */
      .af-sheet-datum{display:flex;justify-content:center;margin-top:.15rem;border:1px solid color-mix(in oklch,var(--ink,#111) 14%,transparent);border-radius:16px;overflow:hidden}
      .af-sheet-datum .kol{width:100%;padding-left:.5rem;padding-right:.5rem}

      /* ── STATUS: zaobljena pilula (kot iskalnik/datum) — [funnel ikona] [select] [chevron].
         Select sam nima vec lastnega roba/ozadja (tega da pilula), appearance:none +
         lasten chevron kot background-image, da se puscica ne izgubi (past .shell select). ── */
      .af-status{display:inline-flex;align-items:center;gap:.4rem;flex:0 1 auto;min-width:0;box-sizing:border-box;border:1px solid color-mix(in oklch,var(--ink,#111) 18%,transparent);background-color:color-mix(in oklch,var(--paper,#fff) 85%,transparent);border-radius:999px;padding:0 .5rem 0 .85rem;transition:border-color .15s}
      .af-status:focus-within{border-color:var(--ink,#111)}
      .af-status-ikona{flex:none;margin-right:.35rem;color:color-mix(in oklch,var(--ink,#111) 55%,transparent)}
      .af-select{min-width:0;max-width:100%;box-sizing:border-box;font:inherit;font-weight:600;color:var(--ink,#111);border:none;border-radius:999px;padding:.55rem 1.6rem .55rem .15rem;background-color:transparent;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='m5 7.5 5 5 5-5' fill='none' stroke='%231c1815' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 0 center;background-size:1rem;-webkit-appearance:none;appearance:none;cursor:pointer}
      .af-select:focus{outline:none}
      /* mobilni sheet: status kot tappable seznam pilul (namesto native selecta) */
      .af-status-list{display:flex;flex-wrap:wrap;gap:.4rem}
      .af-p{padding:.5rem .85rem;border:1px solid color-mix(in oklch,var(--ink,#111) 20%,transparent);border-radius:999px;background-color:color-mix(in oklch,var(--paper,#fff) 55%,transparent);cursor:pointer;font:inherit;font-size:.86rem;color:var(--ink,#111);transition:border-color .15s,background-color .15s,color .15s}
      .af-p:hover{border-color:var(--ink,#111)}
      .af-p.on{border-color:var(--accent,#B25476);background-color:var(--accent,#B25476);color:var(--paper,#fff);font-weight:600}

      /* ── akcijski gumb (skupni videz, npr. + Nova ponudba) ── */
      .af-akcija-gumb{display:inline-flex;align-items:center;justify-content:center;gap:.3rem;white-space:nowrap;padding:.7rem 1.1rem;border:none;border-radius:999px;background-color:var(--ink,#111);color:var(--paper,#fff);font:inherit;font-size:.82rem;font-weight:700;text-decoration:none;cursor:pointer;transition:transform .15s,opacity .15s}
      .af-akcija-gumb:hover{transform:translateY(-1px);opacity:.92}
      @media (max-width:640px){
        .af-akcija-dodaj{width:2.75rem;height:2.75rem;flex:none;padding:0;gap:0;font-size:0}
        .af-akcija-dodaj::before{content:'+';font-size:1.5rem;font-weight:800;line-height:1}
      }

      .af-krog{position:relative;display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;padding:0;border:1px solid color-mix(in oklch,var(--ink,#111) 18%,transparent);border-radius:50%;background-color:color-mix(in oklch,var(--paper,#fff) 70%,transparent);color:var(--ink,#111);cursor:pointer;transition:background-color .15s,color .15s}
      .af-krog:hover{background-color:var(--ink,#111);color:var(--paper,#fff)}
      .af-stevec{position:absolute;top:-.3rem;right:-.3rem;min-width:1.05rem;height:1.05rem;padding:0 .25rem;border-radius:999px;background-color:var(--accent,#B25476);color:var(--paper,#fff);font-size:.62rem;font-weight:800;display:grid;place-items:center;line-height:1}
      /* razsirjeno iskanje: pilula cez CELO vrstico (animacija sirine iz leve) */
      .af-iskanje{position:absolute;inset:0;z-index:3;display:flex;align-items:center;gap:.45rem;box-sizing:border-box;background-color:color-mix(in oklch,var(--paper,#fff) 97%,transparent);border:1px solid color-mix(in oklch,var(--ink,#111) 16%,transparent);border-radius:999px;padding:0 .3rem 0 .85rem;color:color-mix(in oklch,var(--ink,#111) 55%,transparent);opacity:0;pointer-events:none;clip-path:inset(0 100% 0 0 round 999px);transition:clip-path .26s cubic-bezier(.2,.8,.3,1),opacity .18s}
      .af-iskanje.odprt{opacity:1;pointer-events:auto;clip-path:inset(0 0 0 0 round 999px)}
      .af-iskanje:focus-within{border-color:var(--purple,oklch(66% 0.2 297));box-shadow:inset 0 0 0 1.5px color-mix(in oklch,var(--purple,oklch(66% 0.2 297)) 55%,transparent)}
      @media (prefers-reduced-motion:reduce){.af-iskanje{transition:none}}
      .af-iskanje svg{flex:none}
      .af-iskanje input{flex:1;min-width:0;min-height:2.2rem;border:none;background:none;font:inherit;font-size:16px;font-weight:500;color:var(--ink,#111);padding:.45rem .25rem}
      .af-iskanje input:focus{outline:none;box-shadow:none}
      .af-iskanje input::placeholder{color:color-mix(in oklch,var(--ink,#111) 45%,transparent)}
      .af-iskanje-x{flex:none;width:2.1rem;height:2.1rem;display:inline-flex;align-items:center;justify-content:center;border:none;background-color:color-mix(in oklch,var(--ink,#111) 6%,transparent);border-radius:50%;font-size:1rem;line-height:1;color:var(--ink,#111);cursor:pointer}
      .af-iskanje-x:hover{background-color:var(--ink,#111);color:var(--paper,#fff)}

      /* sheet z dna — enak videz kot Oblikovanje/Podpis sheet pri pogodbah */
      .af-zastor{position:fixed;inset:0;background-color:color-mix(in oklch,var(--ink,#111) 34%,transparent);z-index:95}
      .af-sheet{position:fixed;left:50%;bottom:0;transform:translate(-50%,102%);width:min(480px,100vw);z-index:96;background-color:var(--paper,#fff);border-radius:20px 20px 0 0;box-shadow:0 -16px 44px color-mix(in oklch,var(--ink,#111) 22%,transparent);transition:transform .32s cubic-bezier(.2,.8,.3,1);max-height:76dvh;overflow-y:auto;padding:0 1.2rem calc(1.4rem + env(safe-area-inset-bottom,0px))}
      .af-sheet.odprt{transform:translate(-50%,0)}
      @media (prefers-reduced-motion:reduce){.af-sheet{transition:none}}
      .af-glava{position:relative;display:flex;align-items:center;justify-content:space-between;width:100%;padding:1.35rem 0 .65rem;border-bottom:1px solid color-mix(in oklch,var(--ink,#111) 10%,transparent)}
      .af-glava::before{content:'';position:absolute;top:.5rem;left:50%;transform:translateX(-50%);width:2.4rem;height:.3rem;border-radius:999px;background-color:color-mix(in oklch,var(--ink,#111) 18%,transparent)}
      .af-glava b{font-size:1.05rem;font-weight:700}
      .af-sheet-x{width:2.1rem;height:2.1rem;display:inline-flex;align-items:center;justify-content:center;border:none;background-color:color-mix(in oklch,var(--ink,#111) 6%,transparent);border-radius:50%;font-size:1.1rem;line-height:1;color:var(--ink,#111);cursor:pointer}
      .af-vsebina{display:grid;gap:1.1rem;padding:1rem 0 .4rem}
      /* v sheetu SMEJO biti drobni podnaslovi (na namizju jih ni) */
      .af-sk{display:grid;gap:.55rem;min-width:0}
      .af-sk-oznaka{font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in oklch,var(--ink,#111) 55%,transparent)}
      .af-noga{display:flex;justify-content:flex-start;padding:.4rem 0 .2rem;border-top:1px solid color-mix(in oklch,var(--ink,#111) 8%,transparent);margin-top:.4rem}
      .af-pocisti{margin-top:.6rem;padding:.5rem 1rem;border:1px solid color-mix(in oklch,var(--ink,#111) 20%,transparent);border-radius:999px;background-color:color-mix(in oklch,var(--paper,#fff) 50%,transparent);font:inherit;font-size:.86rem;color:var(--ink,#111);cursor:pointer;transition:border-color .15s,background-color .15s,color .15s}
      .af-pocisti:hover{border-color:var(--ink,#111)}
    `}</style>
  </div>;
}
