/* PODPORA RAZVOJU — vidna, a ne prosjačeča.
 *
 * Prva različica je bila tanka črta na svetlem ozadju in je preprosto izginila
 * (Tina, 29. 8. 2026). Zdaj ima svojo ploskev, serifni naslov kot drugod v
 * Flowu in poln gumb — enako težo kot ostali pozivi na strani, ne manj.
 *
 * Stoji na dveh mestih in obakrat z razlogom:
 *  · na koncu koraka s ceno — človek je pravkar dobil vrednost in ni plačal nič
 *  · nad nogo landinga — kdor pride do tja, je stran prebral do konca
 *
 * Beseda »donacija« se namenoma NE uporablja: Pinart je d.o.o., ne društvo v
 * javnem interesu, zato prispevek za dajalca ni davčno odbiten.
 */

const POVEZAVA = 'https://buy.stripe.com/8x2cN79fXcJs6ezgnfefC00';

export default function PodpriBanner({ jeEn = false, razlicica = 'kalkulator' }: { jeEn?: boolean; razlicica?: 'kalkulator' | 'landing' }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const naLandingu = razlicica === 'landing';

  return (
    <div className={'pb' + (naLandingu ? ' pb-landing' : '')}>
      <span className="pb-znak" aria-hidden />
      <div className="pb-besedilo">
        <strong className="pb-naslov">
          {naLandingu
            ? L('Če ti je Flow v pomoč', 'If Flow helps you')
            : L('Izračun je brezplačen in tak ostane.', 'The calculation is free and stays free.')}
        </strong>
        <p className="pb-tekst">
          {naLandingu
            ? L('S prispevkom pomagaš razvijati in širiti Flow. ', 'Your contribution helps build Flow and spread the word. ')
            : L('S prispevkom pomagaš razvijati in širiti Flow. ', 'Your contribution helps build Flow and spread the word. ')}
        </p>
        <p className="pb-poudarek">{L('Znesek določiš sam.', 'You choose the amount.')}</p>
      </div>
      {/* Prašiček kuka izza gumba in rahlo štrli čez rob — enako kot koš in
          rastlina stojita na robu noge. Ni ikona v okencu, je rekvizit. */}
      <div className="pb-desno">
        <img className="pb-prasicek" src="/flow/prasicek3d.png" alt="" aria-hidden />
        <a className="pb-gumb" href={POVEZAVA} target="_blank" rel="noopener noreferrer">
          {L('Podpri Flow', 'Support Flow')}
        </a>
      </div>

      <style jsx>{`
        /* Temna vijolična ploskev z ŽIVIM prelivom — isti jezik kot aurora
           drugod v Flowu. Ozek pas, ne čez vso širino: prošnja naj bo vidna,
           ne pa glasnejša od vsebine (Tina, 29. 8. 2026). */
        .pb {
          /* Mreža namesto ovijanja: v ožjem stolpcu (Zaključek) je flex besedilo
             sredinsko poravnal, gumb pa vrgel v svojo vrstico (Tina, 29. 8. 2026). */
          display: grid; grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center; gap: .9rem; text-align: left;
          margin: 1.8rem auto 0; max-width: 34rem;
          padding: 0 1.6rem 0 1rem; border-radius: 16px;
          color: oklch(97% .012 300);
          background:
            linear-gradient(115deg,
              oklch(32% .13 297) 0%,
              oklch(26% .10 285) 22%,
              oklch(38% .15 320) 45%,
              oklch(28% .12 265) 68%,
              oklch(34% .14 300) 100%);
          background-size: 320% 320%;
          animation: pbTok 18s ease-in-out infinite;
          box-shadow: 0 16px 42px oklch(30% .12 297 / .32);
          border: 1px solid oklch(52% .16 300 / .35);
        }
        @keyframes pbTok {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        /* Kdor ima izklopljene animacije, dobi mirno ploskev, ne utripanja. */
        @media (prefers-reduced-motion: reduce) {
          .pb { animation: none; background-position: 30% 50%; }
        }

        .pb { position: relative; overflow: visible; }
        /* Znak Flowa ostane v kartici — brez njega je bila ploskev brez podpisa. */
        .pb-znak {
          flex: 0 0 auto; width: 2.1rem; height: 2.1rem; border-radius: 50%;
          background: conic-gradient(from 30deg,
            var(--mint, oklch(79% .13 165)), oklch(75% .17 85),
            var(--orange, oklch(76% .16 52)), var(--purple, oklch(66% .2 297)),
            var(--mint, oklch(79% .13 165)));
          box-shadow: 0 0 0 3px oklch(100% 0 0 / .14);
        }
        /* Pujsek stoji V vrsti, tik pred gumbom — ne štrli iz kartice in ne
           more zaiti v besedilo nad njo (Tina, 29. 8. 2026). */
        /* Pujsek sme gledati čez zgornji rob — kartica je nižja, zato ima
           prostor navzgor in ne trči v besedilo (Tina, 29. 8. 2026). */
        .pb-prasicek {
          flex: 0 0 auto; width: clamp(6.5rem, 15vw, 9rem); height: auto;
          margin-top: -2.15rem; align-self: center;
          transform: rotate(-6deg);
          /* Negativni desni odmik potegne gumb rahlo ČEZ pujska — tako sta en
             predmet, ne dva postavljena drug ob drugem (Tina, 29. 8. 2026). */
          margin-right: -1.9rem;
          pointer-events: none; user-select: none;
          filter: drop-shadow(0 8px 16px oklch(30% .1 297 / .32));
        }
        @media (max-width: 560px) { .pb-prasicek { display: none; } }
        .pb-besedilo { min-width: 0; display: flex; flex-direction: column; gap: .02rem; }
        .pb-naslov {
          font: 500 clamp(1.02rem, 1.8vw, 1.18rem)/1.12 var(--font-serif), Georgia, serif;
          font-synthesis: none; color: oklch(99% .008 300);
        }
        .pb-poudarek { margin: 0; font-size: .84rem; font-weight: 700; color: oklch(97% .015 300); }
        .pb-tekst {
          margin: 0; font-size: .82rem; line-height: 1.35;
          color: oklch(90% .02 300 / .82);
        }
        .pb-gumb {
          /* Dvignjen čez pujsa, da se prekrijeta in delujeta kot en predmet. */
          position: relative; z-index: 1; top: -0.625rem;
          flex: 0 0 auto; display: inline-flex; align-items: center;
          padding: .38rem 1.05rem; border-radius: 999px;
          background: oklch(97% .012 300); color: oklch(24% .06 300);
          font-size: .84rem; font-weight: 700; text-decoration: none;
          transition: transform .14s ease, box-shadow .16s ease;
        }
        .pb-gumb:hover { transform: translateY(-1px); box-shadow: 0 6px 18px oklch(20% .08 300 / .35); }
        .pb-landing { margin: 3.4rem auto 1.2rem; }
        /* Ozko: znak in pujs odpadeta, ostane besedilo z gumbom pod njim. */
        @media (max-width: 560px) {
          .pb { grid-template-columns: 1fr; gap: .7rem; padding: 1rem; }
          .pb-znak, .pb-prasicek { display: none; }
          .pb-desno { justify-content: stretch; }
          .pb-gumb { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
