import {
  adminOdjemalec, beriStranicenje, napaka, odgovor, odgovorBrezZaledja,
  oblikujStranko, STOLPCI_STRANKE,
} from '@/lib/apiV1';
import { preveriApiKljuc, odgovorBrezDostopa, omejiPoKljucu, imaObseg } from '@/lib/apiKljuc';

/* GET /api/v1/stranke — seznam strank organizacije, ki ji pripada API ključ.

   Tabela `clients` NIMA stolpca deleted_at (stranke se brišejo trdo, glej
   deleteFlowRecords v lib/pinartFlowCloud), zato tu ni filtra po nagrobniku —
   za razliko od ponudb, računov in projektov. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const kontekst = await preveriApiKljuc(request);
  if (!kontekst) return odgovorBrezDostopa();

  if (!imaObseg(kontekst, 'branje')) return napaka('Ključ nima pravice branja.', 403);

  const omejitev = await omejiPoKljucu(request, 'v1-stranke', 120, kontekst);
  if (omejitev) return omejitev;

  const admin = adminOdjemalec();
  if (!admin) return odgovorBrezZaledja();

  const { limit, offset, od, do: doVrstice } = beriStranicenje(new URL(request.url));

  /* organization_id je edino, kar loči podatke enega podjetja od drugega —
     service-role odjemalec obide RLS. */
  const { data, error } = await admin
    .from('clients')
    .select(STOLPCI_STRANKE)
    .eq('organization_id', kontekst.organizationId)
    .order('name', { ascending: true })
    .range(od, doVrstice);

  if (error) return napaka('Branja ni bilo mogoče izvesti.', 500, error);

  const stranke = (data || []).map(vrstica => oblikujStranko(vrstica));
  return odgovor({ stranke, stranicenje: { limit, offset, vrnjeno: stranke.length } });
}
