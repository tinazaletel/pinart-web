'use client';

/* CENIK DODATKOV — ena komponenta za landing in za cenik v aplikaciji.
 *
 * Prej je bil isti razdelek napisan dvakrat, z ročno narisanimi ikonami, ker je
 * PaketiSeznam strežniška komponenta in Phosphorja ne prenese. Ročne ikone se
 * niso ujemale s hišnim naborom (Tina, 30. 8. 2026). Odjemalska komponenta to
 * reši pri obeh hkrati: Phosphor deluje, izris je en sam.
 *
 * Dve skupini, ker se dodatka razlikujeta po naravi: dobroimetje kupiš enkrat
 * in ostane, mesečno pa teče z naročnino.
 */

import { Buildings, ChatCircleDots, FolderOpen, UserPlus, UsersThree } from '@phosphor-icons/react';
import { DODATKI, preliv, rob } from '@/lib/dodatki';

const IKONE = {
  'pregledi-5': Buildings,
  'pregledi-20': Buildings,
  'pupa-500': ChatCircleDots,
  'prostor-10-gb': FolderOpen,
  'polni-sedez': UserPlus,
  'sodelavec': UsersThree,
} as const;

export default function DodatkiSeznam({ jeEn = false }: { jeEn?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  const skupine = [
    { enota: 'enkratno' as const, naslov: L('Dobroimetje', 'Credit'),
      pod: L('Kupiš enkrat in ostane, dokler ga ne porabiš.', 'Buy once; it stays until you use it.') },
    { enota: 'mesec' as const, naslov: L('Mesečno', 'Monthly'),
      pod: L('Teče skupaj z naročnino in ga lahko kadarkoli odpoveš.', 'Runs with your subscription; cancel any time.') },
  ];

  return (
    <div className="dod">
      {skupine.map((skupina, i) => (
        <div key={skupina.enota} style={{ marginTop: i ? '1.6rem' : 0 }}>
          <h3 className="dod-naslov">{skupina.naslov}</h3>
          <p className="dod-pod">{skupina.pod}</p>
          <div className="dod-mreza">
            {DODATKI.filter(d => d.enota === skupina.enota).map(dodatek => {
              const Ikona = IKONE[dodatek.id as keyof typeof IKONE] ?? Buildings;
              return (
                <div
                  key={dodatek.id}
                  className="dod-kartica"
                  style={{ background: preliv(dodatek.barva), borderColor: rob(dodatek.barva) }}
                >
                  <span className="dod-krog" aria-hidden>
                    <Ikona size={18} weight="duotone" color={dodatek.barva} />
                  </span>
                  <span className="dod-ime">{jeEn ? dodatek.imeEn : dodatek.ime}</span>
                  <span className="dod-opis">{jeEn ? dodatek.opisEn : dodatek.opis}</span>
                  <span className="dod-cena">
                    {dodatek.cena} €<span>/ {dodatek.enota === 'mesec' ? L('mesec', 'month') : L('enkratno', 'one-off')}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="dod-zakljucek">
        {L('Enkratno kupljeno dobroimetje ne poteče. Dodatkov še ni mogoče kupiti — napiši nam, kaj rabiš, in se dogovoriva; ko bo nakup na voljo, ti javimo.',
           'One-off credit never expires. Add-ons cannot be purchased yet — tell us what you need and we will work it out; we will let you know when buying goes live.')}
      </p>

      <style jsx>{`
        .dod-naslov { margin: 0 0 .15rem; font: 500 1.15rem/1.2 var(--font-serif), Georgia, serif; color: #111; }
        .dod-pod { margin: 0 0 .7rem; font-size: .85rem; color: rgba(17,17,17,.6); }
        .dod-mreza { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: .7rem; }
        .dod-kartica { display: grid; grid-template-columns: auto minmax(0,1fr); gap: .15rem .9rem;
          padding: 1.15rem 1.25rem; border: 1px solid; border-radius: 18px;
          transition: transform .2s ease, box-shadow .2s ease; }
        .dod-kartica:hover { transform: translateY(-2px); box-shadow: 0 .6rem 1.5rem rgba(17,17,17,.08); }
        .dod-krog { grid-row: span 3; width: 2.7rem; height: 2.7rem; display: grid; place-items: center;
          border-radius: 999px; background: #fff; box-shadow: 0 1px 3px rgba(17,17,17,.08); }
        .dod-ime { align-self: end; font-size: 1.02rem; font-weight: 650; color: #111; letter-spacing: -.01em; }
        .dod-opis { font-size: .84rem; line-height: 1.45; color: rgba(17,17,17,.68); }
        .dod-cena { display: flex; align-items: baseline; gap: .3rem; margin-top: .35rem;
          font-size: 1.45rem; font-weight: 700; color: #111; letter-spacing: -.02em; }
        .dod-cena span { font-size: .8rem; font-weight: 500; color: rgba(17,17,17,.55); }
        .dod-zakljucek { margin: 1.1rem 0 0; font-size: .88rem; line-height: 1.6; color: rgba(17,17,17,.7); }
      `}</style>
    </div>
  );
}
