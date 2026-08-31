/* VPRAŠALNIK ZA STRANKO — oblike, privzeta vprašanja in preverjanje odgovorov.
 *
 * Čista logika brez omrežja, da je preverljiva s testi: kaj je veljavno
 * vprašanje, kaj je veljaven odgovor in kaj se sme zapisati.
 *
 * Zakaj privzeta vprašanja in ne prazen obrazec: prazen obrazec je delo, ki ga
 * uporabnica ne bo opravila. Nabor spodaj je tisto, kar kreativec tako ali tako
 * vpraša na prvem sestanku — in prav ta sestanek naj vprašalnik prihrani.
 */

export const ZETON_PREDPONA = 'vp_';

export type VprasanjeTip = 'kratko' | 'dolgo' | 'izbira' | 'vec' | 'datum' | 'stevilka';

export type Vprasanje = {
  id: string;
  tip: VprasanjeTip;
  besedilo: string;
  /* brez odgovora obrazca ni mogoče oddati */
  obvezno?: boolean;
  /* samo pri 'izbira' in 'vec' */
  moznosti?: string[];
  /* namig pod poljem */
  namig?: string;
};

export type Vprasalnik = {
  id: string;
  naslov: string;
  uvod?: string;
  vprasanja: Vprasanje[];
  odprt: boolean;
  /* lokalni id projekta (Projekt.id); prazno = splosno povprasevanje */
  projekt?: string;
  /* povezavo vidiš samo ob nastanku ali ob ponovni izdaji */
  zeton?: string;
  odgovorov?: number;
  ustvarjen?: string;
};

export type Odgovor = {
  id: string;
  projekt?: string;
  odgovori: Record<string, string | string[]>;
  ime?: string;
  eposta?: string;
  podjetje?: string;
  pregledano: boolean;
  ustvarjen: string;
};

/* ── privzeti nabor ──────────────────────────────────────────────────────── */

/** Vprašanja, ki jih kreativec postavi na prvem sestanku. Uporabnica jih uredi. */
export function privzetaVprasanja(jeEn = false): Vprasanje[] {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  return [
    { id: 'podjetje', tip: 'kratko', besedilo: L('Ime podjetja ali blagovne znamke', 'Company or brand name'), obvezno: true },
    { id: 'oseba', tip: 'kratko', besedilo: L('Ime in priimek kontaktne osebe', 'Contact person'), obvezno: true },
    { id: 'eposta', tip: 'kratko', besedilo: L('E-naslov', 'Email'), obvezno: true },
    {
      id: 'storitve', tip: 'vec', besedilo: L('Kaj potrebujete?', 'What do you need?'), obvezno: true,
      moznosti: jeEn
        ? ['Logo', 'Full visual identity', 'Website', 'Packaging', 'Print materials', 'Social media', 'Illustration', 'Something else']
        : ['Logotip', 'Celostna grafična podoba', 'Spletna stran', 'Embalaža', 'Tiskovine', 'Družbena omrežja', 'Ilustracija', 'Nekaj drugega'],
    },
    { id: 'opis', tip: 'dolgo', besedilo: L('Na kratko opišite projekt', 'Briefly describe the project'), obvezno: true,
      namig: L('Kaj delate, kaj želite doseči, kaj vas je pripeljalo do tega koraka.', 'What you do, what you want to achieve, what brought you here.') },
    { id: 'publika', tip: 'dolgo', besedilo: L('Komu je namenjeno? Kdo je vaša stranka?', 'Who is it for? Who is your customer?') },
    { id: 'rok', tip: 'datum', besedilo: L('Do kdaj bi radi imeli izdelano?', 'When would you like it finished?') },
    {
      id: 'proracun', tip: 'izbira', besedilo: L('Okvirni proračun', 'Approximate budget'),
      namig: L('Ni zavezujoč. Pomaga, da vam pripravim predlog v pravem obsegu.', 'Not binding. It helps me propose the right scope.'),
      moznosti: jeEn
        ? ['Up to 1,000 €', '1,000–3,000 €', '3,000–7,000 €', 'Over 7,000 €', 'I do not know yet']
        : ['Do 1.000 €', '1.000–3.000 €', '3.000–7.000 €', 'Nad 7.000 €', 'Še ne vem'],
    },
    { id: 'gradiva', tip: 'dolgo', besedilo: L('Ali že imate gradiva (logotip, fotografije, besedila)?', 'Do you already have materials (logo, photos, copy)?') },
    { id: 'vzori', tip: 'dolgo', besedilo: L('Primeri, ki so vam všeč', 'Examples you like'),
      namig: L('Povezave ali imena znamk — tudi če so iz druge panoge.', 'Links or brand names — other industries count too.') },
  ];
}

/* ── preverjanje ─────────────────────────────────────────────────────────── */

const TIPI: VprasanjeTip[] = ['kratko', 'dolgo', 'izbira', 'vec', 'datum', 'stevilka'];

/** Očisti vprašanja iz vmesnika: obdrži samo, kar razumemo in kar ima besedilo. */
export function ocistiVprasanja(vhod: unknown): Vprasanje[] {
  if (!Array.isArray(vhod)) return [];
  const videni = new Set<string>();
  const ven: Vprasanje[] = [];
  for (const v of vhod.slice(0, 40)) {
    if (!v || typeof v !== 'object') continue;
    const o = v as Record<string, unknown>;
    const besedilo = String(o.besedilo || '').trim().slice(0, 300);
    if (!besedilo) continue;
    const tip = TIPI.includes(o.tip as VprasanjeTip) ? (o.tip as VprasanjeTip) : 'kratko';
    /* id mora biti stabilen in enolicen — po njem se veže odgovor */
    let id = String(o.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || `v${ven.length + 1}`;
    while (videni.has(id)) id = `${id}_`;
    videni.add(id);
    const moznosti = (tip === 'izbira' || tip === 'vec') && Array.isArray(o.moznosti)
      ? o.moznosti.map(m => String(m).trim().slice(0, 120)).filter(Boolean).slice(0, 20)
      : undefined;
    ven.push({
      id, tip, besedilo,
      obvezno: !!o.obvezno,
      ...(moznosti?.length ? { moznosti } : {}),
      ...(o.namig ? { namig: String(o.namig).trim().slice(0, 300) } : {}),
    });
  }
  return ven;
}

export type Napaka = { id: string; sporocilo: string };

/**
 * Preveri odgovore stranke proti vprašanjem. Vrne očiščene odgovore ali napake.
 * Preverja STREŽNIK — obrazec v brskalniku je vljudnost, ne varovalka.
 */
export function preveriOdgovore(
  vprasanja: Vprasanje[],
  vhod: unknown,
  jeEn = false,
): { ok: true; odgovori: Record<string, string | string[]> } | { ok: false; napake: Napaka[] } {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const surov = (vhod && typeof vhod === 'object' ? vhod : {}) as Record<string, unknown>;
  const odgovori: Record<string, string | string[]> = {};
  const napake: Napaka[] = [];

  for (const v of vprasanja) {
    const surovo = surov[v.id];

    if (v.tip === 'vec') {
      const izbrano = Array.isArray(surovo)
        ? surovo.map(x => String(x)).filter(x => (v.moznosti || []).includes(x)).slice(0, 20)
        : [];
      if (v.obvezno && !izbrano.length) napake.push({ id: v.id, sporocilo: L('Izberi vsaj eno možnost.', 'Pick at least one option.') });
      if (izbrano.length) odgovori[v.id] = izbrano;
      continue;
    }

    const besedilo = String(surovo ?? '').trim().slice(0, v.tip === 'dolgo' ? 4000 : 400);

    if (!besedilo) {
      if (v.obvezno) napake.push({ id: v.id, sporocilo: L('To polje je obvezno.', 'This field is required.') });
      continue;
    }
    if (v.tip === 'izbira' && !(v.moznosti || []).includes(besedilo)) {
      napake.push({ id: v.id, sporocilo: L('Izberi eno od ponujenih možnosti.', 'Pick one of the offered options.') });
      continue;
    }
    if (v.tip === 'datum' && !/^\d{4}-\d{2}-\d{2}$/.test(besedilo)) {
      napake.push({ id: v.id, sporocilo: L('Vpiši veljaven datum.', 'Enter a valid date.') });
      continue;
    }
    if (v.tip === 'stevilka' && !Number.isFinite(Number(besedilo.replace(',', '.')))) {
      napake.push({ id: v.id, sporocilo: L('Vpiši številko.', 'Enter a number.') });
      continue;
    }
    /* E-naslov je edino polje, kjer napačen vnos pomeni, da stranke ne moreš
       kontaktirati — zato ga preverimo, čeprav je tip 'kratko'. */
    if (v.id === 'eposta' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(besedilo)) {
      napake.push({ id: v.id, sporocilo: L('Vpiši veljaven e-naslov.', 'Enter a valid email.') });
      continue;
    }
    odgovori[v.id] = besedilo;
  }

  return napake.length ? { ok: false, napake } : { ok: true, odgovori };
}

/** Iz odgovorov izlušči ime, e-pošto in podjetje, da seznam ni brez imena. */
export function izlusciKontakt(odgovori: Record<string, string | string[]>): {
  ime?: string; eposta?: string; podjetje?: string;
} {
  const beri = (id: string) => {
    const v = odgovori[id];
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : undefined;
  };
  return { ime: beri('oseba'), eposta: beri('eposta'), podjetje: beri('podjetje') };
}
