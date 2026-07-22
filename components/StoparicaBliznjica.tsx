'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Pause, Play, Stop } from '@phosphor-icons/react';
import { preklopiPavzo, useTekoceMerjenje, zahtevajUstavitev, zapisCasa } from '@/lib/tekoceMerjenje';
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
