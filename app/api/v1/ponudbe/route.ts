import {
  adminOdjemalec, beriStranicenje, napaka, odgovor, odgovorBrezZaledja,
  oblikujPonudbo, zemljevidStrank, STOLPCI_PONUDBE,
} from '@/lib/apiV1';
import { preveriApiKljuc, odgovorBrezDostopa, omejiPoKljucu, imaObseg } from '@/lib/apiKljuc';

/* GET /api/v1/ponudbe — seznam ponudb organizacije.

   Postavk (stolpec `scope` jsonb) prva različica NE vrača: oblika postavke se
   še spreminja s cenikom in kalkulatorjem, javni odgovor pa je obljuba, ki jo
   je treba držati. Dodamo jo, ko se ustali. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const kontekst = await preveriApiKljuc(request);
  if (!kontekst) return odgovorBrezDostopa();

  if (!imaObseg(kontekst, 'branje')) return napaka('Ključ nima pravice branja.', 403);

  const omejitev = await omejiPoKljucu(request, 'v1-ponudbe', 120, kontekst);
  if (omejitev) return omejitev;

  const admin = adminOdjemalec();
  if (!admin) return odgovorBrezZaledja();

  const { limit, offset, od, do: doVrstice } = beriStranicenje(new URL(request.url));

  const { data, error } = await admin
    .from('offers')
    .select(STOLPCI_PONUDBE)
    .eq('organization_id', kontekst.organizationId)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .range(od, doVrstice);

  if (error) return napaka('Branja ni bilo mogoče izvesti.', 500, error);

  const vrstice = data || [];
  try {
    const stranke = await zemljevidStrank(admin, kontekst.organizationId, vrstice.map(v => v.client_id as string | null));
    const ponudbe = vrstice.map(v => oblikujPonudbo(v, stranke.get(String(v.client_id))));
    return odgovor({ ponudbe, stranicenje: { limit, offset, vrnjeno: ponudbe.length } });
  } catch (e) {
    return napaka('Branja ni bilo mogoče izvesti.', 500, e);
  }
}
