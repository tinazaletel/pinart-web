/**
 * Root-level not-found — catches URLs outside the [locale] segment.
 * Mirrors the custom Pinart 404 design (same as [locale]/not-found).
 */
import Link from 'next/link';

export default function RootNotFound() {
  return (
    <html lang="sl">
      <body style={{ margin: 0, padding: 0, background: '#fcf9f6', color: '#1a1a1a', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <div style={{ position: 'fixed', inset: 0, background: '#fcf9f6', overflow: 'hidden' }}>

          {/* Pupa background */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pupa_404_bg.svg"
              alt=""
              draggable={false}
              style={{ position: 'absolute', left: '50%', bottom: '-90vh', transform: 'translateX(-50%)', height: '260vh', width: 'auto', display: 'block' }}
            />
          </div>

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 100px', maxWidth: '720px' }}>
            <div style={{ fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8a8478', marginBottom: '24px' }}>
              Pinart
            </div>
            <h1 style={{ fontSize: 'clamp(140px, 20vw, 320px)', lineHeight: 0.88, fontWeight: 900, letterSpacing: '-0.05em', margin: '0 0 32px 0', color: '#1a1a1a' }}>
              404
            </h1>
            <h2 style={{ fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 16px 0' }}>
              Ta stran je nekam pobegnila.
            </h2>
            <p style={{ fontSize: '17px', lineHeight: 1.5, color: '#1a1a1a', maxWidth: '520px', margin: '0 0 36px 0' }}>
              Mogoče je odšla na kavo, mogoče je nikoli ni bilo. Ti si pa še vedno na pravem mestu.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link href="/sl" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 28px', borderRadius: '999px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', background: '#1a1a1a', color: '#fcf9f6' }}>
                ← Nazaj domov
              </Link>
              <Link href="/sl/more-work" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 28px', borderRadius: '999px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', background: 'rgba(252,249,246,0.7)', color: '#1a1a1a', border: '1.5px solid #c8c1b3' }}>
                Projekti
              </Link>
            </div>
          </div>

          <div style={{ position: 'absolute', left: '100px', bottom: '40px', fontSize: '12px', color: '#8a8478', letterSpacing: '0.05em', zIndex: 3 }}>
            © Pinart — design studio
          </div>
        </div>
      </body>
    </html>
  );
}
