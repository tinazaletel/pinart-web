'use client';

/* KOLEDAR RAZPONA — mesečna mreža za izbiro OD–DO v enem koledarju (namesto
   dveh native <input type="date">). Prvi klik na dan nastavi "od" (in
   počisti "do"); drugi klik nastavi "do" (če je za "od") ali postane nov
   "od" (če je pred trenutnim "od"). Med izbiro je cel razpon obarvan,
   robna dneva (od/do) sta polno poudarjena.

   Datumi so ISO nizi "YYYY-MM-DD" brez ur — string primerjava (>=, <, ===)
   deluje pravilno, ker je format fiksne dolžine. Zavestno BREZ knjižnic
   (date-fns ipd.): Date uporabimo samo za sestavljanje mreže dneva v
   mesecu, vedno v LOKALNEM času (getFullYear/getMonth/getDate), da ne
   pride do zamika čez polnoč (UTC bi dan lahko premaknil). */

import { useState } from 'react';

type Props = {
  od: string;
  do: string;
  onOd: (iso: string) => void;
  onDo: (iso: string) => void;
  onZapri?: () => void;
};

const MESECI = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september', 'oktober', 'november', 'december'];
const DNI_KRATICE = ['Po', 'To', 'Sr', 'Če', 'Pe', 'So', 'Ne'];

function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
function toIso(leto: number, mesec: number, dan: number): string { return `${leto}-${pad(mesec + 1)}-${pad(dan)}`; }
/* razčleni "YYYY-MM-DD" -> {leto, mesec (0-indeksiran), dan}; neveljavno -> null */
function parseIso(iso: string): { leto: number; mesec: number; dan: number } | null {
  const deli = iso ? iso.split('-') : [];
  if (deli.length !== 3) return null;
  const leto = Number(deli[0]), mesec = Number(deli[1]) - 1, dan = Number(deli[2]);
  if (!Number.isFinite(leto) || !Number.isFinite(mesec) || !Number.isFinite(dan)) return null;
  return { leto, mesec, dan };
}
function danesIso(): string {
  const d = new Date();
  return toIso(d.getFullYear(), d.getMonth(), d.getDate());
}
/* ponedeljek = 0 ... nedelja = 6 (native getDay() ima nedeljo = 0) */
function tedenskiIndeks(datum: Date): number { return (datum.getDay() + 6) % 7; }

export default function KoledarRazpon({ od, do: doDatum, onOd, onDo, onZapri }: Props) {
  /* prikazani mesec/leto -> začni pri "do", sicer "od", sicer danes */
  const zacetni = parseIso(doDatum) || parseIso(od) || parseIso(danesIso())!;
  const [prikazLeto, setPrikazLeto] = useState(zacetni.leto);
  const [prikazMesec, setPrikazMesec] = useState(zacetni.mesec);

  const danes = danesIso();

  function prejsnjiMesec() { if (prikazMesec === 0) { setPrikazMesec(11); setPrikazLeto(l => l - 1); } else setPrikazMesec(m => m - 1); }
  function naslednjiMesec() { if (prikazMesec === 11) { setPrikazMesec(0); setPrikazLeto(l => l + 1); } else setPrikazMesec(m => m + 1); }
  function prejsnjeLeto() { setPrikazLeto(l => l - 1); }
  function naslednjeLeto() { setPrikazLeto(l => l + 1); }

  function klikDan(iso: string) {
    /* brez "od" ALI je razpon že popoln (oba nastavljena) -> začni nov razpon */
    if (!od || (od && doDatum)) { onOd(iso); onDo(''); return; }
    /* "od" nastavljen, "do" prazen */
    if (iso >= od) onDo(iso);
    else onOd(iso); /* klik pred "od" -> postane nov "od" */
  }

  /* sestavi mrežo dni tekočega meseca + vodilne/zaključne dni sosednjih mesecev (sivi) */
  const prviDan = new Date(prikazLeto, prikazMesec, 1);
  const vodilnihPraznih = tedenskiIndeks(prviDan);
  const dniVMesecu = new Date(prikazLeto, prikazMesec + 1, 0).getDate();
  const skupajCelic = Math.ceil((vodilnihPraznih + dniVMesecu) / 7) * 7;

  const celice: { iso: string; dan: number; vMesecu: boolean }[] = [];
  /* zaključni dnevi prejšnjega meseca */
  const dniPrejsnjegaMeseca = new Date(prikazLeto, prikazMesec, 0).getDate();
  for (let i = 0; i < vodilnihPraznih; i++) {
    const dan = dniPrejsnjegaMeseca - vodilnihPraznih + 1 + i;
    const m = prikazMesec === 0 ? 11 : prikazMesec - 1;
    const l = prikazMesec === 0 ? prikazLeto - 1 : prikazLeto;
    celice.push({ iso: toIso(l, m, dan), dan, vMesecu: false });
  }
  for (let dan = 1; dan <= dniVMesecu; dan++) celice.push({ iso: toIso(prikazLeto, prikazMesec, dan), dan, vMesecu: true });
  let naslednjiDan = 1;
  while (celice.length < skupajCelic) {
    const m = prikazMesec === 11 ? 0 : prikazMesec + 1;
    const l = prikazMesec === 11 ? prikazLeto + 1 : prikazLeto;
    celice.push({ iso: toIso(l, m, naslednjiDan), dan: naslednjiDan, vMesecu: false });
    naslednjiDan++;
  }

  return <div className="kol">
    <div className="kol-glava">
      <button type="button" className="kol-nav kol-nav-leto" aria-label="Prejšnje leto" onClick={prejsnjeLeto}>«</button>
      <button type="button" className="kol-nav" aria-label="Prejšnji mesec" onClick={prejsnjiMesec}>‹</button>
      <span className="kol-naslov">{MESECI[prikazMesec]} {prikazLeto}</span>
      <button type="button" className="kol-nav" aria-label="Naslednji mesec" onClick={naslednjiMesec}>›</button>
      <button type="button" className="kol-nav kol-nav-leto" aria-label="Naslednje leto" onClick={naslednjeLeto}>»</button>
    </div>

    <div className="kol-dnevi-glava" aria-hidden>
      {DNI_KRATICE.map(d => <span key={d}>{d}</span>)}
    </div>

    <div className="kol-mreza">
      {celice.map(({ iso, dan, vMesecu }) => {
        if (!vMesecu) return <span key={iso} className="kol-dan kol-zunaj" aria-hidden>{dan}</span>;
        const jeOd = iso === od;
        const jeDo = iso === doDatum;
        const vRazponu = !!(od && doDatum && iso > od && iso < doDatum);
        const jeDanes = iso === danes;
        const razred = ['kol-dan', 'kol-klik', jeOd || jeDo ? 'kol-rob' : '', vRazponu ? 'kol-obmocje' : '', jeDanes ? 'kol-danes' : ''].filter(Boolean).join(' ');
        return (
          <button key={iso} type="button" className={razred} aria-pressed={jeOd || jeDo} aria-label={iso} onClick={() => klikDan(iso)}>
            {dan}
          </button>
        );
      })}
    </div>

    <div className="kol-noga">
      <button type="button" className="kol-pocisti" onClick={() => { onOd(''); onDo(''); }}>Počisti</button>
      <button type="button" className="kol-koncano" onClick={() => onZapri?.()}>Končano</button>
    </div>

    <style jsx>{`
      .kol{width:min(320px,92vw);box-sizing:border-box;padding:.9rem .8rem 1rem;background-color:var(--paper,#fff);color:var(--ink,#111);border-radius:16px}
      .kol-glava{display:flex;align-items:center;justify-content:center;gap:.15rem;margin-bottom:.6rem}
      .kol-naslov{flex:1 1 auto;text-align:center;font-size:.92rem;font-weight:700}
      .kol-nav{flex:none;width:1.9rem;height:1.9rem;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line,color-mix(in oklch,var(--ink,#111) 16%,transparent));border-radius:50%;background:none;color:var(--ink,#111);font-size:.9rem;line-height:1;cursor:pointer;transition:background-color .15s,color .15s}
      .kol-nav:hover{background-color:var(--ink,#111);color:var(--paper,#fff)}
      .kol-nav-leto{font-size:.78rem}
      .kol-dnevi-glava{display:grid;grid-template-columns:repeat(7,1fr);gap:.15rem;margin-bottom:.2rem}
      .kol-dnevi-glava span{text-align:center;font-size:.68rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:color-mix(in oklch,var(--ink,#111) 50%,transparent)}
      .kol-mreza{display:grid;grid-template-columns:repeat(7,1fr);gap:.15rem}
      .kol-dan{aspect-ratio:1;display:inline-flex;align-items:center;justify-content:center;font-size:.82rem;font-weight:500;color:var(--ink,#111);border-radius:999px;border:none;background:none}
      .kol-zunaj{color:color-mix(in oklch,var(--ink,#111) 28%,transparent)}
      .kol-klik{cursor:pointer;transition:background-color .15s,color .15s}
      .kol-klik:hover{background-color:color-mix(in oklch,var(--ink,#111) 8%,transparent)}
      .kol-danes:not(.kol-rob){box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--ink,#111) 30%,transparent)}
      .kol-obmocje{background-color:color-mix(in oklch,var(--accent,#B25476) 18%,transparent);border-radius:8px}
      .kol-rob{background-color:var(--accent,#B25476);color:var(--paper,#fff);font-weight:700}
      .kol-noga{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.85rem;padding-top:.75rem;border-top:1px solid color-mix(in oklch,var(--ink,#111) 10%,transparent)}
      .kol-pocisti,.kol-koncano{padding:.5rem 1rem;border-radius:999px;font:inherit;font-size:.82rem;cursor:pointer;transition:background-color .15s,color .15s,opacity .15s}
      .kol-pocisti{border:1px solid color-mix(in oklch,var(--ink,#111) 20%,transparent);background-color:color-mix(in oklch,var(--paper,#fff) 50%,transparent);color:var(--ink,#111)}
      .kol-pocisti:hover{border-color:var(--ink,#111)}
      .kol-koncano{border:none;background-color:var(--ink,#111);color:var(--paper,#fff);font-weight:700}
      .kol-koncano:hover{opacity:.9}
    `}</style>
  </div>;
}
