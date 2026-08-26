/**
 * PUPA BERE NALOGE — »koliko odprtih mi je še ostalo?«
 *
 * Zakaj svoja datoteka in ne poziv v AI: na vprašanje o številu nalog ne sme
 * odgovarjati jezikovni model iz konteksta, ker si lahko številko izmisli.
 * Tu je odgovor IZRAČUNAN iz istih zapisov, ki jih kaže tabla — če se ne
 * ujema z njo, je napaka v kodi in ne v razpoloženju modela.
 *
 * Vse funkcije so čiste: današnji dan vstopa kot parameter (nikoli new Date()
 * med izvajanjem), da so preverljive s testom in ne dramijo hidracije.
 */

import type { Naloga } from '@/lib/naloge';

export type PovzetekNalog = {
  odprte: number;
  vTeku: number;
  cakajo: number;
  zamujene: Naloga[];
  danes: Naloga[];
  jutri: Naloga[];
  brezRoka: number;
  koncaneDanes: number;
};

const jeOdprta = (n: Naloga) => n.stolpec !== 'done';

/** Povzetek stanja nalog na dan `danes` (ISO »2026-08-26«). */
export function povzetekNalog(naloge: Naloga[], danes: string): PovzetekNalog {
  const odprte = naloge.filter(jeOdprta);
  const jutriIso = (() => {
    const [l, m, d] = danes.split('-').map(Number);
    const t = Date.UTC(l, (m || 1) - 1, (d || 1) + 1);
    return new Date(t).toISOString().slice(0, 10);
  })();
  const rok = (n: Naloga) => (n.rok || '').slice(0, 10);
  return {
    odprte: odprte.length,
    vTeku: odprte.filter(n => n.stolpec === 'in_progress').length,
    cakajo: odprte.filter(n => n.stolpec === 'waiting').length,
    zamujene: odprte.filter(n => rok(n) && rok(n) < danes),
    danes: odprte.filter(n => rok(n) === danes),
    jutri: odprte.filter(n => rok(n) === jutriIso),
    brezRoka: odprte.filter(n => !rok(n)).length,
    /* zakljucenih danes ne belezimo posebej; updatedAt je najblizji podatek,
       ki ga zapis ima, zato ga beremo kot »nazadnje premaknjeno« */
    koncaneDanes: naloge.filter(n => n.stolpec === 'done' && (n.updatedAt || '').slice(0, 10) === danes).length,
  };
}

/* Naslovi nalog v berljiv niz — največ tri, ostalo kot »in še 2«. */
const nastej = (naloge: Naloga[], jeEn: boolean): string => {
  const imena = naloge.slice(0, 3).map(n => `»${n.naslov}«`);
  const ostanek = naloge.length - imena.length;
  const seznam = imena.join(', ');
  if (ostanek <= 0) return seznam;
  return `${seznam} ${jeEn ? `and ${ostanek} more` : `in še ${ostanek}`}`;
};

/**
 * Odgovor v Pupinem tonu. Vrne prazen niz, kadar nalog sploh ni — takrat naj
 * odgovori kdo drug (ali AI), da ne trdimo »nimaš nalog«, če jih nismo brali.
 */
export function odgovorONalogah(p: PovzetekNalog, jeEn = false): string {
  const deli: string[] = [];
  if (!p.odprte) {
    return jeEn
      ? 'You have no open tasks — everything on the board is done.'
      : 'Nimaš odprtih nalog — vse na tabli je zaključeno.';
  }
  deli.push(jeEn ? `You have ${p.odprte} open ${p.odprte === 1 ? 'task' : 'tasks'}.` : `Odprtih nalog imaš ${p.odprte}.`);
  if (p.zamujene.length) {
    deli.push(jeEn
      ? `${p.zamujene.length} ${p.zamujene.length === 1 ? 'is' : 'are'} overdue: ${nastej(p.zamujene, true)}.`
      : `Zamujenih je ${p.zamujene.length}: ${nastej(p.zamujene, false)}.`);
  }
  if (p.danes.length) {
    deli.push(jeEn
      ? `Due today: ${nastej(p.danes, true)}.`
      : `Danes zapade: ${nastej(p.danes, false)}.`);
  } else if (!p.zamujene.length) {
    deli.push(jeEn ? 'Nothing is due today.' : 'Danes ne zapade nič.');
  }
  if (p.jutri.length) {
    deli.push(jeEn ? `Tomorrow: ${nastej(p.jutri, true)}.` : `Jutri: ${nastej(p.jutri, false)}.`);
  }
  if (p.vTeku) deli.push(jeEn ? `${p.vTeku} in progress.` : `V teku: ${p.vTeku}.`);
  if (p.brezRoka) deli.push(jeEn ? `${p.brezRoka} without a deadline.` : `Brez roka: ${p.brezRoka}.`);
  return deli.join(' ');
}

/* Vprašanja, ki jih Pupa odgovori iz podatkov, ne iz modela. Namenoma ozko:
   raje enkrat preveč pošljemo AI-ju kot da bi ugrabili pogovor o čem drugem. */
const KLJUCNE = ['nalog', 'task', 'opravk', 'zapade', 'rok', 'zamuj', 'to-do', 'todo', 'overdue', 'due'];
const STEVILO = ['koliko', 'kaj', 'katere', 'kateri', 'kdaj', 'how many', 'what', 'which', 'when', 'imam', 'ostalo', 'do i', 'mi je'];

/** Ali gre za vprašanje o nalogah, na katero znamo odgovoriti iz zapisov. */
export function jeVprasanjeONalogah(besedilo: string): boolean {
  const t = besedilo.toLowerCase();
  if (!KLJUCNE.some(k => t.includes(k))) return false;
  return STEVILO.some(k => t.includes(k)) || t.includes('?');
}

/** Kratek zapis stanja za kontekst AI-ja (kadar vprašanje ni čisto o nalogah). */
export function kontekstNalog(p: PovzetekNalog, jeEn = false): string {
  if (!p.odprte && !p.koncaneDanes) return '';
  return jeEn
    ? `Task board right now: ${p.odprte} open, ${p.zamujene.length} overdue, ${p.danes.length} due today, ${p.vTeku} in progress.`
    : `Stanje nalog zdaj: ${p.odprte} odprtih, ${p.zamujene.length} zamujenih, ${p.danes.length} zapade danes, ${p.vTeku} v teku.`;
}
