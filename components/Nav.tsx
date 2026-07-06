'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

const NAV_LINKS = [
  { key: 'home' as const, href: '/' },
  { key: 'services' as const, href: '/#services' },
  { key: 'work' as const, href: '/#work' },
  { key: 'about' as const, href: '/#about' },
  { key: 'contact' as const, href: '/#footer' },
];

export default function Nav() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const otherLocale = locale === 'sl' ? 'en' : 'sl';
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const heroDarkRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let dark = false;

    const update = () => {
      setIsScrolled(window.scrollY > 24);
      const headerH = header.offsetHeight;
      const hero = document.getElementById('hero');
      const heroRect = hero?.getBoundingClientRect();

      // Hero is visible and overlapping the nav — use its own dark signal.
      // Only when hero is actually crossing the nav bar (top above, bottom below).
      const heroOverlapsNav = !!heroRect &&
        heroRect.top  <  headerH &&
        heroRect.bottom > headerH;

      if (heroOverlapsNav) {
        const newDark = heroDarkRef.current;
        if (newDark !== dark) { dark = newDark; setIsDark(newDark); }
        return;
      }

      // Hero fully above the nav (scrolled past) OR below it (not yet reached).
      // In either case use the data-nav-dark sections to decide colour.
      // Also handle hero itself: if it's still partially in viewport but its
      // bottom has cleared the nav, treat it as a light section (no data-nav-dark).
      const darkSections = document.querySelectorAll('[data-nav-dark]');
      const newDark = Array.from(darkSections).some(el => {
        if ((el as HTMLElement).dataset.navLightUi === 'true') return false;
        const rect = el.getBoundingClientRect();
        const opacity = parseFloat((el as HTMLElement).style.opacity ?? '1');
        const visible = isNaN(opacity) || opacity > 0.08;
        return visible && rect.top < headerH && rect.bottom > headerH;
      });

      if (newDark !== dark) { dark = newDark; setIsDark(newDark); }
    };

    // Listen for hero dark-mode signal (final screen vs restart)
    const onPinartDark = (e: Event) => {
      const d = (e as CustomEvent<{ dark: boolean }>).detail.dark;
      heroDarkRef.current = d;
      dark = d;
      setIsDark(d);
      requestAnimationFrame(update);
    };

    // SmoothScroll fires this after a programmatic snap, since Lenis programmatic
    // scrolls don't reliably emit a native 'scroll' event. rAF so we read the
    // settled position.
    const onNavRefresh = () => requestAnimationFrame(update);

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('hashchange', update);
    window.addEventListener('pinart-dark', onPinartDark);
    window.addEventListener('pinart-nav-refresh', onNavRefresh);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('hashchange', update);
      window.removeEventListener('pinart-dark', onPinartDark);
      window.removeEventListener('pinart-nav-refresh', onNavRefresh);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        data-scrolled="false"
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between"
        style={{ padding: 'clamp(0.75rem,1.4vw,1.1rem) clamp(1.25rem,4vw,4.5rem)' }}
      >
        {/* Logo — follows dark/light state on both mobile and desktop */}
        <Link
          href="/"
          onClick={(e) => {
            setMenuOpen(false);
            // Let the hero intro play from the start whenever the logo is used.
            try { sessionStorage.removeItem('pinart-hero-played'); } catch { /* ignore */ }
            const onHome = pathname === '/' || /^\/[a-z]{2}\/?$/i.test(pathname);
            if (onHome) {
              // Already home: no route change would fire, so scroll to the top
              // and replay the intro manually.
              e.preventDefault();
              const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (v: number, o: object) => void } }).__pinartLenis;
              if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
              else window.scrollTo(0, 0);
              window.dispatchEvent(new CustomEvent('pinart-replay-hero'));
            }
          }}
        >
          <Image
            src={isDark ? '/Logos/Logo_pinart_light.svg' : '/Logos/Logo_pinart.svg'}
            alt="Pinart"
            width={50}
            height={50}
            priority
            style={{ transition: 'opacity 0.5s ease' }}
          />
        </Link>

        {/* Desktop navigation — pill wrapper */}
        <nav
          className="nav-desktop hidden md:flex items-center gap-10 lg:gap-12"
          style={{
            padding: isScrolled ? '0.5rem 1.5rem' : '0',
            backgroundColor: isScrolled
              ? isDark ? 'rgba(17,17,17,0.15)' : 'rgba(245,242,234,0.15)'
              : 'transparent',
            backdropFilter: isScrolled ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
            borderRadius: '10px',
            border: 'none',
            transition: 'background-color 0.35s ease, padding 0.35s ease, border-color 0.35s ease, backdrop-filter 0.35s ease',
          }}
        >
          {NAV_LINKS.map(({ key, href }) => {
            const hashIdx = href.indexOf('#');
            const hash = hashIdx === -1 ? '' : href.slice(hashIdx);
            // For hash links on the home page we render a plain <a> and
            // handle scrolling manually — using next-intl <Link> here
            // triggers Next router behavior that races our Lenis scroll.
            const isHomeHash = href.startsWith('/#');
            const onHome = pathname === '/' || /^\/[a-z]{2}\/?$/i.test(pathname);

            if (isHomeHash && onHome) {
              return (
                <a
                  key={key}
                  href={`/${locale}${hash}`}
                  className="group relative py-1"
                  onClick={(e) => {
                    e.preventDefault();
                    // Zavesa takoj ob kliku — pod njo se zgodi takojsen
                    // preskok (SmoothScroll), namesto voznje cez sekcije.
                    window.dispatchEvent(new CustomEvent('pinart-cover', { detail: { on: true } }));
                    const BEFORE_INK = ['hero', 'services'];
                    if (!BEFORE_INK.includes(hash.slice(1))) {
                      window.dispatchEvent(new CustomEvent('pinart-skip-ink'));
                    }
                    // pinart-goto-hash is handled by SmoothScroll which
                    // applies negative-marginTop compensation and jumps
                    // immediately under the cover.
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('pinart-goto-hash', { detail: { hash } }));
                      window.history.pushState(null, '', `/${locale}${hash}`);
                    }, 220);
                  }}
                >
                  <span
                    className="block text-[10px] font-sans font-medium uppercase tracking-[0.22em] transition-[transform,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-[3px]"
                    style={{ color: isDark ? '#F5F2EA' : '#111111' }}
                  >
                    {t(key)}
                  </span>
                  <span
                    className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-[width,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    style={{ backgroundColor: isDark ? 'rgba(248,245,238,0.45)' : 'rgba(17,17,17,0.5)' }}
                  />
                </a>
              );
            }

            return (
              <Link key={key} href={href} className="group relative py-1">
                <span
                  className="block text-[10px] font-sans font-medium uppercase tracking-[0.22em] transition-[transform,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-[3px]"
                  style={{ color: isDark ? '#F5F2EA' : '#111111' }}
                >
                  {t(key)}
                </span>
                <span
                  className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-[width,background-color] duration-300 ease-out"
                  style={{ backgroundColor: isDark ? 'rgba(248,245,238,0.45)' : 'rgba(17,17,17,0.5)' }}
                />
              </Link>
            );
          })}
          <Link
            href={pathname}
            locale={otherLocale}
            className="text-[10px] font-sans tracking-[0.18em] hover:opacity-85 transition-[opacity,color,border-color] duration-200 ml-2 inline-flex items-center"
            style={{
              color: isDark ? 'rgba(248,245,238,0.75)' : 'var(--ink)',
              border: `1px solid ${isDark ? 'rgba(248,245,238,0.35)' : 'rgba(17,17,17,0.28)'}`,
              borderRadius: '999px',
              padding: '0 0.75rem',
              height: '1.9rem',
            }}
          >
            {t('toggle')}
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="nav-burger md:hidden flex flex-col justify-center"
          style={{
            gap: '5px',
            padding: isScrolled ? '0.75rem 0.75rem' : '0.25rem',
            backgroundColor: isScrolled ? (isDark ? 'rgba(17,17,17,0.15)' : 'rgba(245,242,234,0.15)') : 'transparent',
            backdropFilter: isScrolled ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
            borderRadius: '10px',
            transition: 'background-color 0.35s ease, padding 0.35s ease',
          }}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span
            className="block w-[22px] origin-center transition-[transform,background-color] duration-300"
            style={{
              height: '1.5px',
              backgroundColor: isDark ? '#F5F2EA' : '#111111',
              transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
            }}
          />
          <span
            className="block w-[22px] transition-[background-color] duration-200"
            style={{
              height: '1.5px',
              backgroundColor: menuOpen ? 'transparent' : (isDark ? '#F5F2EA' : '#111111'),
            }}
          />
          <span
            className="block w-[22px] origin-center transition-[transform,background-color] duration-300"
            style={{
              height: '1.5px',
              backgroundColor: isDark ? '#F5F2EA' : '#111111',
              transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
            }}
          />
        </button>
      </header>

      {/* Mobile fullscreen overlay */}
      <div
        className="fixed inset-0 z-40 bg-paper flex flex-col justify-center px-10 pointer-events-none"
        style={{
          opacity: menuOpen ? 1 : 0,
          transition: 'opacity 0.45s ease',
          pointerEvents: menuOpen ? 'auto' : 'none',
        }}
        aria-hidden={!menuOpen}
      >
        <nav className="flex flex-col gap-5">
          {NAV_LINKS.map(({ key, href }, i) => {
            const hashIdx = href.indexOf('#');
            const hash = hashIdx === -1 ? '' : href.slice(hashIdx);
            return (
            <Link
              key={key}
              href={href}
              scroll={!hash}
              onClick={() => {
                setMenuOpen(false);
                if (!hash) return;
                window.dispatchEvent(new CustomEvent('pinart-cover', { detail: { on: true } }));
                const BEFORE_INK = ['hero', 'services'];
                if (!BEFORE_INK.includes(hash.slice(1))) {
                  window.dispatchEvent(new CustomEvent('pinart-skip-ink'));
                }
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('pinart-goto-hash', { detail: { hash } }));
                }, 220);
              }}
              className="font-serif leading-none text-ink"
              style={{
                fontSize: 'clamp(2.4rem, 10vw, 3.8rem)',
                letterSpacing: '-0.02em',
                opacity: menuOpen ? 0.75 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(10px)',
                transition: `opacity 0.5s ease ${i * 65}ms, transform 0.5s ease ${i * 65}ms`,
              }}
            >
              {t(key)}
            </Link>
            );
          })}
          <div
            className="mt-10"
            style={{
              opacity: menuOpen ? 0.35 : 0,
              transition: `opacity 0.5s ease ${NAV_LINKS.length * 65 + 40}ms`,
            }}
          >
            <Link
              href={pathname}
              locale={otherLocale}
              onClick={() => setMenuOpen(false)}
              className="text-[11px] font-sans uppercase tracking-[0.22em] text-ink inline-flex items-center"
              style={{
                border: '1px solid rgba(17,17,17,0.42)',
                borderRadius: '999px',
                padding: '0.5rem 1rem',
                height: '2rem'
              }}
            >
              {t('toggle')}
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
