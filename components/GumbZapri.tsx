'use client';

/* GUMB ZA ZAPIRANJE — en sam za vse panele in okna.
 *
 * Doslej ga je vsak panel risal po svoje, večinoma z znakom »×«. Ta znak ima
 * neenake stranske robove in v krogu nikoli ne sedi na sredini — Tina je to
 * takoj videla (1. 9. 2026: »x ni na sredini«). Tu je ikona, ne znak, in
 * sredinjenje je zato pravo.
 */

import { X } from '@phosphor-icons/react';

type Props = {
  onClick: () => void;
  /** Napis za bralnike zaslona; privzeto »Zapri«. */
  oznaka?: string;
  jeEn?: boolean;
  velikost?: number;
};

export default function GumbZapri({ onClick, oznaka, jeEn = false, velikost = 16 }: Props) {
  const napis = oznaka || (jeEn ? 'Close' : 'Zapri');
  return (
    <button type="button" className="gz" onClick={onClick} aria-label={napis} title={napis}>
      <X size={velikost} weight="bold" />
      <style jsx>{`
        .gz {
          flex: none;
          display: inline-grid;
          place-items: center;
          width: 2.2rem;
          height: 2.2rem;
          padding: 0;
          border: 1px solid rgba(17, 17, 17, .12);
          border-radius: 50%;
          background: rgba(255, 255, 255, .85);
          color: rgba(17, 17, 17, .6);
          cursor: pointer;
          transition: background-color .15s ease, color .15s ease, border-color .15s ease;
        }
        .gz:hover { background: #fff; color: #1a1a1a; border-color: rgba(17, 17, 17, .2); }
        .gz:focus-visible { outline: 3px solid oklch(65% .18 295); outline-offset: 2px; }
      `}</style>
    </button>
  );
}
