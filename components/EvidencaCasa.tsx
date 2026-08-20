'use client';

/* EVIDENCA DELOVNEGA ČASA (ZEPDSV) — mesečna tabela
   ================================================
   Ena vrstica na koledarski dan, stolpci Datum / Prihod / Odmor / Odhod / Ure /
   Vrsta / Opomba. Vnos mora biti HITER: klik v celico, natipkaš "830", tab
   naprej. Zato ni modalnih oken, ni gumba "shrani" in ni obrazca na dan —
   vsaka celica se zapiše, ko iz nje odideš.

   Tabela je narejena za TISK: čista stran, brez canvasa. V @media print
   izginejo krmilni gumbi in izbira meseca, ostane samo tabela z vsotami —
   inšpektor lahko dobi papir, računovodstvo pa CSV.

   Izračuni in prazniki so v lib/evidencaCasa.ts, sinhronizacija v
   lib/evidencaCasaOblak.ts. Ta datoteka je samo prikaz. */

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { CaretLeft, CaretRight, DownloadSimple, Printer, X } from '@phosphor-icons/react';
import {
  DOGODEK, VRSTE_DNEVA, dneviMeseca, imeDneva, imeMeseca, imePraznika, izbrisiDan,
  jeVikend, minuteDela, nadureDneva, mesecniPovzetek, normalizirajUro, prazenDan,
  preberiEvidenco, shraniDan, trajanje, vCsv, vrstaLabel,
  type DelovniDan, type VrstaDneva,
} from '@/lib/evidencaCasa';

type Osnutek = Partial<Pick<DelovniDan, 'prihod' | 'odhod' | 'opomba'>> & { odmor?: string };

export default function EvidencaCasa() {
  const locale = useLocale();
  const jeEn = locale === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  /* Trenutni mesec se NE sme izračunati med izrisom — new Date() na strežniku in
     v brskalniku data različen HTML in Next javi "Text does not match". Zato
     ostane null do montaže in tabela se izriše šele takrat. */
  const [obdobje, setObdobje] = useState<{ leto: number; mesec: number } | null>(null);
  const [dnevi, setDnevi] = useState<DelovniDan[]>([]);
  /* Kar je uporabnik natipkal, a še ni zapustil celice. Ločeno od shranjenega,
     da tipkanje ne sproži zapisa ob vsaki tipki. */
  const [osnutek, setOsnutek] = useState<Record<string, Osnutek>>({});

  useEffect(() => {
    const zdaj = new Date();
    setObdobje({ leto: zdaj.getFullYear(), mesec: zdaj.getMonth() + 1 });
    setDnevi(preberiEvidenco());
    /* Ko sinhronizacija iz oblaka prepiše localStorage, osveži prikaz. */
    const osvezi = () => setDnevi(preberiEvidenco());
    window.addEventListener(DOGODEK, osvezi);
    return () => window.removeEventListener(DOGODEK, osvezi);
  }, []);

  const zapisi = useMemo(() => new Map(dnevi.map(d => [d.datum, d])), [dnevi]);
  const vrstice = useMemo(
    () => (obdobje ? dneviMeseca(obdobje.leto, obdobje.mesec) : []),
    [obdobje],
  );
  const povzetek = useMemo(
    () => (obdobje ? mesecniPovzetek(obdobje.leto, obdobje.mesec, dnevi) : null),
    [obdobje, dnevi],
  );

  /* Prikazana vrednost vrstice = shranjeno, prekrito z osnutkom v urejanju. */
  const dan = (datum: string): DelovniDan => {
    const shranjen = zapisi.get(datum) || prazenDan(datum);
    const o = osnutek[datum];
    if (!o) return shranjen;
    return {
      ...shranjen,
      prihod: o.prihod !== undefined ? o.prihod : shranjen.prihod,
      odhod: o.odhod !== undefined ? o.odhod : shranjen.odhod,
      odmorMinute: o.odmor !== undefined ? Math.max(0, Number(o.odmor) || 0) : shranjen.odmorMinute,
      opomba: o.opomba !== undefined ? o.opomba : shranjen.opomba,
    };
  };

  /* Odmor je edino številsko polje: prazno in "0" nista isto, zato ga beremo
     iz osnutka dobesedno, ne prek dan() (kjer bi 0 padla v prazen niz). */
  const odmorPrikaz = (datum: string): string => {
    const vnos = osnutek[datum]?.odmor;
    if (vnos !== undefined) return vnos;
    const shranjen = zapisi.get(datum)?.odmorMinute;
    return shranjen ? String(shranjen) : '';
  };

  const tipkaj = (datum: string, polje: keyof Osnutek, vrednost: string) =>
    setOsnutek(prej => ({ ...prej, [datum]: { ...prej[datum], [polje]: vrednost } }));

  /* Zapis ob izgubi fokusa: normaliziraj uro ("830" -> "08:30"), shrani, počisti
     osnutek. Kar se ne da prebrati, se ne zapiše — v zakonski evidenci je prazno
     polje boljše od izmišljenega podatka. */
  const shrani = (datum: string) => {
    const trenutni = dan(datum);
    const ocisceni: DelovniDan = {
      datum,
      prihod: normalizirajUro(trenutni.prihod || '') || undefined,
      odhod: normalizirajUro(trenutni.odhod || '') || undefined,
      odmorMinute: Math.max(0, Math.round(Number(trenutni.odmorMinute) || 0)),
      vrsta: trenutni.vrsta,
      opomba: (trenutni.opomba || '').trim() || undefined,
    };
    setDnevi(shraniDan(ocisceni));
    setOsnutek(prej => {
      const kopija = { ...prej };
      delete kopija[datum];
      return kopija;
    });
  };

  const nastaviVrsto = (datum: string, vrsta: VrstaDneva) => {
    const trenutni = dan(datum);
    setDnevi(shraniDan({ ...trenutni, vrsta }));
  };

  const pocisti = (datum: string) => {
    setOsnutek(prej => {
      const kopija = { ...prej };
      delete kopija[datum];
      return kopija;
    });
    setDnevi(izbrisiDan(datum));
  };

  const premakniMesec = (korak: number) => setObdobje(prej => {
    if (!prej) return prej;
    const skupaj = prej.leto * 12 + (prej.mesec - 1) + korak;
    return { leto: Math.floor(skupaj / 12), mesec: (skupaj % 12) + 1 };
  });

  const izvoziCsv = () => {
    if (!obdobje) return;
    const csv = vCsv(obdobje.leto, obdobje.mesec, dnevi, jeEn);
    /* BOM, sicer slovenski Excel razbije šumnike */
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidenca-delovnega-casa-${obdobje.leto}-${String(obdobje.mesec).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!obdobje || !povzetek) {
    return <section className="ec-ovoj"><p className="ec-nalaganje">{L('Nalagam evidenco …', 'Loading records …')}</p>
      <style jsx>{`
        .ec-ovoj { padding: 1.2rem 0 3rem; }
        .ec-nalaganje { color: #1a1420; font-weight: 400; margin: 0; }
      `}</style>
    </section>;
  }

  const nadureSkupaj = povzetek.nadureDnevne;

  return (
    <section className="ec-ovoj">
      {/* ── KRMILNA VRSTICA (v tisku izgine) ─────────────────────────────── */}
      <div className="ec-krmilo">
        <div className="ec-mesec">
          <button type="button" onClick={() => premakniMesec(-1)} aria-label={L('Prejšnji mesec', 'Previous month')}>
            <CaretLeft size={16} weight="bold" />
          </button>
          <select
            value={obdobje.mesec}
            onChange={e => setObdobje({ ...obdobje, mesec: Number(e.target.value) })}
            aria-label={L('Mesec', 'Month')}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{imeMeseca(m, jeEn)}</option>
            ))}
          </select>
          <input
            type="number"
            className="ec-leto"
            value={obdobje.leto}
            min={2000}
            max={2100}
            onChange={e => setObdobje({ ...obdobje, leto: Number(e.target.value) || obdobje.leto })}
            aria-label={L('Leto', 'Year')}
          />
          <button type="button" onClick={() => premakniMesec(1)} aria-label={L('Naslednji mesec', 'Next month')}>
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
        <div className="ec-dejanja">
          <button type="button" className="ec-gumb" onClick={izvoziCsv}>
            <DownloadSimple size={16} weight="bold" />{L('Izvozi CSV', 'Export CSV')}
          </button>
          <button type="button" className="ec-gumb ec-gumb-tih" onClick={() => window.print()}>
            <Printer size={16} weight="bold" />{L('Natisni', 'Print')}
          </button>
        </div>
      </div>

      {/* Naslov je viden tudi na papirju — izpis brez obdobja ni evidenca. */}
      <h2 className="ec-naslov">
        {L('Evidenca delovnega časa', 'Working time records')} — {imeMeseca(obdobje.mesec, jeEn)} {obdobje.leto}
      </h2>

      <div className="ec-tabela-ovoj">
        <table className="ec-tabela">
          <thead>
            <tr>
              <th scope="col" className="ec-l">{L('Datum', 'Date')}</th>
              <th scope="col">{L('Prihod', 'Start')}</th>
              <th scope="col">{L('Odmor', 'Break')}</th>
              <th scope="col">{L('Odhod', 'End')}</th>
              <th scope="col">{L('Ure', 'Hours')}</th>
              <th scope="col" className="ec-l">{L('Vrsta', 'Type')}</th>
              <th scope="col" className="ec-l">{L('Opomba', 'Note')}</th>
              <th scope="col" className="ec-brez-tiska" aria-label={L('Počisti', 'Clear')} />
            </tr>
          </thead>
          <tbody>
            {vrstice.map(datum => {
              const d = dan(datum);
              const praznik = imePraznika(datum, jeEn);
              const tih = jeVikend(datum) || Boolean(praznik);
              const minute = minuteDela(d);
              const nadure = nadureDneva(d);
              const imaZapis = zapisi.has(datum);
              return (
                <tr key={datum} className={tih ? 'ec-tih' : ''}>
                  <th scope="row" className="ec-datum">
                    <b>{Number(datum.slice(8, 10))}. {imeMeseca(obdobje.mesec, jeEn).slice(0, 3)}</b>
                    <span>{imeDneva(datum, jeEn)}</span>
                  </th>
                  <td>
                    <input
                      className="ec-celica"
                      inputMode="numeric"
                      placeholder="8:00"
                      value={d.prihod || ''}
                      onChange={e => tipkaj(datum, 'prihod', e.target.value)}
                      onBlur={() => shrani(datum)}
                      aria-label={`${L('Prihod', 'Start')} ${datum}`}
                    />
                  </td>
                  <td>
                    <input
                      className="ec-celica ec-ozka"
                      inputMode="numeric"
                      placeholder="30"
                      value={odmorPrikaz(datum)}
                      onChange={e => tipkaj(datum, 'odmor', e.target.value.replace(/[^\d]/g, ''))}
                      onBlur={() => shrani(datum)}
                      aria-label={`${L('Odmor v minutah', 'Break in minutes')} ${datum}`}
                    />
                  </td>
                  <td>
                    <input
                      className="ec-celica"
                      inputMode="numeric"
                      placeholder="16:00"
                      value={d.odhod || ''}
                      onChange={e => tipkaj(datum, 'odhod', e.target.value)}
                      onBlur={() => shrani(datum)}
                      aria-label={`${L('Odhod', 'End')} ${datum}`}
                    />
                  </td>
                  <td className="ec-ure">
                    {minute > 0 ? trajanje(minute) : '—'}
                    {nadure > 0 && <em title={L('Nadure nad 8 ur', 'Overtime over 8 hours')}>+{trajanje(nadure)}</em>}
                  </td>
                  <td>
                    <select
                      className="ec-celica ec-vrsta"
                      value={d.vrsta}
                      onChange={e => nastaviVrsto(datum, e.target.value as VrstaDneva)}
                      aria-label={`${L('Vrsta dneva', 'Day type')} ${datum}`}
                    >
                      {VRSTE_DNEVA.map(v => <option key={v} value={v}>{vrstaLabel(v, jeEn)}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      className="ec-celica ec-siroka"
                      placeholder={praznik || L('razlog, pripomba …', 'reason, note …')}
                      value={d.opomba || ''}
                      onChange={e => tipkaj(datum, 'opomba', e.target.value)}
                      onBlur={() => shrani(datum)}
                      aria-label={`${L('Opomba', 'Note')} ${datum}`}
                    />
                  </td>
                  <td className="ec-brez-tiska">
                    {imaZapis && (
                      <button
                        type="button"
                        className="ec-pocisti"
                        onClick={() => pocisti(datum)}
                        aria-label={`${L('Počisti dan', 'Clear day')} ${datum}`}
                        title={L('Počisti dan', 'Clear day')}
                      >
                        <X size={13} weight="bold" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={4} className="ec-l">{L('Skupaj v mesecu', 'Monthly total')}</th>
              <td className="ec-ure ec-vsota">{trajanje(povzetek.minute)}</td>
              <td colSpan={3} className="ec-l" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── VSOTE ────────────────────────────────────────────────────────── */}
      <div className="ec-vsote">
        <div className="ec-kartica"><span>{L('Skupaj ur', 'Total hours')}</span><b>{trajanje(povzetek.minute)}</b></div>
        <div className="ec-kartica"><span>{L('Od tega nadure (nad 8 h/dan)', 'Of which overtime (over 8 h/day)')}</span><b className={nadureSkupaj > 0 ? 'ec-poudarek' : ''}>{trajanje(nadureSkupaj)}</b></div>
        <div className="ec-kartica"><span>{L('Nadure nad 40 h/teden', 'Overtime over 40 h/week')}</span><b className={povzetek.nadureTedenske > 0 ? 'ec-poudarek' : ''}>{trajanje(povzetek.nadureTedenske)}</b></div>
        <div className="ec-kartica"><span>{L('Dnevi dopusta', 'Annual leave days')}</span><b>{povzetek.dniDopusta}</b></div>
        <div className="ec-kartica"><span>{L('Dnevi bolniške', 'Sick leave days')}</span><b>{povzetek.dniBolniske}</b></div>
        <div className="ec-kartica"><span>{L('Nedeljsko delo', 'Sunday work')}</span><b>{trajanje(povzetek.nedeljskeMinute)}</b></div>
        <div className="ec-kartica"><span>{L('Praznično delo', 'Public holiday work')}</span><b>{trajanje(povzetek.praznicneMinute)}</b></div>
        <div className="ec-kartica"><span>{L('Nočne ure (22–6)', 'Night hours (22–6)')}</span><b>{trajanje(povzetek.nocneMinute)}</b></div>
      </div>

      <p className="ec-opomba">
        {L(
          'Tedenske nadure se štejejo po ISO tednih; teden, ki sega v dva meseca, je štet cel. Podatek vpiši sproti, kot se je zgodil — zakon ne dovoljuje zaokroževanja ali pavšalov.',
          'Weekly overtime is counted by ISO weeks; a week spanning two months is counted in full. Enter data as it happens — the law does not allow rounding or lump sums.',
        )}
      </p>

      <style jsx>{`
        .ec-ovoj { --ec-vijola: #6E4FA6; --ec-ink: #1a1420; --ec-line: rgba(20,16,30,.12);
          --ec-napaka: #a4342a; --ec-uspeh: #2F5D50; padding: .4rem 0 3rem; color: var(--ec-ink); }

        .ec-krmilo { display: flex; flex-wrap: wrap; gap: .8rem; align-items: center;
          justify-content: space-between; margin-bottom: 1.1rem; }
        .ec-mesec { display: flex; align-items: center; gap: .4rem; }
        .ec-mesec button { display: grid; place-items: center; width: 34px; height: 34px; cursor: pointer;
          border: 1px solid var(--ec-line); border-radius: 10px; background: #fff; color: var(--ec-ink); }
        .ec-mesec button:hover { border-color: var(--ec-vijola); color: var(--ec-vijola); }
        .ec-mesec select, .ec-leto { height: 34px; border: 1px solid var(--ec-line); border-radius: 10px;
          background: #fff; color: var(--ec-ink); font-size: .95rem; font-weight: 500; padding: 0 .6rem; }
        .ec-leto { width: 5.2rem; }
        .ec-mesec select { min-width: 8.5rem; }

        .ec-dejanja { display: flex; gap: .5rem; }
        .ec-gumb { display: inline-flex; align-items: center; gap: .4rem; cursor: pointer; border: none;
          background: var(--ec-vijola); color: #fff; font-size: .9rem; font-weight: 600;
          padding: .55rem 1rem; border-radius: 10px; }
        .ec-gumb:hover { filter: brightness(1.08); }
        .ec-gumb-tih { background: #fff; color: var(--ec-vijola); border: 1px solid var(--ec-line); }
        .ec-gumb-tih:hover { border-color: var(--ec-vijola); filter: none; }

        .ec-naslov { font-size: 1.05rem; font-weight: 600; margin: 0 0 .7rem; color: var(--ec-ink); }

        .ec-tabela-ovoj { overflow-x: auto; border: 1px solid var(--ec-line); border-radius: 14px; background: #fff; }
        .ec-tabela { width: 100%; border-collapse: collapse; font-size: .93rem; min-width: 44rem; }
        .ec-tabela th, .ec-tabela td { padding: .32rem .55rem; text-align: center;
          border-bottom: 1px solid var(--ec-line); color: var(--ec-ink); }
        .ec-tabela thead th { font-size: .74rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
          color: var(--ec-vijola); background: rgba(110,79,166,.06); padding: .55rem; white-space: nowrap; }
        .ec-l { text-align: left; }

        /* Vikendi in prazniki: tišji, a NE bledo besedilo — v evidenci mora biti
           vsak podatek berljiv. Razliko nosi ozadje in navpična črtica, ne barva teksta. */
        .ec-tih { background: rgba(110,79,166,.045); }
        .ec-tih .ec-datum { box-shadow: inset 2px 0 0 var(--ec-vijola); }

        .ec-datum { text-align: left; white-space: nowrap; font-weight: 500; }
        .ec-datum b { font-weight: 600; }
        .ec-datum span { display: inline-block; margin-left: .4rem; font-size: .8rem;
          font-weight: 500; color: var(--ec-vijola); }

        .ec-celica { width: 4.6rem; height: 30px; text-align: center; font-size: .92rem; font-weight: 500;
          color: var(--ec-ink); background: transparent; border: 1px solid transparent; border-radius: 8px;
          font-family: inherit; }
        .ec-celica::placeholder { color: rgba(26,20,32,.45); }
        .ec-celica:hover { border-color: var(--ec-line); }
        .ec-celica:focus { outline: none; border-color: var(--ec-vijola);
          box-shadow: 0 0 0 2px rgba(110,79,166,.16); background: #fff; }
        .ec-ozka { width: 3.4rem; }
        .ec-siroka { width: 100%; min-width: 8rem; text-align: left; padding: 0 .4rem; }
        .ec-vrsta { width: 7.6rem; text-align: left; padding: 0 .3rem; cursor: pointer; }

        .ec-ure { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
        .ec-ure em { display: inline-block; margin-left: .35rem; font-style: normal; font-size: .78rem;
          font-weight: 600; color: var(--ec-napaka); }
        .ec-vsota { font-size: 1rem; color: var(--ec-uspeh); }
        .ec-tabela tfoot th, .ec-tabela tfoot td { border-bottom: none; padding: .7rem .55rem;
          font-weight: 600; background: rgba(110,79,166,.06); }

        .ec-pocisti { display: grid; place-items: center; width: 22px; height: 22px; cursor: pointer;
          border: none; background: transparent; color: var(--ec-napaka); border-radius: 6px; opacity: .6; }
        .ec-pocisti:hover { opacity: 1; background: rgba(164,52,42,.1); }

        .ec-vsote { display: grid; gap: .6rem; margin-top: 1.1rem;
          grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); }
        .ec-kartica { border: 1px solid var(--ec-line); border-radius: 12px; padding: .7rem .85rem; background: #fff; }
        .ec-kartica span { display: block; font-size: .78rem; font-weight: 500; color: var(--ec-ink);
          margin-bottom: .25rem; }
        .ec-kartica b { font-size: 1.25rem; font-weight: 600; color: var(--ec-vijola);
          font-variant-numeric: tabular-nums; }
        .ec-poudarek { color: var(--ec-napaka); }

        .ec-opomba { margin: 1rem 0 0; font-size: .84rem; font-weight: 400; line-height: 1.5;
          color: var(--ec-ink); max-width: 46rem; }

        @media (max-width: 640px) {
          .ec-krmilo { gap: .6rem; }
          .ec-dejanja { width: 100%; }
          .ec-gumb { flex: 1; justify-content: center; }
        }

        /* TISK: čist list — brez gumbov, brez okvirjev polj, tabela čez celo stran
           in vrstica dneva se ne lomi čez dve strani. */
        @media print {
          .ec-krmilo, .ec-brez-tiska { display: none !important; }
          .ec-ovoj { padding: 0; }
          .ec-tabela-ovoj { border: none; border-radius: 0; overflow: visible; }
          .ec-tabela { min-width: 0; font-size: .8rem; }
          .ec-tabela thead th { background: transparent; color: #000; border-bottom: 1.5px solid #000; }
          .ec-tih { background: transparent; }
          .ec-celica, .ec-vrsta { border: none !important; box-shadow: none !important;
            background: transparent !important; -webkit-appearance: none; appearance: none; }
          .ec-tabela tr { break-inside: avoid; }
          .ec-vsote { break-inside: avoid; }
        }
      `}</style>
    </section>
  );
}
