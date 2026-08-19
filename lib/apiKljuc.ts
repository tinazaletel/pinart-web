import { createHash, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';

/*
  API KLJUCI — preverjanje in izdaja.

  Temelj javnega API-ja Flowa. Zunanji klicatelj se predstavi z glavo
      Authorization: Bearer pf_<43 znakov base64url>
  in iz nje dobimo kontekst organizacije. Uporabnik NI prijavljen (ni piskotka,
  ni seje), zato preverjanje nujno tece prek service-role odjemalca.

  KAJ SE HRANI: samo SHA-256 zgostitev celega kljuca in prvih 8 znakov za
  prikaz. Cel kljuc obstaja natanko enkrat — v odgovoru ob nastanku. V bazi,
  dnevniku ali sporocilu o napaki se NE pojavi nikoli.

  ZAKAJ NI `crypto.timingSafeEqual`: kljuc iscemo po UNIQUE indeksu na stolpcu
  `zgostitev` (migracija 20260820030000). Iskanje po indeksu primerja celotno
  zgostitev v bazi in ne razkriva, koliko zacetnih znakov se je ujemalo — casovni
  kanal, ki ga timingSafeEqual zapira, tu sploh ne nastane. Odlocitev: iskanje po
  indeksu, ker je enakovredno in bistveno preprostejse od nalaganja vseh zgostitev
  v aplikacijo in primerjanja v konstantnem casu.
*/

export type ApiKontekst = {
  organizationId: string;
  kljucId: string;
  obseg: string[];
};

/** Predpona, po kateri je kljuc Flowa prepoznaven (in iskljiv v git-secret orodjih). */
export const PREDPONA_KLJUCA = 'pf_';

/** Dovoljeni obsegi. Nova pravica = nova oznaka tu IN preverjanje v koncni tocki. */
export const OBSEGI = ['branje', 'pisanje'] as const;
export type Obseg = (typeof OBSEGI)[number];

/* Oblika kljuca: "pf_" + base64url(32 bajtov) = 3 + 43 znakov. Vzorec preverimo
   PREDEN gremo v bazo — smeti tako nikoli ne pridejo do poizvedbe. */
const VZOREC_KLJUCA = /^pf_[A-Za-z0-9_-]{43}$/;

/** SHA-256 celega kljuca v hex. Edina oblika, v kateri kljuc sme v bazo. */
export function zgostiKljuc(kljuc: string): string {
  return createHash('sha256').update(kljuc, 'utf8').digest('hex');
}

/**
 * Ustvari nov kljuc. Vrne CEL kljuc (pokazi ga uporabnici enkrat in ga pozabi),
 * predpono za prikaz in zgostitev za zapis v bazo.
 *
 * 32 bajtov iz `crypto.randomBytes` = 256 bitov entropije; ugibanje ni mogoce.
 */
export function ustvariNovKljuc(): { kljuc: string; predpona: string; zgostitev: string } {
  const kljuc = `${PREDPONA_KLJUCA}${randomBytes(32).toString('base64url')}`;
  return { kljuc, predpona: kljuc.slice(0, 8), zgostitev: zgostiKljuc(kljuc) };
}

/** Izlusci kljuc iz glave Authorization. Vrne null, ce glave ni ali je napacne oblike. */
function kljucIzZahteve(request: Request): string | null {
  const glava = request.headers.get('authorization') || '';
  const ujemanje = /^Bearer\s+(\S+)$/i.exec(glava.trim());
  if (!ujemanje) return null;
  const kljuc = ujemanje[1];
  return VZOREC_KLJUCA.test(kljuc) ? kljuc : null;
}

/**
 * Preveri kljuc iz glave `Authorization: Bearer pf_...`.
 *
 * Vrne kontekst organizacije ali `null` — brez razlage, zakaj ni uspelo
 * (manjkajoca glava, napacna oblika, neznan kljuc in preklican kljuc dajo
 * ENAK rezultat, da klicatelj ne more ugotavljati, kateri kljuci obstajajo).
 */
export async function preveriApiKljuc(request: Request): Promise<ApiKontekst | null> {
  const kljuc = kljucIzZahteve(request);
  if (!kljuc) return null;

  /* Prosilec ni prijavljen uporabnik, zato tu ni RLS konteksta — nujno
     service-role. Ce ni nastavljen, je odgovor "ni dostopa" (fail-closed):
     javni API brez preverjanja ne sme delovati. */
  const admin = createAdminClient();
  if (!admin) {
    console.error('API kljuci: service-role odjemalec ni nastavljen, zavracam dostop.');
    return null;
  }

  const zgostitev = zgostiKljuc(kljuc);
  const { data, error } = await admin
    .from('api_kljuci')
    .select('id, organization_id, obseg, revoked_at, last_used_at')
    .eq('zgostitev', zgostitev)
    .maybeSingle();

  /* V dnevnik gre samo sporocilo baze — nikoli kljuc in nikoli zgostitev. */
  if (error) {
    console.error('API kljuci: napaka pri preverjanju:', error.message);
    return null;
  }
  if (!data || data.revoked_at) return null;

  await zabeleziRabo(admin, String(data.id), data.last_used_at ? String(data.last_used_at) : null);

  const obseg = Array.isArray(data.obseg) ? data.obseg.map((o: unknown) => String(o)) : [];
  return {
    organizationId: String(data.organization_id),
    kljucId: String(data.id),
    obseg,
  };
}

/* Osvezitev `last_used_at` je informativna (lastnica vidi, ali je kljuc se v
   rabi), zato je omejena na enkrat na minuto — sicer bi vsak klic API-ja pomenil
   se en zapis v bazo. Napaka pri pisanju NE sme zrusiti klica, ki je sicer
   veljaven, zato je pozresena. */
const OKNO_RABE_MS = 60_000;

async function zabeleziRabo(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  kljucId: string,
  prejsnja: string | null,
): Promise<void> {
  if (prejsnja && Date.now() - new Date(prejsnja).getTime() < OKNO_RABE_MS) return;
  try {
    await admin.from('api_kljuci').update({ last_used_at: new Date().toISOString() }).eq('id', kljucId);
  } catch {
    /* zapis rabe ni kljucen za odlocitev o dostopu */
  }
}

/**
 * Enoten odgovor, kadar kljuca ni oz. ni veljaven. Brez podrobnosti — klicatelj
 * ne sme izvedeti, ali je kljuc neznan, preklican ali napacne oblike.
 */
export function odgovorBrezDostopa(): Response {
  return new Response(
    JSON.stringify({ napaka: 'Neveljaven ali manjkajoc API kljuc.', error: 'invalid_token' }),
    {
      status: 401,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'www-authenticate': 'Bearer realm="Pinart Flow API", error="invalid_token"',
        'cache-control': 'no-store',
      },
    },
  );
}

/**
 * Omejitev pogostosti za poti, ki jih odpira API kljuc. OBVEZNA na vsaki taki
 * poti: brez nje bi en kljuc lahko izcrpal bazo.
 *
 * Omejitev je vezana na `kljucId` (ne na IP in ne na uporabnika) — en kljuc,
 * ena kvota, ne glede na to, od kod klice. Predpona `kljuc:` loci ta prostor od
 * omejitev prijavljenih uporabnikov.
 */
export function omejiPoKljucu(
  request: Request,
  pot: string,
  meja: number,
  ctx: ApiKontekst,
  oknoSekund = 60,
) {
  return omejiApi(request, pot, meja, `kljuc:${ctx.kljucId}`, oknoSekund);
}

/** Ali kljuc nosi zahtevano pravico. Koncne tocke naj to preverijo eksplicitno. */
export function imaObseg(ctx: ApiKontekst, zahtevan: Obseg): boolean {
  return ctx.obseg.includes(zahtevan);
}
