/* POK MEHURČKA — »blu blub« ob opomniku za razgibavanje (Tina, 30. 8. 2026).
 *
 * Sintetizirano, ne posnetek: trije mehurčki so par sto bajtov kode namesto
 * datoteke, ki bi se nalagala prav takrat, ko mora zvok priti takoj.
 *
 * Mehurček je sinus, ki v desetinki sekunde zdrsne navzgor in utihne — uho to
 * sliši kot pok pod vodo. Trije zaporedni z različno višino dajo »blu blub«.
 *
 * ZAKAJ EN SAM, TRAJEN KONTEKST (Tina, 1. 9. 2026: »druge strani sem imela
 * odprte in tega sploh slišala nisem«): prej je vsak klic ustvaril nov
 * AudioContext. Brskalnik nov kontekst brez uporabnikove geste ustavi, resume()
 * pa je asinhron — note so bile razporejene, preden je kontekst stekel, in so
 * utihnile v prazno. Zdaj je kontekst en sam, odklene se ob prvem dotiku ali
 * tipki kjerkoli v aplikaciji in ostane živ, zato zvok pride tudi takrat, ko je
 * zavihek v ozadju.
 */

let ctx: AudioContext | null = null;
let poslusaGeste = false;

function kontekst(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try { ctx = new Ctx(); } catch { return null; }
  if (!poslusaGeste) {
    poslusaGeste = true;
    const odkleni = () => { void ctx?.resume().catch(() => {}); };
    (['pointerdown', 'keydown', 'touchstart'] as const)
      .forEach(d => window.addEventListener(d, odkleni, { passive: true }));
  }
  return ctx;
}

/** Pripravi zvok ob prvi uporabnikovi gesti, da kasnejši opomnik ni tih. */
export function odkleniZvok(): void {
  const c = kontekst();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

export function pokMehurcka(glasnost = 0.5): void {
  const c = kontekst();
  if (!c) return;

  const zaigraj = () => {
    const mehurcek = (zamik: number, odFrekvence: number, doFrekvence: number, moc: number) => {
      const t = c.currentTime + zamik;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(odFrekvence, t);
      osc.frequency.exponentialRampToValueAtTime(doFrekvence, t + 0.085);

      const jakost = c.createGain();
      jakost.gain.setValueAtTime(0.0001, t);
      jakost.gain.exponentialRampToValueAtTime(moc, t + 0.012);
      jakost.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      osc.connect(jakost).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    };
    /* Trije namesto dveh: ob delu v drugem oknu se dva zgubita, trije so še
       vedno kratki (pol sekunde), a jih opaziš. */
    mehurcek(0, 210, 760, glasnost);
    mehurcek(0.15, 300, 1050, glasnost * 0.85);
    mehurcek(0.30, 260, 900, glasnost * 0.7);
  };

  /* Ce je kontekst ustavljen, najprej pocakamo, da stece — sicer note padejo v prazno. */
  if (c.state === 'suspended') { void c.resume().then(zaigraj).catch(() => {}); return; }
  zaigraj();
}
