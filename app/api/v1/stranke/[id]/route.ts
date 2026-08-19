import {
  adminOdjemalec, beriStranicenje, jeVeljavenZunanjiId, napaka, odgovor, odgovorBrezZaledja,
  oblikujPonudbo, oblikujProjekt, oblikujRacun, oblikujStranko, sestejPoValuti,
  STOLPCI_PONUDBE, STOLPCI_PROJEKTA, STOLPCI_RACUNA, STOLPCI_STRANKE,
} from '@/lib/apiV1';
import { preveriApiKljuc, odgovorBrezDostopa, omejiPoKljucu, imaObseg, type ApiKontekst } from '@/lib/apiKljuc';

/* GET /api/v1/stranke/[id] — ena stranka s povzetkom njenih projektov, ponudb
   in računov.

   `id` v poti je ZUNANJI id (external_id), enak tistemu, ki ga vrne seznam —
   notranji uuid baze ne gre nikoli ven. Notranji uuid tu vseeno potrebujemo,
   ker so povezave (projects.client_id, offers.client_id, invoices.client_id)
   vezane nanj; preberemo ga in obdržimo samo v strežniku.

   Vsaka od poizvedb spodaj je posebej omejena na organization_id iz ključa.
   Sam client_id ne bi zadoščal: brez omejitve organizacije bi ugibanje uuid-ja
   odprlo tuje podatke. */

export const dynamic = 'force-dynamic';

/* Zgornja meja za seštevke — dovolj visoka, da je v praksi neomejena, a
   prepreči, da bi ena stranka z ogromno zgodovino ustavila odgovor. */
const MEJA_SESTEVKOV = 5000;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const kontekst = await preveriApiKljuc(request);
  if (!kontekst) return odgovorBrezDostopa();

  if (!imaObseg(kontekst, 'branje')) return napaka('Ključ nima pravice branja.', 403);

  const omejitev = await omejiPoKljucu(request, 'v1-stranka', 120, kontekst);
  if (omejitev) return omejitev;

  if (!jeVeljavenZunanjiId(params?.id)) return napaka('Neveljaven id stranke.', 400);

  const admin = adminOdjemalec();
  if (!admin) return odgovorBrezZaledja();

  try {
    return await sestaviOdgovor(admin, kontekst, params.id, new URL(request.url));
  } catch (e) {
    return napaka('Branja ni bilo mogoče izvesti.', 500, e);
  }
}

type Admin = NonNullable<ReturnType<typeof adminOdjemalec>>;

async function sestaviOdgovor(admin: Admin, kontekst: ApiKontekst, zunanjiId: string, url: URL) {
  const { limit, offset, od, do: doVrstice } = beriStranicenje(url);

  const { data: strankaVrstica, error: napakaStranke } = await admin
    .from('clients')
    .select(`id,${STOLPCI_STRANKE}`)
    .eq('organization_id', kontekst.organizationId)
    .eq('external_id', zunanjiId)
    .maybeSingle();

  if (napakaStranke) throw napakaStranke;
  if (!strankaVrstica) return napaka('Stranka ne obstaja.', 404);

  const notranjiId = String(strankaVrstica.id);
  const strankaKratko = { id: zunanjiId, ime: typeof strankaVrstica.name === 'string' ? strankaVrstica.name : null };

  const [projekti, ponudbe, racuni, vsePonudbe, vsiRacuni] = await Promise.all([
    admin.from('projects').select(STOLPCI_PROJEKTA, { count: 'exact' })
      .eq('organization_id', kontekst.organizationId).eq('client_id', notranjiId)
      .is('deleted_at', null).order('updated_at', { ascending: false }).range(od, doVrstice),
    admin.from('offers').select(STOLPCI_PONUDBE, { count: 'exact' })
      .eq('organization_id', kontekst.organizationId).eq('client_id', notranjiId)
      .is('deleted_at', null).order('issue_date', { ascending: false }).range(od, doVrstice),
    admin.from('invoices').select(STOLPCI_RACUNA, { count: 'exact' })
      .eq('organization_id', kontekst.organizationId).eq('client_id', notranjiId)
      .is('deleted_at', null).order('issue_date', { ascending: false }).range(od, doVrstice),
    /* Ločeni, namenoma lahki poizvedbi samo za seštevke: brez njiju bi
       »skupaj« veljalo le za trenutno stran in bi zavajalo. */
    admin.from('offers').select('amount,currency,status')
      .eq('organization_id', kontekst.organizationId).eq('client_id', notranjiId)
      .is('deleted_at', null).range(0, MEJA_SESTEVKOV - 1),
    admin.from('invoices').select('amount,currency,status,paid_at')
      .eq('organization_id', kontekst.organizationId).eq('client_id', notranjiId)
      .is('deleted_at', null).range(0, MEJA_SESTEVKOV - 1),
  ]);

  const prvaNapaka = [projekti.error, ponudbe.error, racuni.error, vsePonudbe.error, vsiRacuni.error].find(Boolean);
  if (prvaNapaka) throw prvaNapaka;

  const racuniZaSestevek = vsiRacuni.data || [];
  /* Neplačano = izdan, ni preklican, nima datuma plačila. Osnutki se ne
     štejejo — še niso terjatev. */
  const neplacani = racuniZaSestevek.filter(v => !v.paid_at && v.status !== 'cancelled' && v.status !== 'draft');

  return odgovor({
    stranka: oblikujStranko(strankaVrstica),
    projekti: (projekti.data || []).map(v => oblikujProjekt(v, strankaKratko)),
    ponudbe: (ponudbe.data || []).map(v => oblikujPonudbo(v, strankaKratko)),
    racuni: (racuni.data || []).map(v => oblikujRacun(v, strankaKratko)),
    povzetek: {
      steviloProjektov: projekti.count ?? (projekti.data || []).length,
      steviloPonudb: ponudbe.count ?? (ponudbe.data || []).length,
      steviloRacunov: racuni.count ?? (racuni.data || []).length,
      vrednostPonudb: sestejPoValuti(vsePonudbe.data || []),
      vrednostRacunov: sestejPoValuti(racuniZaSestevek),
      neplacano: sestejPoValuti(neplacani),
    },
    stranicenje: { limit, offset },
  });
}
