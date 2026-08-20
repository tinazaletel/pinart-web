import type { Projekt } from '@/lib/projekti';

export type ProjektDokumentKljuc = 'brief' | 'pitch' | 'swot' | 'raziskava' | 'konkurenca';
export type ProjektDokumentVrsta = {
  kljuc: ProjektDokumentKljuc;
  ime: string;
  jeNaVoljo: (projekt: Projekt, imaBrief: boolean) => boolean;
  datum: (projekt: Projekt) => string | undefined;
};

/* En register za vse projektne dokumente: nov tip pomeni en nov zapis, ne nov
   seznam pogojev v podrobnostih projekta. Canvas se doda posebej, ker je
   poslovni dokument in je s projektom le povezan. */
export const PROJEKTNI_DOKUMENTI: ProjektDokumentVrsta[] = [
  { kljuc: 'brief', ime: 'Brief', jeNaVoljo: (_p, brief) => brief, datum: p => p.updatedAt || p.created },
  { kljuc: 'pitch', ime: 'Pitch', jeNaVoljo: p => !!p.pitch, datum: p => p.pitch?.createdAt || p.updatedAt },
  { kljuc: 'swot', ime: 'SWOT', jeNaVoljo: p => !!p.swot, datum: p => p.swot?.createdAt || p.updatedAt },
  { kljuc: 'raziskava', ime: 'Raziskava stranke', jeNaVoljo: p => !!p.raziskavaStranke, datum: p => p.raziskavaStranke?.createdAt || p.updatedAt },
  { kljuc: 'konkurenca', ime: 'Pregled konkurence', jeNaVoljo: p => !!p.pregledKonkurence, datum: p => p.pregledKonkurence?.createdAt || p.updatedAt },
];
