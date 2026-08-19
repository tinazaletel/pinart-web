import {
  adminOdjemalec, beriStranicenje, napaka, odgovor, odgovorBrezZaledja,
  oblikujRacun, zemljevidStrank, STOLPCI_RACUNA,
} from '@/lib/apiV1';
import { preveriApiKljuc, odgovorBrezDostopa, omejiPoKljucu, imaObseg } from '@/lib/apiKljuc';

/* GET /api/v1/racuni — seznam računov organizacije.

   Postavk računa (stolpec `items` jsonb) prva različica ne vrača; enak razlog
   kot pri ponudbah. Stornirani računi so vrnjeni (status `cancelled`,
   `preklicano`), ker so del davčne sledi — izpuščeni so samo mehko izbrisani
   (deleted_at). */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const kontekst = await preveriApiKljuc(request);
  if (!kontekst) return odgovorBrezDostopa();

  if (!imaObseg(kontekst, 'branje')) return napaka('Ključ nima pravice branja.', 403);

  const omejitev = await omejiPoKljucu(request, 'v1-racuni', 120, kontekst);
  if (omejitev) return omejitev;

  const admin = adminOdjemalec();
  if (!admin) return odgovorBrezZaledja();

  const { limit, offset, od, do: doVrstice } = beriStranicenje(new URL(request.url));

  const { data, error } = await admin
    .from('invoices')
    .select(STOLPCI_RACUNA)
    .eq('organization_id', kontekst.organizationId)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .range(od, doVrstice);

  if (error) return napaka('Branja ni bilo mogoče izvesti.', 500, error);

  const vrstice = data || [];
  try {
    const stranke = await zemljevidStrank(admin, kontekst.organizationId, vrstice.map(v => v.client_id as string | null));
    const racuni = vrstice.map(v => oblikujRacun(v, stranke.get(String(v.client_id))));
    return odgovor({ racuni, stranicenje: { limit, offset, vrnjeno: racuni.length } });
  } catch (e) {
    return napaka('Branja ni bilo mogoče izvesti.', 500, e);
  }
}
