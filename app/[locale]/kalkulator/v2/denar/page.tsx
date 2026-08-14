import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import FlowV2Shell from '@/components/FlowV2Shell';

export const metadata: Metadata = { title: 'Denar | Pinart Flow', robots: { index: false, follow: false } };

export default async function Denar({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`; const en = locale === 'en';
  return <FlowV2Shell base={base} active="denar" eyebrow={en ? 'MONEY' : 'DENAR'} naslov={en ? 'Know what your work earns.' : 'Vedi, kaj ti delo prinaša.'} opis={en ? 'From pricing to payment and accounting — one connected trail.' : 'Od cene do plačila in računovodstva — ena povezana sled.'} kartice={[
    { stevilka: '01', naslov: en ? 'Invoices' : 'Računi', opis: en ? 'Issue, track and connect invoices.' : 'Izdaj, spremljaj in poveži račune.', href: '/kalkulator/racuni', ton: 'vijola' },
    { stevilka: '02', naslov: en ? 'Expenses' : 'Stroški', opis: en ? 'Company, project and recurring costs.' : 'Podjetniški, projektni in ponavljajoči stroški.', href: '/kalkulator/stroski', ton: 'marelica' },
    { stevilka: '03', naslov: en ? 'Accounting' : 'Računovodstvo', opis: en ? 'Prepare and send a complete package.' : 'Pripravi in pošlji celoten paket.', href: '/kalkulator/racunovodstvo', ton: 'zelena' },
    { stevilka: '04', naslov: en ? 'Goals' : 'Cilji', opis: en ? 'Revenue target, reserve and progress.' : 'Ciljni prihodek, rezerva in napredek.', href: '/kalkulator/cilji', ton: 'modra' },
    { stevilka: '05', naslov: en ? 'Price & time' : 'Cena & čas', opis: en ? 'Time, profitability and better pricing.' : 'Čas, donosnost in boljše določanje cen.', href: '/kalkulator/cas', ton: 'vijola' },
    { stevilka: '06', naslov: en ? 'Contracts' : 'Pogodbe', opis: en ? 'Agreements connected to work and payment.' : 'Dogovori, povezani z delom in plačilom.', href: '/kalkulator/pogodbe', ton: 'zelena' },
  ]} />;
}
