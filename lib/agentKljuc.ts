import { createHash, randomBytes } from 'node:crypto';

/*
  KLJUČI ZA ZUNANJE AGENTE — čiste funkcije.

  Ta modul namenoma NE dostopa do baze in ne uvaža ničesar iz Supabase. Vse tu
  je izračun nad nizom, zato je testljivo brez zaledja (tests/unit/agentKljuc).
  Iskanje ključa v tabeli `agent_kljuci` in beleženje rabe sta stvar poti
  app/api/agent/naloge — tam je service-role odjemalec, tu ne.

  Ključ odpira NATANKO ENO stvar: vpis naloge (POST /api/agent/naloge). Nič ne
  bere in nič ne briše. Bralni API v1 ima svoje ključe (lib/apiKljuc) — namerno
  ločeno, da preklic enega ne vpliva na drugega.

  KAJ SE HRANI: samo SHA-256 zgostitev celega ključa in zadnji štirje znaki za
  prikaz. Cel ključ obstaja natanko enkrat — v odgovoru ob nastanku. V bazi,
  dnevniku ali sporočilu o napaki se NE pojavi nikoli.

  ZAKAJ NI `crypto.timingSafeEqual`: ključ iščemo po UNIQUE indeksu na stolpcu
  `kljuc_hash` (migracija 20260824030000). Iskanje po indeksu primerja celotno
  zgostitev in ne razkriva, koliko začetnih znakov se je ujemalo — časovni
  kanal, ki ga timingSafeEqual zapira, tu sploh ne nastane.
*/

/** Predpona, po kateri je ključ Flowa prepoznaven (in izključljiv v git-secret orodjih). */
export const PREDPONA_AGENT_KLJUCA = 'pf_';

/** Število naključnih znakov za predpono. 24 bajtov → točno 32 znakov base64url. */
export const DOLZINA_NAKLJUCJA = 32;

/** Koliko zadnjih znakov ključa gre v `kljuc_namig`. */
export const DOLZINA_NAMIGA = 4;

/* Oblika ključa: "pf_" + 32 znakov base64url (A-Z a-z 0-9 _ -).
   Vzorec preverimo PREDEN gremo v bazo — smeti tako nikoli ne pridejo do
   poizvedbe. Dolžina se namenoma razlikuje od ključev API v1 ("pf_" + 43
   znakov), zato zamenjava ključa med sistemoma pade že tu, ne šele v bazi. */
const VZOREC_KLJUCA = new RegExp(`^${PREDPONA_AGENT_KLJUCA}[A-Za-z0-9_-]{${DOLZINA_NAKLJUCJA}}$`);

/** Cel ključ + kar gre o njem v bazo. `kljuc` pokaži enkrat in ga pozabi. */
export type NovAgentKljuc = {
  /** Cel ključ. Edini trenutek, ko obstaja v čitljivi obliki. */
  kljuc: string;
  /** SHA-256 celega ključa, hex — stolpec `kljuc_hash`. */
  zgostitev: string;
  /** Zadnji štirje znaki — stolpec `kljuc_namig`. */
  namig: string;
};

/**
 * SHA-256 celega ključa v hex (64 znakov). Edina oblika, v kateri ključ sme
 * v bazo. Deterministična: isti ključ da vedno isto zgostitev, zato je iskanje
 * po njej mogoče brez hrambe ključa.
 */
export function zgostiAgentKljuc(kljuc: string): string {
  return createHash('sha256').update(kljuc, 'utf8').digest('hex');
}

/**
 * Zadnji štirje znaki ključa — toliko, da lastnica v seznamu prepozna, katerega
 * preklicuje, in premalo, da bi komu kaj koristilo. Krajši niz od štirih znakov
 * vrne sam sebe (robni primer; pravi ključ je vedno dolg 35 znakov).
 */
export function namigAgentKljuca(kljuc: string): string {
  return kljuc.slice(-DOLZINA_NAMIGA);
}

/**
 * Ali je niz veljavne OBLIKE ključa. Ne pove, ali ključ obstaja ali je
 * preklican — to ve samo baza.
 */
export function jeVeljavnaOblikaKljuca(vrednost: unknown): vrednost is string {
  return typeof vrednost === 'string' && VZOREC_KLJUCA.test(vrednost);
}

/**
 * Ustvari nov ključ. Vrne cel ključ, njegovo zgostitev in namig.
 *
 * 24 bajtov iz `crypto.randomBytes` = 192 bitov entropije; ugibanje ni mogoče.
 * base64url je izbran zato, ker je varen v glavi `Authorization`, v URL-ju in
 * v datoteki `.env` — brez ubežnih znakov in brez zapolnjevalnega `=`.
 */
export function ustvariAgentKljuc(): NovAgentKljuc {
  const nakljucje = randomBytes(24).toString('base64url');
  const kljuc = `${PREDPONA_AGENT_KLJUCA}${nakljucje}`;
  return { kljuc, zgostitev: zgostiAgentKljuc(kljuc), namig: namigAgentKljuca(kljuc) };
}

/**
 * Izlušči ključ iz glave `Authorization: Bearer pf_...`.
 *
 * Vrne `null`, če glave ni, ni sheme Bearer ali ključ ni prave oblike — brez
 * razlage, katera od teh je bila. Klicatelj naj vse tri primere odgovori enako
 * (401), da zunanji odjemalec ne more ugotavljati, kateri ključi obstajajo.
 */
export function agentKljucIzGlave(glava: string | null | undefined): string | null {
  const ujemanje = /^Bearer\s+(\S+)$/i.exec((glava || '').trim());
  if (!ujemanje) return null;
  return jeVeljavnaOblikaKljuca(ujemanje[1]) ? ujemanje[1] : null;
}
