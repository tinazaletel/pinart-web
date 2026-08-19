'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Pause, Play, Stop } from '@phosphor-icons/react';
import { jePozabljeno, potrdiTek, preklopiPavzo, useTekoceMerjenje, zahtevajUstavitev, zapisCasa } from '@/lib/tekoceMerjenje';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

const IKONA = { fill: 'currentColor', stroke: 'none' } as const;

/**
 * Bližnjica do tekočega merjenja, vidna v glavi vseh strani Flow.
 *
 * Pavza in nadaljevanje delujeta kar tukaj. Ustavitev pelje na "Cena & čas",
 * ker je treba vnos še potrditi (vrednost, obseg, opomba) — tega ni smiselno
 * stlačiti v pilulo v glavi.
 */
export default function StoparicaBliznjica() {
  const pathname = usePathname();
  const router = useRouter();
  const { merjenje, sekunde } = useTekoceMerjenje();
  if (!merjenje) return null;

  const base = pathname?.startsWith('/en/') ? '/en' : '';
  const naCasu = pathname?.includes('/kalkulator/cas');
  /* na strani s štoparico je že velika kartica — tam pilula ni potrebna */
  if (naCasu) return null;

  const ustavi = () => { zahtevajUstavitev(); router.push(`${base}/kalkulator/cas`); };
  const pozabljena = jePozabljeno(merjenje);
  const ur = Math.floor(sekunde / 3600);

  /* Pozabljena štoparica: namesto pilule pokažemo vprašanje. Molčati bi
     pomenilo pustiti napačno zaračunano uro. */
  if (pozabljena) {
    return (
      <div className="sb-opomnik" role="status">
        <span className="sb-opomnik-txt">
          <b>Štoparica teče že {ur} {ur === 1 ? 'uro' : ur === 2 ? 'uri' : ur < 5 ? 'ure' : 'ur'}.</b>
          {' '}Si jo pozabila ustaviti?
          <small>{merjenje.projectName}</small>
        </span>
        <button type="button" className="sb-opomnik-glavni" onClick={ustavi}>Ustavi in shrani</button>
        <button type="button" className="sb-opomnik-drugi" onClick={potrdiTek}>Teče naprej</button>

        <style jsx>{`
          .sb-opomnik { display: inline-flex; align-items: center; flex-wrap: wrap; gap: .5rem; padding: .4rem .5rem .4rem .8rem; border: 1px solid #e0b64a; border-radius: 999px; background: #fdf6e3; }
          .sb-opomnik-txt { display: inline-flex; flex-direction: column; line-height: 1.25; font-size: .74rem; color: #6b5a24; }
          .sb-opomnik-txt b { font-weight: 700; }
          .sb-opomnik-txt small { font-size: .66rem; opacity: .75; }
          .sb-opomnik button { padding: .32rem .7rem; border-radius: 999px; font: 700 .7rem inherit; cursor: pointer; white-space: nowrap; }
          .sb-opomnik-glavni { border: 0; background: #6E4FA6; color: #fff; }
          .sb-opomnik-drugi { border: 1px solid rgba(17,17,17,.18); background: #fff; color: #4a453f; }
        `}</style>
      </div>
    );
  }

  return (
    <div className={styles.stoparicaBliznjica} data-pavza={!!merjenje.pavza}>
      <Link href={`${base}/kalkulator/cas`} title={`Odpri merjenje: ${merjenje.projectName}`}>
        <span aria-hidden="true" />
        <b>{zapisCasa(sekunde)}</b>
        <small>{merjenje.projectName}</small>
      </Link>
      <button type="button" onClick={preklopiPavzo}
        aria-label={merjenje.pavza ? 'Nadaljuj merjenje' : 'Pavza'}
        title={merjenje.pavza ? 'Nadaljuj' : 'Pavza'}>
        {merjenje.pavza ? <Play size={12} weight="fill" style={IKONA} /> : <Pause size={12} weight="fill" style={IKONA} />}
      </button>
      <button type="button" onClick={ustavi} aria-label="Ustavi in shrani" title="Ustavi in shrani">
        <Stop size={12} weight="fill" style={IKONA} />
      </button>
    </div>
  );
}
