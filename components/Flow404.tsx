'use client';

import { useLocale } from 'next-intl';
import Flow404View from '@/components/Flow404View';

/* Klientni ovoj: v next-intl kontekstu ([locale] poddrevo) prebere jezik in ga
   poda predstavitvenemu Flow404View. Za koren (brez konteksta) se uporabi
   Flow404View neposredno s privzetim jezikom. */
export default function Flow404() {
  const locale = useLocale();
  return <Flow404View locale={locale} />;
}
