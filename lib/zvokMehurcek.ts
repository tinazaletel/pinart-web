/* POK MEHURČKA — »blu blub« ob opomniku za razgibavanje (Tina, 30. 8. 2026).
 *
 * Sintetizirano, ne posnetek: dva mehurčka sta 200 bajtov kode namesto 30 kB
 * datoteke, ki bi jo bilo treba naložiti prav takrat, ko mora zvok priti takoj.
 *
 * Mehurček je sinus, ki v desetinki sekunde zdrsne navzgor in utihne — uho to
 * sliši kot pok pod vodo. Dva zaporedna z različno višino dasta »blu blub«.
 */

export function pokMehurcka(glasnost = 0.28): void {
  if (typeof window === 'undefined') return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  let ctx: AudioContext;
  try { ctx = new Ctx(); } catch { return; }
  /* Brskalnik brez predhodnega klika zvoka ne spusti — takrat molk, ne napaka. */
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});

  const mehurcek = (zamik: number, odFrekvence: number, doFrekvence: number, moc: number) => {
    const t = ctx.currentTime + zamik;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(odFrekvence, t);
    osc.frequency.exponentialRampToValueAtTime(doFrekvence, t + 0.085);

    const jakost = ctx.createGain();
    jakost.gain.setValueAtTime(0.0001, t);
    jakost.gain.exponentialRampToValueAtTime(moc, t + 0.012);
    jakost.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);

    osc.connect(jakost).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
    return osc;
  };

  mehurcek(0, 210, 760, glasnost);
  const zadnji = mehurcek(0.15, 300, 1050, glasnost * 0.8);
  zadnji.onended = () => { void ctx.close().catch(() => {}); };
}
