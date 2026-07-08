/**
 * Bere anonimne cenovne zapise iz istega Google Sheeta kot /api/cene
 * (locen doGet v Apps Scriptu, zascitel s skrivnim kljucem — glej
 * docs/CENE-WEBHOOK.md §4). Zdruzi jih po storitvi x izkusnji x trgu
 * narocnika in izracuna mediano, da dobis pregled trga namesto surovih
 * vrstic.
 */

type Zapis = {
  submittedAt: string;
  storitve: string;
  izkusnje: string;
  mojTrg: string;
  trgNarocnika: string;
  raba: string;
  izvedbaEUR: number;
  praviceEUR: number;
  valuta: string;
  prilagojeno: string;
};

export type Skupina = {
  kljuc: string;
  storitve: string;
  izkusnje: string;
  trgNarocnika: string;
  stevilo: number;
  mediana: number;
  min: number;
  maks: number;
};

function mediana(vrednosti: number[]): number {
  const s = [...vrednosti].sort((a, b) => a - b);
  const sredina = Math.floor(s.length / 2);
  return s.length % 2 ? s[sredina] : Math.round((s[sredina - 1] + s[sredina]) / 2);
}

export async function pridobiCenovnePodatke(): Promise<{
  napaka?: string;
  skupno: number;
  zadnji?: string;
  skupine: Skupina[];
}> {
  const endpoint = process.env.GOOGLE_SHEETS_CENE_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_CENE_READ_SECRET;
  if (!endpoint || !secret) {
    return { napaka: 'Webhook ali skrivni ključ za branje (GOOGLE_SHEETS_CENE_READ_SECRET) ni nastavljen.', skupno: 0, skupine: [] };
  }

  let vrstice: Zapis[];
  try {
    const res = await fetch(`${endpoint}?secret=${encodeURIComponent(secret)}`, { cache: 'no-store' });
    if (!res.ok) return { napaka: `Sheet ni odgovoril (${res.status}). Preveri, ali je doGet dodan in ponovno objavljen.`, skupno: 0, skupine: [] };
    vrstice = await res.json();
    if (!Array.isArray(vrstice)) throw new Error('ni seznam');
  } catch {
    return { napaka: 'Napaka pri branju iz Google Sheeta.', skupno: 0, skupine: [] };
  }

  const skupine = new Map<string, { storitve: string; izkusnje: string; trgNarocnika: string; zneski: number[] }>();
  for (const v of vrstice) {
    const znesek = Number(v.izvedbaEUR);
    if (!znesek) continue;
    const kljuc = `${v.storitve}|${v.izkusnje}|${v.trgNarocnika}`;
    if (!skupine.has(kljuc)) {
      skupine.set(kljuc, { storitve: v.storitve, izkusnje: v.izkusnje, trgNarocnika: v.trgNarocnika, zneski: [] });
    }
    skupine.get(kljuc)!.zneski.push(znesek);
  }

  const rezultat: Skupina[] = [...skupine.entries()]
    .map(([kljuc, s]) => ({
      kljuc, storitve: s.storitve, izkusnje: s.izkusnje, trgNarocnika: s.trgNarocnika,
      stevilo: s.zneski.length, mediana: mediana(s.zneski),
      min: Math.min(...s.zneski), maks: Math.max(...s.zneski),
    }))
    .sort((a, b) => b.stevilo - a.stevilo);

  const zadnji = vrstice.length ? vrstice[vrstice.length - 1].submittedAt : undefined;
  return { skupno: vrstice.length, zadnji, skupine: rezultat };
}
