/* Sestanki in klici — lokalna shramba dogodkov koledarja (localStorage), isti
   vzorec kot lib/naloge.ts. Ločeno od rokov (računi/naloge), ki jih koledar
   že prikazuje — to so DEJANSKI dogovorjeni termini (sestanek pri stranki,
   telefonski klic ...), ne zapadlosti.

   Od 2026-08-20 se shramba sinhronizira z oblakom (lib/sestankiOblak.ts,
   tabela public.sestanki). localStorage OSTAJA lokalna kopija, ki jo vmesnik
   bere sinhrono, zato KoledarWorkspace ostane nespremenjen. Za sinhronizacijo
   sta dodana updatedAt (ob sporu zmaga novejši) in deletedAt (mehko brisanje —
   nagrobnik potuje v oblak, da druga naprava zapisa ne obudi nazaj). */

export type SestanekTip = 'sestanek' | 'klic';

export interface Sestanek {
  id: string;
  tip: SestanekTip;
  naslov: string;
  datum: string; // YYYY-MM-DD
  ura: string;   // HH:MM
  trajanjeMin?: number;
  strankaId?: string;
  kontaktId?: string;
  lokacija?: string;
  videoUrl?: string;
  opomba?: string;
  /* cas zadnje spremembe (ISO) — nujen za sinhronizacijo z oblakom. Stari
     zapisi ga nimajo; takrat velja, da je oblacna razlicica novejsa. */
  updatedAt?: string;
  /* nagrobnik: izbrisan termin se NE odstrani takoj, ampak se oznaci.
     preberiSestanki take zapise odfiltrira, zato tega ni treba upostevati
     nikjer v vmesniku. */
  deletedAt?: string;
}

const STORAGE_KEY = 'pinflow_sestanki';

/* vsi zapisi VKLJUCNO z nagrobniki — samo za sinhronizacijo */
export const preberiSestankiVsi = (): Sestanek[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Napaka pri branju sestankov iz localStorage:', e);
    return [];
  }
};

export const preberiSestanki = (): Sestanek[] => preberiSestankiVsi().filter((s) => !s.deletedAt);

const zapisi = (sestanki: Sestanek[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sestanki));
    /* Javi spremembo, da jo FlowCloudBridge posle v oblak. Dogodek namesto
       neposrednega klica, ker bi uvoz lib/sestankiOblak tu naredil krog
       (sestankiOblak uvaza to datoteko). */
    window.dispatchEvent(new CustomEvent('pinart-sestanki-change'));
  } catch (e) {
    console.error('Napaka pri shranjevanju sestankov v localStorage:', e);
  }
};

/* Doda nov sestanek/klic ali posodobi obstoječega (ujemanje po id). */
export const shraniSestanek = (s: Sestanek): void => {
  const vsi = preberiSestankiVsi();
  const zigosan: Sestanek = { ...s, updatedAt: new Date().toISOString() };
  const obstaja = vsi.some((item) => item.id === zigosan.id);
  const naslednji = obstaja ? vsi.map((item) => (item.id === zigosan.id ? zigosan : item)) : [...vsi, zigosan];
  zapisi(naslednji);
};

/* mehko brisanje — glej Sestanek.deletedAt */
export const izbrisiSestanek = (id: string): void => {
  const cas = new Date().toISOString();
  zapisi(preberiSestankiVsi().map((item) => (item.id === id ? { ...item, deletedAt: cas, updatedAt: cas } : item)));
};

/* zapise celoten seznam (vkljucno z nagrobniki) — uporablja ga sinhronizacija */
export const zapisiSestankeVsi = (sestanki: Sestanek[]): void => zapisi(sestanki);
