import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import FlowV2Shell from '@/components/FlowV2Shell';

export const metadata: Metadata = { title: 'Podatki | Pinart Flow', robots: { index: false, follow: false } };

export default async function Podatki({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`; const en = locale === 'en';
  return <FlowV2Shell base={base} active="podatki" eyebrow={en ? 'DATA' : 'PODATKI'} naslov={en ? 'Everything you need to remember.' : 'Vse, česar ti ni treba pomniti.'} opis={en ? 'People, prices, documents and knowledge stay connected.' : 'Ljudje, cene, dokumenti in znanje ostanejo povezani.'} kartice={[
    { stevilka: '01', naslov: en ? 'Clients' : 'Stranke', opis: en ? 'Contacts, history and profitability.' : 'Kontakti, zgodovina in donosnost.', href: '/kalkulator/stranke', ton: 'zelena' },
    { stevilka: '02', naslov: en ? 'Price lists' : 'Moji ceniki', opis: en ? 'Your services, products and market levels.' : 'Tvoje storitve, izdelki in ravni cen.', href: '/kalkulator/ceniki', ton: 'vijola' },
    { stevilka: '03', naslov: en ? 'Archive' : 'Arhiv', opis: en ? 'Projects, quotes, contracts and invoices.' : 'Projekti, ponudbe, pogodbe in računi.', href: '/kalkulator/projekti', ton: 'modra' },
    { stevilka: '04', naslov: en ? 'Authorship vault' : 'Sef avtorstva', opis: en ? 'Evidence of creation and authorship.' : 'Dokazi o nastanku in avtorstvu.', href: '/kalkulator/sef', ton: 'marelica' },
    { stevilka: '05', naslov: en ? 'Team' : 'Sodelavci', opis: en ? 'People, roles and access.' : 'Ljudje, vloge in dostopi.', href: '/kalkulator/ekipa', ton: 'zelena' },
    { stevilka: '06', naslov: en ? 'Business model' : 'Poslovni okvir', opis: en ? 'How your business creates value.' : 'Kako tvoj posel ustvarja vrednost.', href: '/kalkulator/poslovni-nacrt', ton: 'marelica' },
  ]} />;
}
