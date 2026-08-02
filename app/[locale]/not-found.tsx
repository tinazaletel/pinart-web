import { headers } from 'next/headers';
import NotFound from '@/components/sections/NotFound';
import Flow404 from '@/components/Flow404';

/* Ista Next aplikacija strezhe dve znamki: pinart.si (portfolio) in
   pinartflow.com (Flow). 404 mora ustrezati domeni — na Flowu kuzhek s kablom,
   na portfoliju obstojechi Pinart 404. Domeno preberemo iz Host glave. */
export default async function NotFoundPage() {
  const h = await headers();
  const host = (h.get('host') || '').toLowerCase();
  /* Portfolio 404 (Pinart) samo na znani portfolio domeni pinart.si; povsod
     drugod (pinartflow.com, preview, localhost) je Flow privzeta znamka. */
  const jePortfolio = /(^|\.)pinart\.si$/.test(host);
  return jePortfolio ? <NotFound /> : <Flow404 />;
}
