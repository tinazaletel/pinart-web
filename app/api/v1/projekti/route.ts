import {
  adminOdjemalec, beriStranicenje, napaka, odgovor, odgovorBrezZaledja,
  oblikujProjekt, zemljevidStrank, STOLPCI_PROJEKTA,
} from '@/lib/apiV1';
import { preveriApiKljuc, odgovorBrezDostopa, omejiPoKljucu, imaObseg } from '@/lib/apiKljuc';

/* GET /api/v1/projekti — seznam projektov organizacije.

   Celoten projekt (brief, cilji, povezave) živi v stolpcu `data` jsonb; javni
   API namenoma vrača samo jedrne stolpce, ker je `data` prosta oblika, ki se
   spreminja z vsako rubriko briefa in bi jo zunanji odjemalec razumel kot
   pogodbo. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const kontekst = await preveriApiKljuc(request);
  if (!kontekst) return odgovorBrezDostopa();

  if (!imaObseg(kontekst, 'branje')) return napaka('Ključ nima pravice branja.', 403);

  const omejitev = await omejiPoKljucu(request, 'v1-projekti', 120, kontekst);
  if (omejitev) return omejitev;

  const admin = adminOdjemalec();
  if (!admin) return odgovorBrezZaledja();

  const { limit, offset, od, do: doVrstice } = beriStranicenje(new URL(request.url));

  const { data, error } = await admin
    .from('projects')
    .select(STOLPCI_PROJEKTA)
    .eq('organization_id', kontekst.organizationId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(od, doVrstice);

  if (error) return napaka('Branja ni bilo mogoče izvesti.', 500, error);

  const vrstice = data || [];
  try {
    const stranke = await zemljevidStrank(admin, kontekst.organizationId, vrstice.map(v => v.client_id as string | null));
    const projekti = vrstice.map(v => oblikujProjekt(v, stranke.get(String(v.client_id))));
    return odgovor({ projekti, stranicenje: { limit, offset, vrnjeno: projekti.length } });
  } catch (e) {
    return napaka('Branja ni bilo mogoče izvesti.', 500, e);
  }
}
