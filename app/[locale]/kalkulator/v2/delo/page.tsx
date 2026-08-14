import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import FlowV2Shell from '@/components/FlowV2Shell';

export const metadata: Metadata = { title: 'Delo | Pinart Flow', robots: { index: false, follow: false } };

export default async function Delo({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const base = locale === 'sl' ? '' : `/${locale}`; const en = locale === 'en';
  return <FlowV2Shell base={base} active="delo" eyebrow={en ? 'WORK' : 'DELO'} naslov={en ? 'From idea to delivery.' : 'Od ideje do izvedbe.'} opis={en ? 'Create, plan and finish client work without losing context.' : 'Ustvari, načrtuj in zaključi delo za stranke, ne da izgubiš kontekst.'} kartice={[
    { stevilka: '01', naslov: en ? 'Projects' : 'Projekti', opis: en ? 'Scope, documents and project progress.' : 'Obseg, dokumenti in napredek projekta.', href: '/kalkulator/projekti', ton: 'vijola' },
    { stevilka: '02', naslov: en ? 'Tasks' : 'Naloge', opis: en ? 'Plan work by project and priority.' : 'Razporedi delo po projektu in prioriteti.', href: '/kalkulator/naloge', ton: 'zelena' },
    { stevilka: '03', naslov: en ? 'Calendar' : 'Koledar', opis: en ? 'Deadlines, meetings and campaigns.' : 'Roki, sestanki in kampanje.', href: '/kalkulator/koledar', ton: 'marelica' },
    { stevilka: '04', naslov: en ? 'Marketing' : 'Marketing', opis: en ? 'Campaigns, content and publishing.' : 'Kampanje, vsebine in objave.', href: '/kalkulator/marketing', ton: 'modra' },
    { stevilka: '05', naslov: en ? 'Long-term work' : 'Dolgoročno', opis: en ? 'Retainers and recurring collaboration.' : 'Retainerji in ponavljajoče sodelovanje.', href: '/kalkulator/dolgorocno', ton: 'zelena' },
    { stevilka: '06', naslov: en ? 'Ideas' : 'Ideje', opis: en ? 'Capture ideas before they disappear.' : 'Ujemi ideje, preden izginejo.', href: '/kalkulator/ideje', ton: 'vijola' },
  ]} />;
}
