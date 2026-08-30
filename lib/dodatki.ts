export type Dodatek = {
  id: string;
  ime: string;
  imeEn: string;
  cena: number;
  enota: 'enkratno' | 'mesec';
  opis: string;
  opisEn: string;
  /* Barva kroga in pot ikone — isti jezik kot storitve v kalkulatorju, kjer
     seznam živi prav zaradi barvnih krogov. Bele kartice na beli podlagi so
     brez tega puste (Tina, 30. 8. 2026). */
  barva: string;
  ikona: string;
};

/* Kartica ni bela: podlaga je barva same postavke pri nizki motnosti, rob pa
   ista barva močneje. Bele kartice na barvni podlagi strani izgledajo prilepljene
   (Tina, 30. 8. 2026: »ne belih kartic«). */
export const mehko = (barva: string) => `${barva}1c`;
export const rob = (barva: string) => `${barva}3d`;

/* Preliv iz barve postavke: močnejši v zgornjem levem kotu, proti dnu skoraj
   izgine. Ravna ploskev je bila pusta, poln preliv pa bi pojedel berljivost —
   zato pade hitro in se konča skoraj pri belem. */
export const preliv = (barva: string) =>
  `linear-gradient(145deg, ${barva}33 0%, ${barva}14 46%, ${barva}08 100%)`;

export const DODATKI: readonly Dodatek[] = [
  {
    id: 'pregledi-5',
    ime: '5 pregledov podjetij',
    imeEn: '5 company checks',
    cena: 12,
    enota: 'enkratno',
    opis: '2,40 € na pregled',
    opisEn: '€2.40 per check',
    barva: '#7c5cf0',
    ikona: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5',
  },
  {
    id: 'pregledi-20',
    ime: '20 pregledov podjetij',
    imeEn: '20 company checks',
    cena: 39,
    enota: 'enkratno',
    opis: '1,95 € na pregled',
    opisEn: '€1.95 per check',
    barva: '#2f9e8f',
    ikona: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5',
  },
  {
    id: 'pupa-500',
    ime: '500 sporočil Pupe',
    imeEn: '500 Pupa messages',
    cena: 15,
    enota: 'enkratno',
    opis: '0,03 € na sporočilo',
    opisEn: '€0.03 per message',
    barva: '#d4763a',
    ikona: 'M21 12a8 8 0 1 1-3.2-6.4M8 11h8M8 15h5',
  },
  {
    id: 'prostor-10-gb',
    ime: '10 GB prostora',
    imeEn: '10 GB storage',
    cena: 5,
    enota: 'mesec',
    opis: 'Dodaten prostor za datoteke.',
    opisEn: 'Additional file storage.',
    barva: '#c25c8a',
    ikona: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  },
  {
    id: 'polni-sedez',
    ime: 'Polni sedež',
    imeEn: 'Full seat',
    cena: 48,
    enota: 'mesec',
    opis: 'Vse funkcije in lastne kvote.',
    opisEn: 'All features and individual allowances.',
    barva: '#3b7fd4',
    ikona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  },
  {
    id: 'sodelavec',
    ime: 'Sedež za sodelavca',
    imeEn: 'Collaborator seat',
    cena: 15,
    enota: 'mesec',
    opis: 'Projekti, naloge in datoteke brez Pupe, pregledov in računov.',
    opisEn: 'Projects, tasks and files without Pupa, checks or invoicing.',
    barva: '#5f9e35',
    ikona: 'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 21v-1a5.5 5.5 0 0 1 5.5-5.5h3A5.5 5.5 0 0 1 16 20v1M17 6.5a3 3 0 0 1 0 6M18.5 21v-1a5.5 5.5 0 0 0-2-4.2',
  },
] as const;
