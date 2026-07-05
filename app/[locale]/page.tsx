import { setRequestLocale } from 'next-intl/server';
import Hero from '@/components/sections/Hero';
import TypographyCollapse from '@/components/sections/TypographyCollapse';
import Services from '@/components/sections/Services';
import Projects from '@/components/sections/Projects';
import About from '@/components/sections/About';
import Clients from '@/components/sections/Clients';
import Testimonials from '@/components/sections/Testimonials';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/sections/Footer';
import SlideStack from '@/components/SlideStack';

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      {/* Pupa SVG se zacne prenasati ze s HTML-jem, ne sele ko Hero-jev JS
          po hidraciji poklice fetch — na pocasnih telefonih to odreze vec
          sekund belega zaslona med preloaderjem in packo. */}
      <link rel="preload" href="/pupa_pinart_6.svg" as="fetch" />
      <Hero />
      <Services />
      <TypographyCollapse />
      <Projects />
      <About />
      <Clients />
      <Testimonials />
      <Contact />
      <Footer />
      <SlideStack />
    </main>
  );
}
