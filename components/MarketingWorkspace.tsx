'use client';

import Link from 'next/link';
import VprasalnikiPanel from './VprasalnikiPanel';
import MarketingZaporedjePanel, { type Zaporedje } from './MarketingZaporedjePanel';
import MobTabs from '@/components/MobTabs';
import { useLocale } from 'next-intl';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CalendarBlank,
  Check,
  CheckSquare,
  Code,
  EnvelopeSimple,
  Megaphone,
  PaintBrushBroad,
  PencilSimple,
  Plus,
  ShareNetwork,
  Sparkle,
  Trash,
  X,
} from '@phosphor-icons/react';
import {
  MARKETING_PREDLOGE,
  novaMarketingKampanja,
  novaObjava,
  preberiMarketingKampanje,
  preberiObjave,
  shraniMarketingKampanje,
  shraniObjave,
  type MarketingKampanja,
  type MarketingPredloga,
  type MarketingStatus,
  type MarketingObjava,
  type MarketingVrsta,
  type KampanjaKorak,
} from '@/lib/marketing';
import { preberiProjekti, type Projekt } from '@/lib/projekti';
import { getAccessTier } from '@/lib/pinartFlowEntitlements';
import { shraniOsnutek } from '@/lib/komOsnutek';
import { popraviZaporedje, pripraviZaporedje, type PupaPredlog } from '@/lib/pupaZaporedje';
import Image from 'next/image';
import { demoMarketing, usePredogled } from '@/lib/predogled';
import styles from './MarketingWorkspace.module.css';
import { preberiNaloge, shraniNaloge, type Naloga } from '@/lib/naloge';

/* Zavihka Pregled ni vec: kazal je iste kampanje kot Kampanje, le s stevci nad
   njimi — »trenutno mi ni vidne razlike« (Tina, 1. 9. 2026). Stevci in prazno
   stanje sta se preselila v Kampanje. */
type Zavihek = 'objave' | 'kampanje' | 'predloge' | 'povezave' | 'vprasalniki';

/* NAČRTOVALEC OBJAV JE ZA LANSIRANJE SKRIT (Tina, 31. 8. 2026).
 *
 * Meta Business Suite ima nacrt, koledar in razporejanje objav zastonj — in za
 * razliko od nas tudi res objavi. Dokler Flow ne objavlja ZA STRANKE iz enega
 * mesta (kar zahteva Meta App Review), bi tu ponujali slabso razlicico necesa,
 * kar uporabnica ze ima. Koda ostane cela; vrne se s spremembo te vrednosti na
 * true — z njo se vrne tudi predloga »Lansiranje nove storitve«, ki vodi vanj. */
const OBJAVE_VIDNE = false;

/* POVEZAVE SO ZA LANSIRANJE SKRITE (Tina, 1. 9. 2026: »kaj mi nucajo te
   povezave?«). V zavihku so bili naslovi profilov (rabijo jih skrite Objave),
   dva opisa tega, kar Flow itak dela sam, ena obljuba in povezava na Metino
   orodje — torej zavihek obljub. Vrne se skupaj z Objavami. */
const POVEZAVE_VIDNE = OBJAVE_VIDNE;
type SocialKanal = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x' | 'threads' | 'pinterest';
type Kanal = SocialKanal | 'lasten';
type NacrtovanaObjava = MarketingObjava & { kanal: Kanal };

const KANALI_KLJUC = 'pinart-flow-marketing-kanali-v1';
const SOCIAL_LINKI: Record<SocialKanal, string> = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  linkedin: 'https://www.linkedin.com/feed/',
  tiktok: 'https://www.tiktok.com/',
  youtube: 'https://studio.youtube.com/',
  x: 'https://x.com/',
  threads: 'https://www.threads.net/',
  pinterest: 'https://www.pinterest.com/',
};
const SOCIAL_OZNAKE: Record<SocialKanal, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X (Twitter)',
  threads: 'Threads',
  pinterest: 'Pinterest',
};

const PRAZEN = {
  naslov: '',
  vrsta: 'email' as MarketingVrsta,
  status: 'osnutek' as MarketingStatus,
  datumOd: '',
  datumDo: '',
  opis: '',
  projekt: '',
};

type Prevod = (sl: string, en: string) => string;

const oznakeVrste = (L: Prevod): Record<MarketingVrsta, string> => ({
  email: L('E-pošta', 'Email'),
  vprasalnik: L('Vprašalnik', 'Questionnaire'),
  social: L('Družbena omrežja', 'Social media'),
});

const oznakeStatusa = (L: Prevod): Record<MarketingStatus, string> => ({
  osnutek: L('Osnutek', 'Draft'),
  nacrtovano: L('Načrtovano', 'Planned'),
  aktivno: L('Aktivno', 'Active'),
  zakljuceno: L('Zaključeno', 'Completed'),
});

function formatirajRazpon(kampanja: MarketingKampanja, L: Prevod) {
  const od = kampanja.datumOd || kampanja.datum;
  const doDatuma = kampanja.datumDo || kampanja.datum;
  const formatiraj = (datum: string) => new Date(`${datum}T12:00:00`).toLocaleDateString('sl-SI');

  if (!od && !doDatuma) return L('Brez obdobja', 'No period');
  if (od && doDatuma && od !== doDatuma) return `${formatiraj(od)}–${formatiraj(doDatuma)}`;
  return formatiraj(od || doDatuma!);
}

function IkonaVrste({ vrsta, size = 20 }: { vrsta: MarketingVrsta; size?: number }) {
  if (vrsta === 'email') return <EnvelopeSimple size={size} aria-hidden="true" />;
  if (vrsta === 'vprasalnik') return <Code size={size} aria-hidden="true" />;
  return <ShareNetwork size={size} aria-hidden="true" />;
}

export default function MarketingWorkspace({ base }: { base: string }) {
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);
  const dl = locale === 'en' ? 'en-GB' : 'sl-SI';
  const vrsteOznake = oznakeVrste(L);
  const statusiOznake = oznakeStatusa(L);
  const [zavihek, setZavihek] = useState<Zavihek>('kampanje');
  /* Predogled: demo mora izgledati poln, prazno stanje pa prazno — sicer
     nobeden od obeh ne pokaze, kar mora (Tina, 31. 8. 2026). */
  const [nacin] = usePredogled();
  const [kampanje, setKampanje] = useState<MarketingKampanja[]>([]);
  const [obrazecOdprt, setObrazecOdprt] = useState(false);
  const [urejamId, setUrejamId] = useState<string | null>(null);
  const [obrazec, setObrazec] = useState(PRAZEN);
  const [objave, setObjave] = useState<NacrtovanaObjava[]>([]);
  /* Kampanja in objava sta lahko vezani na projekt (Tina, 31. 8. 2026):
     brez tega je bil marketing otok, ki ni vedel, za koga dela. */
  const [projekti, setProjekti] = useState<Projekt[]>([]);
  /* Brez plačljivega paketa Pupe ni: takrat panel ne kaže klepeta, ampak samo
     obrazec s predlogo — »za tistega, ki nima AI, pa ok« (Tina, 1. 9. 2026). */
  const [imaPupo, setImaPupo] = useState(false);
  useEffect(() => { void getAccessTier().then(t => setImaPupo(t === 'pro')); }, []);
  useEffect(() => { try { setProjekti(preberiProjekti()); } catch { setProjekti([]); } }, []);
  /* Zaporedje sporocil se ureja v desnem panelu, ne v majhnem polju za opis. */
  const [zapOdprt, setZapOdprt] = useState(false);
  const [zapUvod, setZapUvod] = useState<string | undefined>(undefined);
  const [zap, setZap] = useState<{
    id?: string; naslov: string; vrsta: MarketingVrsta; status: MarketingStatus;
    datumOd: string; projekt: string; opis: string; koraki: KampanjaKorak[];
  }>({ id: undefined, naslov: '', vrsta: 'email', status: 'nacrtovano', datumOd: '', projekt: '', opis: '', koraki: [] });
  const [objava, setObjava] = useState<{ kanal: Kanal; kanalIme: string; kanalUrl: string; naslov: string; besedilo: string; datum: string; projekt: string }>({ kanal: 'instagram', kanalIme: '', kanalUrl: '', naslov: '', besedilo: '', datum: '', projekt: '' });
  const [profilniNaslovi, setProfilniNaslovi] = useState<Partial<Record<SocialKanal, string>>>({});
  const [kopiranoId, setKopiranoId] = useState<string | null>(null);

  useEffect(() => {
    /* V demu izlozba, v »prazno« res prazno, sicer tvoji podatki. */
    if (nacin === 'demo') { setKampanje(demoMarketing()); setObjave([]); return; }
    if (nacin === 'empty') { setKampanje([]); setObjave([]); return; }
    if (nacin === 'zacetek') { setKampanje(demoMarketing().slice(0, 2)); setObjave([]); return; }
    setKampanje(preberiMarketingKampanje());
    try {
      setObjave(preberiObjave() as NacrtovanaObjava[]);
      const kanali = window.localStorage.getItem(KANALI_KLJUC);
      setProfilniNaslovi(kanali ? JSON.parse(kanali) : {});
    } catch { setObjave([]); }
  }, [nacin]);

  useEffect(() => {
    if (!obrazecOdprt) return;
    const zapri = (dogodek: KeyboardEvent) => dogodek.key === 'Escape' && setObrazecOdprt(false);
    document.addEventListener('keydown', zapri);
    return () => document.removeEventListener('keydown', zapri);
  }, [obrazecOdprt]);

  const aktivne = useMemo(
    () => kampanje.filter((kampanja) => kampanja.status === 'aktivno' || kampanja.status === 'nacrtovano').length,
    [kampanje],
  );

  const povzetek = useMemo(() => {
    const stevci = kampanje.reduce<Record<MarketingStatus, number>>(
      (rezultat, kampanja) => ({ ...rezultat, [kampanja.status]: rezultat[kampanja.status] + 1 }),
      { osnutek: 0, nacrtovano: 0, aktivno: 0, zakljuceno: 0 },
    );
    const danes = new Date().toISOString().slice(0, 10);
    const naslednja = [...kampanje]
      .filter((kampanja) => (kampanja.datumOd || kampanja.datum || '') >= danes)
      .sort((a, b) => (a.datumOd || a.datum || '').localeCompare(b.datumOd || b.datum || ''))[0];
    return { stevci, naslednja };
  }, [kampanje]);

  /* Kaj caka: osnutki, ki jim manjka datum, in kampanje z blizajocim rokom.
     Najvec tri — seznam, ki ga ne prebereš, ni seznam. */
  const caka = useMemo(() => {
    const danes = new Date().toISOString().slice(0, 10);
    const vrstice: Array<{ id: string; naslov: string; opis: string; nujno: boolean; odpri: () => void }> = [];
    for (const k of kampanje) {
      if (k.status === 'zakljuceno') continue;
      const datum = k.datumOd || k.datum || '';
      if (k.status === 'osnutek' && !datum) {
        /* Osnutek brez datuma je tisto, kar res caka na TVOJO potezo. */
        vrstice.push({ id: k.id, naslov: k.naslov, opis: L('manjka datum', 'date missing'), nujno: true, odpri: () => uredi(k) });
      } else if (datum && datum >= danes) {
        vrstice.push({ id: k.id, naslov: k.naslov, opis: formatirajRazpon(k, L), nujno: false, odpri: () => uredi(k) });
      }
    }
    return vrstice.slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kampanje, locale]);

  /* Kampanja NI obrazec z naslovom in datumom — je zaporedje korakov z roki.
     Zato gre tudi nova kampanja v isti desni panel (Tina, 31. 8. 2026:
     »a je lansiranje kampanje res sam en beden obrazec«). */
  const odpriNovo = (vrsta: MarketingVrsta = 'email') => {
    setZap({
      id: undefined, naslov: '', vrsta, status: 'osnutek',
      datumOd: cezDni(0), projekt: '', opis: '',
      koraki: [{ zamikDni: 0, naslov: '', besedilo: '' }],
    });
    setZapUvod(undefined);
    setZapOdprt(true);
  };

  /* Predloga mora nekaj USTVARITI, ne le odpreti praznega obrazca
     (Tina, 31. 8. 2026: »te predloge niso predloge«).
       - vprasalnik: pelje v Vprasalnike na pravi nabor, ker je prava stvar ze tam
       - objave: naredi kampanjo IN tri nacrtovane objave z datumi
       - kampanja: odpre obrazec z zapisanim zaporedjem sporocil in roki */
  /* Pupa pise vsebino TU, s kontekstom projekta in stranke — to je edina
     razlika do pogovora z zunanjim botom (Tina, 31. 8. 2026: »zakaj bi tole
     imela«). Brez tega je nacrtovalec samo obrazec. */
  const [pupaDela, setPupaDela] = useState<string | null>(null);
  const [pupaNapaka, setPupaNapaka] = useState('');

  const kontekstProjekta = (id?: string) => {
    const pr = projekti.find(x => x.id === id);
    if (!pr) return '';
    return `Projekt: ${pr.naslov}${pr.strankaIme ? `; stranka: ${pr.strankaIme}` : ''}${pr.opis ? `; opis: ${pr.opis.slice(0, 300)}` : ''}`;
  };

  async function vprasajPupo(kljuc: string, vprasanje: string, kontekst: string): Promise<string | null> {
    setPupaNapaka('');
    setPupaDela(kljuc);
    try {
      const r = await fetch('/api/pupa', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vprasanje, kontekst }),
      });
      const d = await r.json();
      if (d.napaka) { setPupaNapaka(String(d.napaka)); return null; }
      if (d.brezKljuca) { setPupaNapaka(String(d.odgovor || '')); return null; }
      return String(d.odgovor || '').trim() || null;
    } catch {
      setPupaNapaka(L('Pupa se ni odzvala. Poskusi znova.', 'Pupa did not respond. Try again.'));
      return null;
    } finally {
      setPupaDela(null);
    }
  }

  const pupaNapisiObjavo = async () => {
    const kanal = oznakaKanala({ kanal: objava.kanal, kanalIme: objava.kanalIme } as NacrtovanaObjava);
    const vprasanje = `Napiši objavo za ${kanal}.${objava.naslov ? ` Tema: ${objava.naslov}.` : ''}`
      + ' Piši v slovenščini, 3 do 5 povedi, brez oklepajev z navodili, brez hashtagov,'
      + ' konec naj bo jasen poziv k dejanju. Vrni SAMO besedilo objave, brez uvoda in brez narekovajev.';
    const odgovor = await vprasajPupo('objava', vprasanje, kontekstProjekta(objava.projekt));
    if (odgovor) setObjava(o => ({ ...o, besedilo: odgovor }));
  };

  const pupaNapisiKorak = async (k: KampanjaKorak, projekt: string, kljuc: string) => {
    const kdaj = k.zamikDni === 0 ? 'takoj ob začetku' : `${k.zamikDni} dni po začetku`;
    /* Kar je ze v polju, je NAVODILO, ne besedilo za popravljanje: Tina je
       vanj napisala »napiši mi sporočilo, predlagaj mi prvo kampanjo«
       (1. 9. 2026). Ce je polje prazno, se opremo na naslov koraka. */
    const navodilo = k.besedilo.trim();
    const vprasanje = `Napiši e-poštno sporočilo stranki, ki gre ven ${kdaj}.`
      + (navodilo ? ` Moje navodilo: ${navodilo}.` : '')
      + (k.naslov ? ` Namen sporočila: ${k.naslov}.` : '')
      + ' Piši v slovenščini, toplo in kratko, največ 6 povedi, brez pozdravnih fraz v oglatih oklepajih.'
      + ' Vrni SAMO besedilo sporočila, brez zadeve in brez narekovajev.';
    return vprasajPupo(kljuc, vprasanje, kontekstProjekta(projekt));
  };

  /* Korak dobi rok v Nalogah in Koledarju — zato se zaporedje res zgodi. */
  const nalogaIzKoraka = (k: KampanjaKorak, z: Zaporedje): string | null => {
    if (k.nalogaId) return null;
    const zac = z.datumOd ? new Date(`${z.datumOd}T12:00:00`) : new Date();
    zac.setDate(zac.getDate() + k.zamikDni);
    const naloga: Naloga = {
      id: crypto.randomUUID(),
      naslov: `${z.naslov || L('Kampanja', 'Campaign')} · ${k.naslov || L('sporočilo', 'message')}`,
      opis: k.besedilo, stolpec: 'todo', rok: zac.toISOString().slice(0, 10),
      created: new Date().toISOString(), oznake: ['marketing', 'zaporedje'],
    };
    shraniNaloge([naloga, ...preberiNaloge()]);
    return naloga.id;
  };

  /* Sporocilo se odpre v Komunikaciji z ze vpisanim naslovnikom in besedilom. */
  const sporociloIzKoraka = (k: KampanjaKorak, z: Zaporedje) => {
    const pr = projekti.find(x => x.id === z.projekt);
    shraniOsnutek({
      za: '', zadeva: k.naslov || z.naslov, telo: k.besedilo,
      projekt: pr?.naslov || '',
    });
    window.location.href = `${base}/kalkulator/komunikacija`;
  };

  /* Pripravljeno za skupno Pupo: ko bo njen klepet pisal naravnost v panel,
     bosta ti dve funkciji njegov most (Tina, 1. 9. 2026). Zaenkrat ju ne kliče
     nihče, zato sta izvožena prek okna, da ne odpadeta iz gradnje. */
  const vPredlog = (z: { naslov: string; koraki: KampanjaKorak[] }): PupaPredlog =>
    ({ naslov: z.naslov, koraki: z.koraki });

  /* Popravek iz panela: Pupa vrne CELO zaporedje, panel ga prevzame. */
  const pupaPopravi = async (navodilo: string, trenutno: Zaporedje) => {
    setPupaNapaka('');
    const jePrazno = !trenutno.koraki.some(k => k.naslov || k.besedilo);
    const kontekst = kontekstProjekta(trenutno.projekt);
    const { predlog, napaka } = jePrazno
      ? await pripraviZaporedje(navodilo, kontekst)
      : await popraviZaporedje(navodilo, vPredlog(trenutno), kontekst);
    if (napaka || !predlog) { setPupaNapaka(napaka || ''); return null; }
    return {
      zaporedje: {
        ...trenutno,
        naslov: predlog.naslov || trenutno.naslov,
        opis: predlog.povzetek || trenutno.opis,
        koraki: predlog.koraki,
      },
      odgovor: predlog.povzetek || 'Pripravila sem zaporedje — poglej desno in mi povej, kaj popravim.',
    };
  };

  useEffect(() => {
    (window as unknown as { pupaKampanja?: unknown }).pupaKampanja = { pupaPopravi, pupaNapisiKorak, pupaNapisiObjavo };
  });

  const imeProjekta = (id?: string) => (id ? projekti.find(pr => pr.id === id)?.naslov || '' : '');

  const cezDni = (dni: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dni);
    return d.toISOString().slice(0, 10);
  };

  const uporabiPredlogo = (predloga: MarketingPredloga) => {
    const koraki = predloga.koraki || [];
    const zadnji = koraki.length ? koraki[koraki.length - 1].zamikDni : 14;

    if (predloga.cilj === 'objave') {
      /* Kampanja drzi celoto, objave pa so tisto, kar res pride ven. */
      const kampanja = novaMarketingKampanja({
        naslov: predloga.naslov, vrsta: predloga.vrsta, status: 'nacrtovano',
        datumOd: cezDni(0), datumDo: cezDni(zadnji), opis: predloga.opis,
      });
      const naslednjeKampanje = [kampanja, ...kampanje];
      setKampanje(naslednjeKampanje);
      shraniMarketingKampanje(naslednjeKampanje);

      const nove = koraki.map(k => novaObjava({
        kanal: objava.kanal, kanalIme: objava.kanalIme || undefined, kanalUrl: objava.kanalUrl || undefined,
        naslov: k.naslov, besedilo: k.besedilo, datum: cezDni(k.zamikDni), projekt: objava.projekt || undefined,
      }) as NacrtovanaObjava);
      const naslednjeObjave = [...nove, ...objave];
      setObjave(naslednjeObjave);
      shraniObjave(naslednjeObjave);
      setZavihek('objave');
      return;
    }

    /* Zaporedje sporocil: vsak korak je svoj blok v desnem panelu. */
    setZap({
      id: undefined, naslov: predloga.naslov, vrsta: predloga.vrsta, status: 'nacrtovano',
      datumOd: cezDni(0), projekt: '', opis: predloga.opis, koraki: koraki.map(k => ({ ...k })),
    });
    setZapUvod(L(
      `Vzela sem predlogo »${predloga.naslov}«. Povej mi, za koga je in kaj želiš doseči, pa jo prilagodim.`,
      `I started from the “${predloga.naslov}” template. Tell me who it is for and what you want to achieve, and I will adapt it.`,
    ));
    setZapOdprt(true);
  };

  const shraniZaporedje = (osnutek: Zaporedje) => {
    const zadnji = osnutek.koraki.length ? Math.max(...osnutek.koraki.map(k => k.zamikDni)) : 14;
    const vrednosti = {
      naslov: osnutek.naslov, vrsta: osnutek.vrsta, status: osnutek.status,
      datumOd: osnutek.datumOd, datumDo: cezDni(zadnji), opis: osnutek.opis,
      projekt: osnutek.projekt || undefined, koraki: osnutek.koraki,
    };
    const naslednje = osnutek.id
      ? kampanje.map(k => k.id === osnutek.id ? { ...k, ...vrednosti } : k)
      : [{ ...novaMarketingKampanja(vrednosti), koraki: osnutek.koraki, projekt: osnutek.projekt || undefined }, ...kampanje];
    setKampanje(naslednje);
    shraniMarketingKampanje(naslednje);
    setZapOdprt(false);
    setZavihek('kampanje');
  };

  const uredi = (kampanja: MarketingKampanja) => {
    setZap({
      id: kampanja.id, naslov: kampanja.naslov, vrsta: kampanja.vrsta, status: kampanja.status,
      datumOd: kampanja.datumOd || kampanja.datum || '', projekt: kampanja.projekt || '',
      opis: kampanja.opis || '',
      koraki: (kampanja.koraki || []).map(k => ({ ...k })),
    });
    setZapOdprt(true);
  };

  const shrani = (dogodek: FormEvent) => {
    dogodek.preventDefault();
    const naslednje = urejamId
      ? kampanje.map((kampanja) => kampanja.id === urejamId ? { ...kampanja, ...obrazec } : kampanja)
      : [novaMarketingKampanja(obrazec), ...kampanje];
    setKampanje(naslednje);
    shraniMarketingKampanje(naslednje);
    setObrazecOdprt(false);
    setZavihek('kampanje');
  };

  const izbrisi = (id: string) => {
    const naslednje = kampanje.filter((kampanja) => kampanja.id !== id);
    setKampanje(naslednje);
    shraniMarketingKampanje(naslednje);
  };

  const shraniObjavo = (dogodek: FormEvent) => {
    dogodek.preventDefault();
    const nova = novaObjava(objava) as NacrtovanaObjava;
    const naslednje = [nova, ...objave];
    setObjave(naslednje);
    shraniObjave(naslednje);
    setObjava({ kanal: objava.kanal, kanalIme: objava.kanalIme, kanalUrl: objava.kanalUrl, naslov: '', besedilo: '', datum: '', projekt: objava.projekt });
  };

  const izbrisiObjavo = (id: string) => {
    const naslednje = objave.filter((vnos) => vnos.id !== id);
    setObjave(naslednje);
    shraniObjave(naslednje);
  };

  const kopirajObjavo = async (vnos: NacrtovanaObjava) => {
    await navigator.clipboard.writeText(vnos.besedilo);
    setKopiranoId(vnos.id);
    window.setTimeout(() => setKopiranoId((trenutni) => trenutni === vnos.id ? null : trenutni), 1800);
  };

  const shraniProfilneNaslove = () => window.localStorage.setItem(KANALI_KLJUC, JSON.stringify(profilniNaslovi));
  const oznakaKanala = (vnos: Pick<NacrtovanaObjava, 'kanal' | 'kanalIme'>) => vnos.kanal === 'lasten' ? (vnos.kanalIme || L('Lasten kanal', 'Custom channel')) : SOCIAL_OZNAKE[vnos.kanal];
  const naslovKanala = (vnos: NacrtovanaObjava) => vnos.kanal === 'lasten' ? vnos.kanalUrl : (profilniNaslovi[vnos.kanal] || SOCIAL_LINKI[vnos.kanal]);
  const ustvariNalogo = (vnos: NacrtovanaObjava) => {
    if (vnos.nalogaId) return;
    const zdaj = new Date().toISOString();
    const naloga: Naloga = { id: crypto.randomUUID(), naslov: vnos.naslov?.trim() || `${oznakaKanala(vnos)} · ${vnos.besedilo.trim().slice(0, 70)}`, opis: vnos.besedilo, stolpec: 'todo', rok: vnos.datum, created: zdaj, oznake: ['marketing', 'objava'] };
    shraniNaloge([naloga, ...preberiNaloge()]);
    const naslednje = objave.map(o => o.id === vnos.id ? { ...o, nalogaId: naloga.id } : o);
    setObjave(naslednje); shraniObjave(naslednje);
  };

  const Objave = () => (
    <section className={styles.postPlanner} aria-labelledby="objave-naslov">
      <header className={styles.sectionHeader}>
        <div><p className={styles.sectionLabel}>{L('NAČRTOVALEC OBJAV', 'POST PLANNER')}</p><h2 id="objave-naslov">{L('Pripravi. Kopiraj. Objavi.', 'Prepare. Copy. Post.')}</h2><p>{L('Flow pripravi načrt; objavo na omrežju vedno potrdiš in objaviš sama.', 'Flow prepares the plan; you always confirm and publish the post to the network yourself.')}</p></div>
        <span className={styles.betaNote}>{L('AI predlogi · kmalu (beta)', 'AI suggestions · coming soon (beta)')}</span>
      </header>
      <div className={styles.plannerGrid}>
        <form className={styles.postForm} onSubmit={shraniObjavo}>
          <label>{L('Kanal', 'Channel')}<select value={objava.kanal} onChange={(e) => setObjava({ ...objava, kanal: e.target.value as Kanal })}>{(Object.keys(SOCIAL_OZNAKE) as SocialKanal[]).map((k) => <option key={k} value={k}>{SOCIAL_OZNAKE[k]}</option>)}<option value="lasten">{L('Lasten kanal …', 'Custom channel …')}</option></select></label>
          {objava.kanal === 'lasten' && <><label>{L('Ime kanala', 'Channel name')}<input required value={objava.kanalIme} onChange={e => setObjava({ ...objava, kanalIme: e.target.value })} placeholder={L('Npr. Novičnik', 'E.g. Newsletter')} /></label><label>{L('Naslov (neobvezno)', 'URL (optional)')}<input type="url" value={objava.kanalUrl} onChange={e => setObjava({ ...objava, kanalUrl: e.target.value })} placeholder="https://…" /></label></>}
          <label>{L('Naslov objave', 'Post title')}<input required value={objava.naslov} onChange={e => setObjava({ ...objava, naslov: e.target.value })} placeholder={L('Npr. Nova identiteta hotela', 'E.g. New hotel identity')} /></label>
          <label>{L('Datum objave', 'Post date')}<input required type="date" value={objava.datum} onChange={(e) => setObjava({ ...objava, datum: e.target.value })} />{objava.datum && <small style={{ display: 'block', marginTop: '.3rem', fontSize: '.72rem', color: 'rgba(17,17,17,.72)' }}>{new Date(objava.datum + 'T00:00:00').toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small>}</label>
          <label>{L('Projekt', 'Project')}<select value={objava.projekt} onChange={(e) => setObjava({ ...objava, projekt: e.target.value })}><option value="">{L('Brez projekta', 'No project')}</option>{projekti.map(pr => <option key={pr.id} value={pr.id}>{pr.naslov}</option>)}</select></label>
          <label className={styles.captionField}>{L('Besedilo objave', 'Post text')}<textarea required value={objava.besedilo} onChange={(e) => setObjava({ ...objava, besedilo: e.target.value })} placeholder={L('Napiši uvod, glavno sporočilo in jasen naslednji korak …', 'Write an intro, the main message and a clear next step …')} /></label>
          <div className={styles.pupaVrsta}>
            <button type="button" onClick={pupaNapisiObjavo} disabled={pupaDela !== null}>
              <Sparkle size={16} weight="fill" />
              {pupaDela === 'objava' ? L('Pupa piše …', 'Pupa is writing …') : L('Pupa naj napiše objavo', 'Let Pupa write the post')}
            </button>
            <small>{L('Pupa pozna projekt in stranko, ki ju izbereš zgoraj.', 'Pupa knows the project and client you pick above.')}</small>
          </div>
          {pupaNapaka && <p className={styles.zapNapaka} role="alert">{pupaNapaka}</p>}
          <p className={styles.manualNote}>{L('Flow vsebine ne objavi samodejno. Po shranjevanju jo kopiraš in odpreš izbrano omrežje.', 'Flow does not post content automatically. After saving, you copy it and open the chosen network.')}</p>
          <button className={styles.primary} type="submit">{L('Shrani načrtovano objavo', 'Save planned post')}</button>
        </form>
        <div className={styles.postList} aria-live="polite">
          {objave.length === 0 ? <div className={styles.postEmpty}><ShareNetwork size={30} /><strong>{L('Še nimaš načrtovanih objav.', 'You have no planned posts yet.')}</strong><p>{L('Prva se bo po shranjevanju prikazala tukaj.', 'The first one will appear here after you save it.')}</p></div> : objave.map((vnos) => (
            <article className={styles.postCard} key={vnos.id}>
              <header><span>{oznakaKanala(vnos)}</span>{imeProjekta(vnos.projekt) && <span className={styles.projektZnacka}>{imeProjekta(vnos.projekt)}</span>}<time dateTime={vnos.datum}>{new Date(`${vnos.datum}T12:00:00`).toLocaleDateString(dl)}</time></header>
              {vnos.naslov && <h3>{vnos.naslov}</h3>}<p>{vnos.besedilo}</p>
              <div className={styles.postActions}>
                <button className={styles.secondary} type="button" onClick={() => kopirajObjavo(vnos)}>{kopiranoId === vnos.id ? <Check size={18} /> : <Code size={18} />}{kopiranoId === vnos.id ? L('Kopirano', 'Copied') : L('Kopiraj besedilo', 'Copy text')}</button>
                {naslovKanala(vnos) && <a className={styles.primary} href={naslovKanala(vnos)} target="_blank" rel="noreferrer">{L('Odpri', 'Open')} {oznakaKanala(vnos)} <ArrowRight size={18} /></a>}
                <button className={styles.secondary} type="button" disabled={Boolean(vnos.nalogaId)} onClick={() => ustvariNalogo(vnos)}><CheckSquare size={18} />{vnos.nalogaId ? L('Naloga ustvarjena', 'Task created') : L('Ustvari nalogo', 'Create task')}</button>
                <button className={styles.iconButton} type="button" onClick={() => izbrisiObjavo(vnos.id)} aria-label={L('Izbriši načrtovano objavo', 'Delete planned post')}><Trash size={19} /></button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  const Kampanje = () => (
    <section className={styles.campaigns} aria-labelledby="kampanje-naslov">
      <header className={styles.sectionHeader}>
        <div>
          {/* Brez drugega serifnega naslova: »Od zamisli do objave« je tekmoval
              z naslovom strani (Tina, 31. 8. 2026). */}
          <p className={styles.sectionLabel} id="kampanje-naslov">{L('KAMPANJE', 'CAMPAIGNS')}</p>
          <p>{kampanje.length === 0 ? L('Prva kampanja se začne z enim jasnim ciljem.', 'The first campaign starts with one clear goal.') : L(`${aktivne} aktivnih ali načrtovanih · ${kampanje.length} skupaj`, `${aktivne} active or planned · ${kampanje.length} total`)}</p>
        </div>
        <button className={styles.secondary} type="button" onClick={() => odpriNovo()}><Plus size={18} /> {L('Nova kampanja', 'New campaign')}</button>
      </header>
      {kampanje.length === 0 ? (
        <div className={styles.empty}>
          <Megaphone size={34} aria-hidden="true" />
          <strong>{L('Tu bodo tvoje kampanje.', 'Your campaigns will live here.')}</strong>
          <p>{L('Izberi predlogo ali začni prazno. Osnutek se shrani v tvojem brskalniku.', 'Pick a template or start blank. The draft is saved in your browser.')}</p>
          <button className={styles.primary} type="button" onClick={() => setZavihek('predloge')}>{L('Poglej predloge', 'View templates')} <ArrowRight size={18} /></button>
        </div>
      ) : (
        <div className={styles.campaignList}>
          {kampanje.map((kampanja) => (
            <article className={styles.campaignRow} key={kampanja.id}>
              <span className={styles.campaignIcon} data-vrsta={kampanja.vrsta}><IkonaVrste vrsta={kampanja.vrsta} /></span>
              <span className={styles.campaignTitle}>
                <strong>{kampanja.naslov}</strong>
                <small>{vrsteOznake[kampanja.vrsta]}{imeProjekta(kampanja.projekt) ? ` · ${imeProjekta(kampanja.projekt)}` : ''}{kampanja.opis ? ` · ${kampanja.opis}` : ''}</small>
              </span>
              <span className={styles.campaignDate}>{formatirajRazpon(kampanja, L)}</span>
              <span className={styles.status} data-status={kampanja.status}>{statusiOznake[kampanja.status]}</span>
              <span className={styles.rowActions}>
                <button className={styles.iconButton} type="button" onClick={() => uredi(kampanja)} aria-label={L(`Uredi ${kampanja.naslov}`, `Edit ${kampanja.naslov}`)}><PencilSimple size={19} /></button>
                <button className={styles.iconButton} type="button" onClick={() => izbrisi(kampanja.id)} aria-label={L(`Izbriši ${kampanja.naslov}`, `Delete ${kampanja.naslov}`)}><Trash size={19} /></button>
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const Predloge = () => (
    <section className={styles.templates} aria-labelledby="predloge-naslov">
      <header className={styles.sectionHeader}>
        <div><p className={styles.sectionLabel}>{L('PREDLOGE', 'TEMPLATES')}</p><h2 id="predloge-naslov">{L('Začni z dobro osnovo.', 'Start with a solid base.')}</h2>
          {/* Vprasalnik ima svoj zavihek — kartica zanj bi bila ista stvar na dveh
              koncih (Tina, 31. 8. 2026). Tu je samo kazipot. */}
          <p className={styles.predlogaKazipot}>{L('Iščeš vprašalnik za stranko?', 'Looking for a client questionnaire?')} <button type="button" onClick={() => setZavihek('vprasalniki')}>{L('Odpri Vprašalnike', 'Open Questionnaires')}</button></p>
        </div>
      </header>
      <div className={styles.templateGrid}>
        {MARKETING_PREDLOGE.filter(p => OBJAVE_VIDNE || p.cilj !== 'objave').map((predloga) => (
          <article className={styles.templateCard} data-vrsta={predloga.vrsta} key={predloga.id}>
            <IkonaVrste vrsta={predloga.vrsta} size={25} />
            {predloga.oznaka && <span className={styles.badge}>{predloga.oznaka}</span>}
            <h3>{predloga.naslov}</h3>
            <p>{predloga.opis}</p>
            {/* Predloga mora vnaprej povedati, kaj bo ustvarila — sicer je videti
                kot navaden gumb (Tina, 31. 8. 2026). */}
            {predloga.koraki && predloga.koraki.length > 0 && (
              <ul className={styles.predlogaKoraki}>
                {predloga.koraki.map((k, i) => (
                  <li key={i}>
                    <b>{k.zamikDni === 0 ? L('takoj', 'now') : `+${k.zamikDni} ${L('dni', 'days')}`}</b>
                    {k.naslov}
                  </li>
                ))}
              </ul>
            )}

            <button className={styles.templateButton} type="button" onClick={() => uporabiPredlogo(predloga)}>{L('Uporabi predlogo', 'Use template')} <ArrowRight size={17} /></button>
          </article>
        ))}
      </div>
    </section>
  );

  const Povezave = () => (
    <section className={styles.templates} aria-labelledby="povezave-naslov">
      <header className={styles.sectionHeader}>
        <div><p className={styles.sectionLabel}>{L('POVEZAVE', 'CONNECTIONS')}</p><h2 id="povezave-naslov">{L('Vse ostane v tvojem toku.', 'Everything stays in your flow.')}</h2><p>{L('Marketing se poveže z orodji, ki jih že uporabljaš v Flowu.', 'Marketing connects to the tools you already use in Flow.')}</p></div>
      </header>
      <div className={styles.integrationGrid}>
        <article className={`${styles.integrationCard} ${styles.integrationSiroka}`}><div className={styles.integrationHead}><ShareNetwork size={25} /><span className={styles.connectionState} data-ready="true">{L('Tvoji profili', 'Your profiles')}</span></div><h3>{L('Naslovi profilov', 'Profile URLs')}</h3><p>{L('Vpiši jih enkrat. Gumb »Odpri« te bo nato peljal naravnost na tvoj profil.', 'Enter them once. “Open” will then take you directly to your profile.')}</p><div className={styles.naslovniGrid}>{(Object.keys(SOCIAL_OZNAKE) as SocialKanal[]).map(kanal => <label key={kanal} className={styles.naslovnoPolje}><span>{SOCIAL_OZNAKE[kanal]}</span><input type="url" value={profilniNaslovi[kanal] || ''} onChange={e => setProfilniNaslovi({ ...profilniNaslovi, [kanal]: e.target.value })} placeholder={SOCIAL_LINKI[kanal]} /></label>)}</div><button className={`${styles.secondary} ${styles.naslovniShrani}`} type="button" onClick={shraniProfilneNaslove}>{L('Shrani naslove', 'Save URLs')}</button></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><CalendarBlank size={25} /><span className={styles.connectionState} data-ready="true">{L('Vključeno', 'Enabled')}</span></div><h3>{L('Flow Koledar', 'Flow Calendar')}</h3><p>{L('Načrtovani datumi kampanj so pripravljeni za pregled ob drugih rokih.', 'Planned campaign dates are ready to review alongside your other deadlines.')}</p><Link className={styles.secondary} href={`${base}/kalkulator/koledar`}>{L('Odpri koledar', 'Open calendar')}</Link></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><CheckSquare size={25} /><span className={styles.connectionState} data-ready="true">{L('Vključeno', 'Enabled')}</span></div><h3>{L('Flow Naloge', 'Flow Tasks')}</h3><p>{L('Pripravo besedil, vizualov in objav vodiš kot opravila.', 'You manage copy, visuals and post prep as tasks.')}</p><Link className={styles.secondary} href={`${base}/kalkulator/naloge`}>{L('Odpri naloge', 'Open tasks')}</Link></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><EnvelopeSimple size={25} /><span className={styles.connectionState}>{L('Kmalu', 'Soon')}</span></div><h3>{L('Pošiljanje e-pošte', 'Email sending')}</h3><p>{L('Pred dejanskim pošiljanjem bomo dodali privolitev, odjavo in zanesljivo dostavo.', 'Before any real sending, we will add consent, unsubscribe and reliable delivery.')}</p></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><ShareNetwork size={25} /><span className={styles.connectionState}>{L('Kmalu (beta)', 'Soon (beta)')}</span></div><h3>{L('Družbena omrežja', 'Social media')}</h3><p>{L('Načrtovanje in objavljanje na Facebooku in Instagramu danes teče v Meta Business Suite — tam je koledar in objava res gre ven. Flow te odloži tja; objavljanje pride sem, ko bo Flow objavljal za tvoje stranke iz enega mesta.', 'Planning and publishing on Facebook and Instagram happens in Meta Business Suite today — that is where the calendar lives and where the post actually goes out. Flow takes you there; publishing moves here once Flow posts for your clients from one place.')}</p><a className={styles.secondary} href="https://business.facebook.com/latest/home" target="_blank" rel="noreferrer">{L('Odpri Meta Business Suite', 'Open Meta Business Suite')} <ArrowRight size={17} /></a></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><Megaphone size={25} /><span className={styles.connectionState}>{L('Načrtovano', 'Planned')}</span></div><h3>{L('Merjenje obiska', 'Traffic tracking')}</h3><p>{L('Ko povežeš analitiko, bo kampanja pokazala tudi obisk, povpraševanja in dejanski rezultat.', 'Once you connect analytics, each campaign will also show traffic, inquiries and real results.')}</p></article>
      </div>
    </section>
  );

  return (
    <div className={styles.page}>
      {/* Pasica je prej nosila samo poved in gumb — torej nic. Zdaj nosi to,
          zaradi cesar to stran sploh odpres: kaj te caka. Ce ni nicesar, je
          prazno stanje s Pupo in enim zacetkom (Tina, 31. 8. 2026). */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          {caka.length > 0 ? (
            <>
              <p className={styles.eyebrow}>
                {L('KAJ ČAKA NATE', 'WHAT IS WAITING')}
                <span className={styles.cakaStevec}>{caka.length}</span>
              </p>
              <ul className={styles.cakaSeznam}>
                {caka.map((v) => (
                  <li key={v.id}>
                    <button type="button" onClick={v.odpri}>
                      <span className={styles.cakaPika} data-nujno={v.nujno} aria-hidden />
                      <b>{v.naslov}</b>
                      <span className={styles.cakaMeta}>{v.opis}</span>
                      <ArrowRight className={styles.cakaPuscica} size={15} weight="bold" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className={styles.eyebrow}>{L('KAJ ČAKA NATE', 'WHAT IS WAITING')}</p>
              <p className={styles.cakaPrazno}>
                {L('Nič ne čaka. Začni z vprašalnikom, ki ga objaviš na strani, ali s kampanjo.',
                   'Nothing waiting. Start with a questionnaire you publish on your site, or with a campaign.')}
              </p>
            </>
          )}
        </div>
        <div className={styles.heroPupa} aria-hidden>
          <Image src="/flow-pupa-marketing-2.png" alt="" width={783} height={711} sizes="320px" priority />
        </div>
        <button className={styles.primary} type="button" onClick={() => odpriNovo()}><Plus size={19} /> {L('Nova kampanja', 'New campaign')}</button>
      </section>

      <MobTabs label={L('Marketing pogledi', 'Marketing views')} vrednost={zavihek} naVrednost={id => setZavihek(id as Zavihek)} opcije={[...(OBJAVE_VIDNE ? [{ id: 'objave', label: L('Objave', 'Posts') }] : []), { id: 'kampanje', label: L('Kampanje', 'Campaigns') }, { id: 'predloge', label: L('Predloge', 'Templates') }, { id: 'vprasalniki', label: L('Vprašalniki', 'Questionnaires') }, ...(POVEZAVE_VIDNE ? [{ id: 'povezave', label: L('Povezave', 'Connections') }] : [])]} />
      <nav className={`${styles.tabs} mobtabs-hide`} aria-label={L('Marketing pogledi', 'Marketing views')}>
        {([...(OBJAVE_VIDNE ? [['objave', L('Objave', 'Posts')] as const] : []), ['kampanje', L('Kampanje', 'Campaigns')] as const, ['predloge', L('Predloge', 'Templates')], ['vprasalniki', L('Vprašalniki', 'Questionnaires')] as const, ...(POVEZAVE_VIDNE ? [['povezave', L('Povezave', 'Connections')] as const] : [])] as const).map(([id, napis]) => (
          <button key={id} className={styles.tab} type="button" data-active={zavihek === id} onClick={() => setZavihek(id)}>{napis}</button>
        ))}
      </nav>

      {zavihek === 'kampanje' && <>
        {/* Stiri velike nicle so bile najslabse mozno prvo srecanje s stranjo:
            povedale so, da nimas nic, in nic o tem, kaj naj narediš. Zdaj je to
            tih pas, ki se pokaze SELE, ko je kaj za pokazati (Tina, 31. 8. 2026). */}
        {(povzetek.stevci.aktivno + povzetek.stevci.nacrtovano + povzetek.stevci.osnutek > 0 || povzetek.naslednja) && (
          <section className={styles.povzetekPas} aria-label={L('Povzetek kampanj', 'Campaign summary')}>
            {/* Pike govorijo isto kot znacke v seznamu: zelena aktivno,
                vijolicna nacrtovano, siva osnutek (Tina, 31. 8. 2026). */}
            <span><i className={styles.pasPika} data-tone="aktivno" aria-hidden /><b>{povzetek.stevci.aktivno}</b> {L('aktivnih', 'active')}</span>
            <span><i className={styles.pasPika} data-tone="nacrtovano" aria-hidden /><b>{povzetek.stevci.nacrtovano}</b> {L('načrtovanih', 'planned')}</span>
            <span><i className={styles.pasPika} data-tone="osnutek" aria-hidden /><b>{povzetek.stevci.osnutek}</b> {povzetek.stevci.osnutek === 1 ? L('osnutek', 'draft') : L('osnutkov', 'drafts')}</span>
            {povzetek.naslednja && (
              <span className={styles.povzetekRok}>
                <CalendarBlank size={15} weight="bold" aria-hidden />
                <b>{formatirajRazpon(povzetek.naslednja, L)}</b>
                <em>{povzetek.naslednja.naslov}</em>
              </span>
            )}
          </section>
        )}
        {/* Hitri zacetki so PRAZNO STANJE, ne stalna oprema: ko kampanje ze
            obstajajo, so ponovitev zavihkov (Tina, 31. 8. 2026). */}
        {kampanje.length === 0 && <section className={styles.quickGrid} aria-label={L('Hitri začetki', 'Quick starts')}>
          {/* SIVO = funkcija je nacrtovana, a je se ni. Tako se vidi, da pride,
              in hkrati nihce ne pricakuje, da ze dela (Tina, 31. 8. 2026).
              Ko posiljanje zazivi, se odstrani razred in oznaka. */}
          <button className={`${styles.quickCard} ${styles.quickCardKmalu}`} type="button" onClick={() => odpriNovo('email')}><EnvelopeSimple aria-hidden="true" /><span className={styles.kmalu}>{L('kmalu', 'coming')}</span><h2>{L('E-pošta', 'Email')}</h2><p>{L('Dobrodošlice, novosti in premišljena sporočila ob pravem času. Zdaj jih načrtuješ; pošiljanje iz Flowa pride kasneje.', 'Welcomes, updates and thoughtful messages at the right time. For now you plan them; sending from Flow comes later.')}</p><span className={styles.cardLink}>{L('Načrtuj sporočilo →', 'Plan a message →')}</span></button>
          <button className={styles.quickCard} type="button" onClick={() => setZavihek('vprasalniki')}><Code aria-hidden="true" /><h2>{L('Vprašalnik', 'Questionnaire')}</h2><p>{L('Sestavi vprašanja, pošlji povezavo stranki in odgovori pridejo sem.', 'Build the questions, send the link to a client, answers land here.')}</p><span className={styles.cardLink}>{L('Sestavi vprašalnik →', 'Build a questionnaire →')}</span></button>
          <button className={`${styles.quickCard} ${styles.quickCardKmalu}`} type="button" onClick={() => odpriNovo('social')}><ShareNetwork aria-hidden="true" /><span className={styles.kmalu}>{L('kmalu', 'coming')}</span><h2>{L('Družbena omrežja', 'Social media')}</h2><p>{L('Objave spremeni v jasen načrt z roki in opravili. Objavljanje na Facebook in Instagram pride, ko bo povezava odobrena.', 'Turn posts into a clear plan with deadlines and tasks. Publishing to Facebook and Instagram arrives once the connection is approved.')}</p><span className={styles.cardLink}>{L('Načrtuj objavo →', 'Plan a post →')}</span></button>
        </section>}
        {Kampanje()}
      </>}
      {OBJAVE_VIDNE && zavihek === 'objave' && Objave()}
      {zavihek === 'predloge' && Predloge()}
      <MarketingZaporedjePanel
        odprt={zapOdprt}
        zacetno={zap}
        projekti={projekti}
        jeEn={locale === 'en'}
        napaka={pupaNapaka}
        onZapri={() => setZapOdprt(false)}
        onShrani={shraniZaporedje}
        onNaloga={nalogaIzKoraka}
        onSporocilo={sporociloIzKoraka}
      />

      {zavihek === 'vprasalniki' && <VprasalnikiPanel jeEn={locale === 'en'} base={base} />}
      {POVEZAVE_VIDNE && zavihek === 'povezave' && Povezave()}

      {obrazecOdprt && (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setObrazecOdprt(false)}>
          <section className={styles.formPanel} role="dialog" aria-modal="true" aria-labelledby="marketing-obrazec-naslov">
            <button className={styles.close} type="button" onClick={() => setObrazecOdprt(false)} aria-label={L('Zapri', 'Close')}><X size={20} /></button>
            <Sparkle size={25} aria-hidden="true" />
            <h2 id="marketing-obrazec-naslov">{urejamId ? L('Uredi kampanjo.', 'Edit campaign.') : L('Nova kampanja.', 'New campaign.')}</h2>
            <p>{L('Najprej zapiši namen in rok. Vsebino lahko razviješ kasneje.', 'First write down the purpose and deadline. You can develop the content later.')}</p>
            <form className={styles.form} onSubmit={shrani}>
              <label>{L('Ime kampanje', 'Campaign name')}<input required value={obrazec.naslov} onChange={(e) => setObrazec({ ...obrazec, naslov: e.target.value })} placeholder={L('Npr. Jesenska predstavitev storitve', 'E.g. Autumn service launch')} autoFocus /></label>
              <label>{L('Vrsta', 'Type')}<select value={obrazec.vrsta} onChange={(e) => setObrazec({ ...obrazec, vrsta: e.target.value as MarketingVrsta })}><option value="email">{L('E-pošta', 'Email')}</option><option value="vprasalnik">{L('Spletni vprašalnik', 'Online questionnaire')}</option><option value="social">{L('Družbena omrežja', 'Social media')}</option></select></label>
              <label>Status<select value={obrazec.status} onChange={(e) => setObrazec({ ...obrazec, status: e.target.value as MarketingStatus })}><option value="osnutek">{L('Osnutek', 'Draft')}</option><option value="nacrtovano">{L('Načrtovano', 'Planned')}</option><option value="aktivno">{L('Aktivno', 'Active')}</option><option value="zakljuceno">{L('Zaključeno', 'Completed')}</option></select></label>
              <label>{L('Začetek', 'Start')}<input type="date" value={obrazec.datumOd} max={obrazec.datumDo || undefined} onChange={(e) => setObrazec({ ...obrazec, datumOd: e.target.value })} />{obrazec.datumOd && <small style={{ display: 'block', marginTop: '.3rem', fontSize: '.72rem', color: 'rgba(17,17,17,.72)' }}>{new Date(obrazec.datumOd + 'T00:00:00').toLocaleDateString(dl, { day: 'numeric', month: 'long', year: 'numeric' })}</small>}</label>
              <label>{L('Konec', 'End')}<input type="date" value={obrazec.datumDo} min={obrazec.datumOd || undefined} onChange={(e) => setObrazec({ ...obrazec, datumDo: e.target.value })} />{obrazec.datumDo && <small style={{ display: 'block', marginTop: '.3rem', fontSize: '.72rem', color: 'rgba(17,17,17,.72)' }}>{new Date(obrazec.datumDo + 'T00:00:00').toLocaleDateString(dl, { day: 'numeric', month: 'long', year: 'numeric' })}</small>}</label>
              <label>{L('Projekt', 'Project')}<select value={obrazec.projekt} onChange={(e) => setObrazec({ ...obrazec, projekt: e.target.value })}><option value="">{L('Brez projekta', 'No project')}</option>{projekti.map(pr => <option key={pr.id} value={pr.id}>{pr.naslov}</option>)}</select></label>
              <label>{L('Kratek opis', 'Short description')}<textarea value={obrazec.opis} onChange={(e) => setObrazec({ ...obrazec, opis: e.target.value })} placeholder={L('Kaj želiš doseči in komu govoriš?', 'What do you want to achieve and who are you speaking to?')} /></label>
              <div className={styles.formActions}><button className={styles.quietButton} type="button" onClick={() => setObrazecOdprt(false)}>{L('Prekliči', 'Cancel')}</button><button className={styles.primary} type="submit">{L('Shrani kampanjo', 'Save campaign')}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
