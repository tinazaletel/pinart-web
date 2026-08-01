export type PostavkaEnota = 'kos' | 'ura' | 'projekt' | 'pavšal' | 'mesec';

export type Postavka = {
  id: string;
  ime: string;
  opis: string;
  cena: number;
  enota: PostavkaEnota;
};

const KLJUC = 'pinart-flow-postavke';
const ENOTE: PostavkaEnota[] = ['kos', 'ura', 'projekt', 'pavšal', 'mesec'];

const jePostavka = (vrednost: unknown): vrednost is Postavka => {
  if (!vrednost || typeof vrednost !== 'object') return false;
  const item = vrednost as Partial<Postavka>;
  return typeof item.id === 'string'
    && typeof item.ime === 'string'
    && typeof item.opis === 'string'
    && typeof item.cena === 'number'
    && Number.isFinite(item.cena)
    && ENOTE.includes(item.enota as PostavkaEnota);
};

export function preberiPostavke(): Postavka[] {
  if (typeof window === 'undefined') return [];
  try {
    const shranjeno: unknown = JSON.parse(localStorage.getItem(KLJUC) || '[]');
    return Array.isArray(shranjeno) ? shranjeno.filter(jePostavka) : [];
  } catch {
    return [];
  }
}

export function shraniPostavke(postavke: Postavka[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KLJUC, JSON.stringify(postavke));
}

export function dodajPostavko(vnos: Omit<Postavka, 'id'>): Postavka {
  const postavka: Postavka = { ...vnos, id: crypto.randomUUID() };
  shraniPostavke([...preberiPostavke(), postavka]);
  return postavka;
}

export function posodobiPostavko(id: string, spremembe: Partial<Omit<Postavka, 'id'>>): Postavka[] {
  const naslednje = preberiPostavke().map(item => item.id === id ? { ...item, ...spremembe } : item);
  shraniPostavke(naslednje);
  return naslednje;
}

export function izbrisiPostavko(id: string): Postavka[] {
  const naslednje = preberiPostavke().filter(item => item.id !== id);
  shraniPostavke(naslednje);
  return naslednje;
}
