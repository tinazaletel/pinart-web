import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { localePath } from '@/i18n/routing';

/* Za zdaj imamo EN landing (/flow). Ločeni kalkulator-landing (KalkulatorLanding)
   je dan na stran — komponenta ostane za kasnejšo marketinško/SEO uporabo. Bare
   /kalkulator preusmerimo na /flow; samo orodje ostane na /kalkulator/orodje. */
export default async function KalkulatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect(localePath(locale, '/flow'));
}
