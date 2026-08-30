import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { dolociPonudbo, valutaZaDrzavo } from '@/lib/cenaNarocnine';
import { oddanihUstanovnih } from '@/lib/ustanovnaMesta';
import { setRequestLocale } from 'next-intl/server';
import FlowNav from '@/components/FlowNav';
import FlowLanding from '@/components/FlowLanding';

/* Predstavitev celotnega paketa Pinart Flow. Namenjeno domeni
   pinartflow.com/ (glej opombo o preusmeritvi ob deployu). */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const jeEn = locale === 'en';
  const title = jeEn
    ? 'Pinart Flow — your whole creative business in one place'
    : 'Pinart Flow — vse tvoje poslovanje na enem mestu';
  const description = jeEn
    ? 'Fair pricing, proposals, contracts, invoices, projects, clients and goals in one workspace for independent creatives. The calculator is free.'
    : 'Pinart Flow poveže kalkulator poštenih cen, ponudbe, pogodbe, retainerje, račune, stroške, stranke in cilje v eno delovno okolje za samostojne kreativce. Kalkulator je brezplačen.';
  /* BREZ tega je Flow ob deljenju povezave nosil sliko in naslov STUDIA:
     openGraph je podedoval od [locale]/layout (pinart.si, og-image.jpg), ker
     ga tu nismo povozili — v iMessage se je pokazal portret Pinart studia
     namesto Flowa (Tina, 27. 8. 2026). Slika mora biti na javni poti brez
     pike v imenu mape, sicer je vratar ne spusti do pajkov. */
  const url = jeEn ? 'https://pinartflow.com/en/flow' : 'https://pinartflow.com';
  const slika = 'https://pinartflow.com/flow-og.jpg';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Pinart Flow',
      locale: jeEn ? 'en_US' : 'sl_SI',
      type: 'website',
      images: [{ url: slika, width: 1200, height: 630, alt: jeEn ? 'Pinart Flow — every project, from quote to payment' : 'Pinart Flow — vsak projekt, od ponudbe do plačila' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [slika] },
  };
}

export default async function FlowPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ valuta?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  /* Cenik v dolarjih vidi obiskovalec iz ZDA (glava ponudnika gostovanja).
     Jezik NI merilo: Anglez v Ljubljani placa v evrih, Slovenec v New Yorku v
     dolarjih. Ce glave ni — lokalni razvoj, drug ponudnik — ostanejo evri.
     ?valuta=usd oziroma ?valuta=eur je rocni preklop za preizkus. */
  const rocna = (await searchParams)?.valuta?.toLowerCase();
  const drzava = (await headers()).get('x-vercel-ip-country');
  const valuta = rocna === 'usd' ? 'USD' : rocna === 'eur' ? 'EUR' : valutaZaDrzavo(drzava);

  /* Katera ponudba velja ZDAJ — določi jo strežnik, iz oddanih ustanovnih mest
     in datuma, isto kot blagajna. V brskalniku tega ne računamo: new Date() med
     izrisom razhaja strežniški in odjemalčev HTML (hidracija). */
  const ponudba = dolociPonudbo(new Date(), await oddanihUstanovnih());

  return (
    <main style={{ minHeight: '100dvh' }}>
      <FlowNav locale={locale} />
      <FlowLanding locale={locale} valuta={valuta} ponudba={ponudba} />
    </main>
  );
}
