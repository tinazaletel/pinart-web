import type { Projekt } from '@/lib/projekti';

export type ProjektDokumentKljuc = 'pitch' | 'swot' | 'raziskava' | 'konkurenca';
export type ProjektDokumentVrsta = {
  kljuc: ProjektDokumentKljuc;
  ime: string;
  jeNaVoljo: (projekt: Projekt) => boolean;
  datum: (projekt: Projekt) => string | undefined;
};

/* En register za vse projektne dokumente: nov tip pomeni en nov zapis, ne nov
   seznam pogojev v podrobnostih projekta. Canvas se doda posebej, ker je
   poslovni dokument in je s projektom le povezan.

   Briefa tu NI, cetudi bi ga clovek pricakoval. Brief ni datoteka, ampak so
   polja samega projekta (zelje, stranka, panoga, ciljna publika, cilji) --
   projekt jih ima ali nima, generira jih nihce. Ker jih kartica
   BRIEF - ZELJE STRANKE ze prikazuje, se je tu izpisal se drugic in je bilo
   videti, kot da projekt ze ima dokument, ki ga uporabnica ni nikoli povezala.
   Tu spadajo samo stvari, ki nastanejo -- torej jih ali je ali jih ni. */
export const PROJEKTNI_DOKUMENTI: ProjektDokumentVrsta[] = [
  { kljuc: 'pitch', ime: 'Pitch', jeNaVoljo: p => !!p.pitch, datum: p => p.pitch?.createdAt || p.updatedAt },
  { kljuc: 'swot', ime: 'SWOT', jeNaVoljo: p => !!p.swot, datum: p => p.swot?.createdAt || p.updatedAt },
  { kljuc: 'raziskava', ime: 'Raziskava stranke', jeNaVoljo: p => !!p.raziskavaStranke, datum: p => p.raziskavaStranke?.createdAt || p.updatedAt },
  { kljuc: 'konkurenca', ime: 'Pregled konkurence', jeNaVoljo: p => !!p.pregledKonkurence, datum: p => p.pregledKonkurence?.createdAt || p.updatedAt },
];
