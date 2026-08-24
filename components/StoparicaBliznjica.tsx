'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Pause, Play, Stop, Timer } from '@phosphor-icons/react';
import { jePozabljeno, potrdiTek, preklopiPavzo, useTekoceMerjenje, zahtevajUstavitev, zapisCasa } from '@/lib/tekoceMerjenje';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import Toast from '@/components/Toast';

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

  /* Pozabljena štoparica NE predela pilule — ta ostane, kakršna je. Vprašanje
     pride kot ločeno rdeče obvestilo, po istem vzorcu kot druga opozorila v
     aplikaciji (components/Toast). Molčati bi pomenilo pustiti napačno
     zaračunano uro, predelati pilulo pa pomeni izgubiti štoparico izpred oči. */
  const opomnik = pozabljena ? (
    <Toast
      ton="napaka"
      trajanje={0}
      sporocilo={`Štoparica teče že ${ur} ${ur === 1 ? 'uro' : ur === 2 ? 'uri' : ur < 5 ? 'ure' : 'ur'} — ${merjenje.projectName}. Si jo pozabila ustaviti?`}
      onClose={potrdiTek}
      ikona={<Timer size={19} weight="fill" />}
      dejanja={<>
        <button type="button" onClick={ustavi}>Ustavi in shrani</button>
        <button type="button" onClick={potrdiTek}>Teče naprej</button>
      </>}
    />
  ) : null;

  return (
    <>
    {opomnik}
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
    </>
  );
}
