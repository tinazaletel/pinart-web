'use client';

/* SKUPEN prikaz priponk — pošta in naloge uporabljata ISTEGA. Pravila so v
   lib/priponke.ts (čista, testirana), nalaganje v lib/priponkeOblak.ts.
   Ne piši tretje različice: če potrebuješ drugačen videz, popravi tega.

   Slog je navaden <style> z lastno predpono (pri-), enako kot components/Toast.tsx,
   ker se komponenta uporablja znotraj različnih ovojev (.km, .tm) in mora
   izgledati enako v obeh. */

import { useEffect, useRef, useState } from 'react';
import { DownloadSimple, Paperclip } from '@phosphor-icons/react';
import {
  NAJVEC_BAJTOV_SKUPAJ,
  NAJVEC_PRIPONK,
  berljivaVelikost,
  jeSeProstor,
  preveriPriponko,
  skupnaVelikost,
  type Priponka,
} from '@/lib/priponke';
import { datotekeIzOdlozisca, jeSlika, naloziPriponko, povezavaPriponke, type PriponkaSekcija } from '@/lib/priponkeOblak';

export { datotekeIzOdlozisca };

const SPREJME = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv,.zip';

function Slog() {
  return (
    <style>{`
      .pri{--pri-line:var(--line,rgba(17,17,17,.1));--pri-ink:var(--ink,#111)}
      .pri-vrh{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .7rem}
      .pri-gumb{display:inline-flex;align-items:center;gap:.4rem;min-height:2.75rem;padding:0 1rem;border:1px solid var(--pri-line);border-radius:999px;background:#fff;color:var(--pri-ink);font:750 .72rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
      .pri-gumb:hover:not(:disabled){background:var(--pri-ink);color:#fff;border-color:transparent}
      .pri-gumb:disabled{opacity:.45;cursor:not-allowed}
      .pri-meja{font:600 .72rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--pri-ink) 60%,transparent);text-transform:none;letter-spacing:0}
      .pri-napaka{flex:1 0 100%;margin:.1rem 0 0;padding:.55rem .75rem;border:1px solid oklch(78% .13 25);border-radius:.6rem;background:oklch(96% .04 25);color:oklch(45% .18 25);font:700 .78rem var(--font-sans),sans-serif;text-transform:none;letter-spacing:0}
      .pri-mirno{flex:1 0 100%;margin:0;font:500 .78rem/1.5 var(--font-sans),sans-serif;color:color-mix(in oklch,var(--pri-ink) 70%,transparent);text-transform:none;letter-spacing:0}
      .pri-glava{display:inline-flex;align-items:center;gap:.3rem;margin:0 0 .5rem;font:700 .66rem var(--font-sans),sans-serif;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in oklch,var(--pri-ink) 62%,transparent)}
      .pri-seznam{list-style:none;margin:.2rem 0 0;padding:0;display:flex;flex-direction:column;gap:.4rem;flex:1 0 100%}
      .pri-vrstica{display:flex;align-items:center;gap:.55rem;padding:.5rem .7rem;border:1px solid var(--pri-line);border-radius:.7rem;background:#fff;color:var(--pri-ink);font:500 .82rem var(--font-sans),sans-serif;text-transform:none;letter-spacing:0}
      .pri-slicica{flex:none;width:2.6rem;height:2.6rem;border:1px solid var(--pri-line);border-radius:.5rem;object-fit:cover;background:var(--paper,#f5f2ea)}
      .pri-ime{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;text-align:left}
      .pri-vel{flex:none;font-variant-numeric:tabular-nums;color:color-mix(in oklch,var(--pri-ink) 62%,transparent)}
      .pri-ni{flex:none;font:700 .68rem var(--font-sans),sans-serif;color:oklch(48% .14 45)}
      .pri-akc{flex:none;display:inline-flex;align-items:center;gap:.35rem;min-height:2.2rem;padding:0 .8rem;border:1px solid var(--pri-line);border-radius:999px;background:#fff;color:var(--pri-ink);font:750 .7rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
      .pri-akc:hover{background:var(--pri-ink);color:#fff;border-color:transparent}
      .pri-x{flex:none;width:1.9rem;height:1.9rem;display:grid;place-items:center;border:1px solid var(--pri-line);border-radius:50%;background:#fff;color:var(--pri-ink);font-size:1rem;line-height:1;cursor:pointer}
      .pri-x:hover{background:var(--pri-ink);color:#fff;border-color:transparent}
      @media (max-width:640px){
        .pri-vrstica{flex-wrap:wrap;padding:.6rem .7rem}
        .pri-ime{flex:1 0 60%;white-space:normal}
      }
    `}</style>
  );
}

/* Predogled slike: povezava je podpisana in kratkoživa, zato jo dobimo šele po
   montaži (in nikoli med renderjem — DESIGN.md §10). */
function Licica({ priponka, opis }: { priponka: Priponka; opis: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let ziv = true;
    if (!priponka.pot) return;
    povezavaPriponke(priponka.pot, 300).then(u => { if (ziv) setUrl(u); }).catch(() => undefined);
    return () => { ziv = false; };
  }, [priponka.pot]);
  if (!url) return <Paperclip size={16} aria-hidden />;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img className="pri-slicica" src={url} alt={opis} />;
}

/* Skupna logika nalaganja. Vrne jo tudi navzven, da lahko naloge poženejo isto
   pot ob lepljenju s Cmd+V, ne da bi podvajale kodo. */
export function usePriponke(nastavitve: {
  sekcija: PriponkaSekcija;
  sklic: string;
  priponke: Priponka[];
  onSpremeni: (nove: Priponka[]) => void;
  jeEn?: boolean;
}) {
  const { sekcija, sklic, priponke, onSpremeni, jeEn } = nastavitve;
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [nalagam, setNalagam] = useState(false);
  const [napaka, setNapaka] = useState('');

  const dodajDatoteke = async (datoteke: File[]) => {
    if (!datoteke.length) return;
    setNalagam(true);
    let zbrane = priponke;
    for (const datoteka of datoteke) {
      const izid = preveriPriponko({ ime: datoteka.name, velikost: datoteka.size });
      if (!izid.veljavno) { setNapaka(izid.napaka || ''); continue; }
      if (!jeSeProstor(zbrane, datoteka.size)) {
        setNapaka(L(
          `Največ ${NAJVEC_PRIPONK} priponk in ${berljivaVelikost(NAJVEC_BAJTOV_SKUPAJ)} skupaj.`,
          `Up to ${NAJVEC_PRIPONK} files and ${berljivaVelikost(NAJVEC_BAJTOV_SKUPAJ, '.')} in total.`,
        ));
        break;
      }
      try {
        const nova = await naloziPriponko(datoteka, sekcija, sklic);
        zbrane = [...zbrane, nova];
        onSpremeni(zbrane);
        setNapaka('');
      } catch (e) {
        const sporocilo = e instanceof Error ? e.message : '';
        setNapaka(sporocilo.includes('Prijava')
          ? L('Priponke se shranijo v oblak, zato so na voljo prijavljenim. Prijavi se in poskusi znova.',
              'Attachments are stored in the cloud, so they need a signed-in account. Sign in and try again.')
          : sporocilo || L('Priponke ni bilo mogoče naložiti.', 'Could not upload the attachment.'));
      }
    }
    setNalagam(false);
  };

  return { nalagam, napaka, setNapaka, dodajDatoteke };
}

/* Vnos: gumb »Pripni datoteko« + seznam že pripetih (z odstranjevanjem).
   `omogoceno=false` (npr. neprijavljen) pomeni mirno razlago, ne napake. */
export function PriponkeVnos({
  sekcija, sklic, priponke, onSpremeni, jeEn = false, omogoceno = true, razlogZakleneno, dodajRef,
}: {
  sekcija: PriponkaSekcija;
  sklic: string;
  priponke: Priponka[];
  onSpremeni: (nove: Priponka[]) => void;
  jeEn?: boolean;
  omogoceno?: boolean;
  razlogZakleneno?: string;
  /* Klicatelj lahko dobi isto pot nalaganja (npr. lepljenje s Cmd+V v naloge),
     da ne nastane druga koda z drugim stanjem. */
  dodajRef?: { current: ((datoteke: File[]) => void) | null };
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const vhodRef = useRef<HTMLInputElement | null>(null);
  const { nalagam, napaka, dodajDatoteke } = usePriponke({ sekcija, sklic, priponke, onSpremeni, jeEn });
  if (dodajRef) dodajRef.current = omogoceno ? (d: File[]) => { void dodajDatoteke(d); } : null;

  if (!omogoceno) {
    return (
      <div className="pri">
        <p className="pri-mirno">
          {razlogZakleneno || L('Priponke se shranijo v oblak, zato so na voljo prijavljenim.', 'Attachments are stored in the cloud, so they need a signed-in account.')}
        </p>
        <Slog />
      </div>
    );
  }

  return (
    <div className="pri">
      <div className="pri-vrh">
        <button type="button" className="pri-gumb" disabled={nalagam || !jeSeProstor(priponke)} onClick={() => vhodRef.current?.click()}>
          <Paperclip size={15} weight="bold" /> {nalagam ? L('Nalagam …', 'Uploading …') : L('Pripni datoteko', 'Attach file')}
        </button>
        <input
          ref={vhodRef}
          type="file"
          multiple
          hidden
          accept={SPREJME}
          onChange={e => { const d = Array.from(e.target.files || []); e.target.value = ''; void dodajDatoteke(d); }}
        />
        <span className="pri-meja">
          {priponke.length}/{NAJVEC_PRIPONK} · {berljivaVelikost(skupnaVelikost(priponke))} {L('od', 'of')} {berljivaVelikost(NAJVEC_BAJTOV_SKUPAJ)}
        </span>
        {napaka && <p className="pri-napaka">{napaka}</p>}
        {priponke.length > 0 && (
          <PriponkeSeznam
            priponke={priponke}
            jeEn={jeEn}
            brezGlave
            onOdstrani={i => onSpremeni(priponke.filter((_, j) => j !== i))}
          />
        )}
      </div>
      <Slog />
    </div>
  );
}

/* Seznam: ime, velikost, prenos. Slika dobi majhen predogled.
   Priponka brez poti ni bila shranjena — to povemo naglas, namesto da izgine. */
export function PriponkeSeznam({
  priponke, jeEn = false, onOdstrani, brezGlave = false,
}: {
  priponke: Priponka[];
  jeEn?: boolean;
  onOdstrani?: (i: number) => void;
  brezGlave?: boolean;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  if (!priponke.length) return null;
  const prenesi = async (p: Priponka) => {
    if (!p.pot) return;
    try { window.open(await povezavaPriponke(p.pot, 300), '_blank', 'noopener,noreferrer'); }
    catch { /* povezava je potekla ali datoteke ni — gumb preprosto ne stori nič */ }
  };
  return (
    <div className="pri">
      {!brezGlave && <p className="pri-glava"><Paperclip size={12} weight="bold" /> {L('Priponke', 'Attachments')} · {priponke.length}</p>}
      <ul className="pri-seznam">
        {priponke.map((p, i) => (
          <li key={p.pot || `${p.ime}-${i}`} className="pri-vrstica">
            {p.pot && jeSlika(p) ? <Licica priponka={p} opis={p.ime} /> : <Paperclip size={16} aria-hidden />}
            <span className="pri-ime">{p.ime}</span>
            <span className="pri-vel">{p.velikost ? berljivaVelikost(p.velikost) : '—'}</span>
            {p.pot ? (
              <button type="button" className="pri-akc" onClick={() => prenesi(p)}>
                <DownloadSimple size={14} weight="bold" /> {L('Prenesi', 'Download')}
              </button>
            ) : (
              <span className="pri-ni" title={L('Datoteka ni bila shranjena, zapis o njej pa ostane.', 'The file was not stored, only the record of it remains.')}>
                {L('ni shranjena', 'not stored')}
              </span>
            )}
            {onOdstrani && (
              <button type="button" className="pri-x" onClick={() => onOdstrani(i)} aria-label={`${L('Odstrani', 'Remove')} ${p.ime}`}>×</button>
            )}
          </li>
        ))}
      </ul>
      <Slog />
    </div>
  );
}
