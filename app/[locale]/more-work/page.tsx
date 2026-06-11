import { setRequestLocale } from 'next-intl/server';
import MoreWorkGallery from '@/components/MoreWorkGallery';
import Footer from '@/components/sections/Footer';

export default async function MoreWorkPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <MoreWorkGallery />
      <Footer />
    </>
  );
}
