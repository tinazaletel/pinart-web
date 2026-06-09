'use client';

import { useEffect, useState } from 'react';
import CaseShell, { NextCase } from './CaseShell';
import BlurText from '@/components/BlurText';

// Cycles through an array of screen sources every `interval` ms with a soft
// crossfade. Used inside the laptop / phone mockups below.
function ScreenCycler({
  sources,
  interval = 3200,
  alt,
  style
}: {
  sources: string[];
  interval?: number;
  alt: string;
  style?: React.CSSProperties;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (sources.length < 2) return;
    const id = window.setInterval(() => {
      setI((prev) => (prev + 1) % sources.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [sources.length, interval]);

  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      {sources.map((src, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: idx === i ? 1 : 0,
            transition: 'opacity 700ms ease'
          }}
        />
      ))}
    </div>
  );
}

const LAPTOP_SCREENS = [
  '/work/lucky-7/desktop_wheel.jpg',
  '/work/lucky-7/desktop_gameplay.png',
  '/work/lucky-7/desktop_win.jpg'
];
const PHONE_SCREENS = [
  '/work/lucky-7/mobile_intro.png',
  '/work/lucky-7/mobile_gameplay.jpg',
  '/work/lucky-7/mobile_win.png'
];

export default function Lucky7Case({ locale }: { locale: string }) {
  return (
    <CaseShell>
      <section className="case-hero">
        <div>
          <p className="eyebrow">
            Selected Work · <span className="accent">№ 03</span> · 2026
          </p>
          <BlurText
            tag="h1"
            className="case-title"
            text="Lucky 7."
            animateBy="words"
            direction="bottom"
            delay={120}
            stepDuration={0.45}
          />
        </div>

        <div className="case-hero__bottom">
          <p className="case-lede">
            Iz <strong>basic spletne strani</strong> v <em>gaming izkušnjo</em>,
            ki igralca povabi notri — prenova klasične online igre za slovensko
            loterijo.
          </p>
          <div className="case-meta-inline">
            <div>Role <span>Visual · UX/UI · Motion</span></div>
            <div>Year <span>2026</span></div>
            <div>For <span>Eloterija · via Interblock</span></div>
          </div>
        </div>

        <div className="case-hero__visual">
          <video src="/work/lucky-7/loop.mp4" autoPlay muted loop playsInline />
        </div>
      </section>

      <section className="case-section">
        <div className="two-col">
          <div>
            <p className="head-label">
              <span className="head-label__num">02</span> · The brief
            </p>
            <h2 className="head-title">
              Naredi spletno igro,
              <br />
              ki <em>kliče k igri.</em>
            </h2>
          </div>
          <div>
            <div style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--ink-soft)', maxWidth: 640 }}>
              <p style={{ margin: 0 }}>
                Lucky 7 je klasična srečka, ki je v spletni različici živela kot{' '}
                <strong>statična stran</strong> — vse je delovalo, nič ni vleklo.
                Naloga: prenoviti vizualni jezik tako, da igra{' '}
                <em>izgleda kot igra</em> — moderno, gaming-style, z animacijami,
                ki spodbujajo igralca k klikanju.
              </p>
              <p style={{ marginTop: 20 }}>
                Pristop: moodboardi → stilske različice → izbira smeri →
                mobile + desktop UI → motion prototipi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT — desktop + mobile */}
      <section
        className="case-section"
        style={{ background: 'var(--ink, #111)', color: 'var(--paper, #F5F2EA)' }}
      >
        <div style={{ maxWidth: 800 }}>
          <p className="head-label" style={{ color: 'rgba(245,242,234,0.55)' }}>
            <span className="head-label__num">03</span> · The product
          </p>
          <h2 className="head-title" style={{ color: 'var(--paper, #F5F2EA)' }}>
            Mobile <em>+ desktop.</em>
          </h2>
          <p className="lede" style={{ color: 'rgba(245,242,234,0.7)' }}>
            Responsive prenova — od velikega zaslona doma do telefona na avtobusu.
            Vsak ekran s svojo gaming energijo.
          </p>
        </div>

        {/* Laptop + Phone mockups, screens cycle inside each */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.7fr 1fr',
            gap: 24,
            marginTop: 48,
            alignItems: 'end',
            maxWidth: 1180
          }}
        >
          {/* Laptop frame */}
          <div className="device-laptop">
            <div className="device-laptop__lid">
              <div className="device-laptop__bezel">
                <div className="device-laptop__screen">
                  <ScreenCycler sources={LAPTOP_SCREENS} alt="Lucky 7 — desktop screen" />
                </div>
              </div>
            </div>
            <div className="device-laptop__base" />
            <div className="tile-cap">Desktop</div>
          </div>

          {/* Phone frame */}
          <div className="device-phone-wrap">
            <div className="device-phone">
              <div className="device-phone__notch" />
              <div className="device-phone__screen">
                <ScreenCycler sources={PHONE_SCREENS} alt="Lucky 7 — mobile screen" />
              </div>
            </div>
            <div className="tile-cap">Mobile</div>
          </div>
        </div>

        <style jsx>{`
          .device-laptop { position: relative; }
          .device-laptop__lid {
            background: #1c1c1c;
            border-radius: 14px 14px 4px 4px;
            padding: 12px 12px 14px;
            box-shadow: 0 30px 60px rgba(0,0,0,0.45);
          }
          .device-laptop__bezel {
            background: #000;
            border-radius: 6px;
            padding: 2px;
          }
          .device-laptop__screen {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: 4px;
            overflow: hidden;
            background: #0a0a0a;
          }
          .device-laptop__base {
            position: relative;
            width: 112%;
            height: 14px;
            margin: 0 -6% 0;
            background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 60%, #0e0e0e 100%);
            border-radius: 0 0 12px 12px;
            box-shadow: 0 14px 24px rgba(0,0,0,0.35);
          }
          .device-laptop__base::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            width: 18%;
            height: 5px;
            background: #0a0a0a;
            border-radius: 0 0 8px 8px;
          }

          .device-phone-wrap { display: flex; flex-direction: column; align-items: center; }
          .device-phone {
            position: relative;
            width: 78%;
            aspect-ratio: 9 / 19.5;
            background: #0c0c0c;
            border-radius: 38px;
            padding: 10px;
            box-shadow: 0 30px 60px rgba(0,0,0,0.45),
                        inset 0 0 0 2px rgba(255,255,255,0.05);
          }
          .device-phone__notch {
            position: absolute;
            top: 18px;
            left: 50%;
            transform: translateX(-50%);
            width: 36%;
            height: 22px;
            background: #000;
            border-radius: 14px;
            z-index: 2;
          }
          .device-phone__screen {
            position: relative;
            width: 100%;
            aspect-ratio: 9 / 19.5;
            border-radius: 28px;
            overflow: hidden;
            background: #0a0a0a;
          }
          .tile-cap {
            margin-top: 14px;
            font-family: var(--font-sans);
            font-size: 12px;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: rgba(245,242,234,0.55);
            font-weight: 500;
            text-align: center;
          }
        `}</style>
      </section>

      {/* MOTION CALLOUT */}
      <section
        className="case-section"
        style={{
          background:
            'linear-gradient(135deg, #001632 0%, #003B7A 60%, #0a2255 100%)',
          color: 'var(--paper, #F5F2EA)'
        }}
      >
        <div style={{ maxWidth: 900 }}>
          <p
            className="head-label"
            style={{ color: '#FFD200', letterSpacing: '0.4em' }}
          >
            A note on motion
          </p>
          <h2 className="head-title" style={{ color: 'var(--paper, #F5F2EA)' }}>
            Statične slike{' '}
            <em
              style={{
                background:
                  'linear-gradient(135deg, #FFD200 0%, #fff7c2 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              ne pokažejo gibanja.
            </em>
          </h2>
          <p className="lede" style={{ color: 'rgba(245,242,234,0.85)' }}>
            Pravi karakter te prenove je v animaciji — kako sedmica zavibrira,
            kako se kartice odprejo, kako se ozadje odzove na klik.{' '}
            <em>To je tisto, kar igralca pripelje nazaj.</em>
          </p>
        </div>
      </section>

      <section className="stats">
        <div>
          <div className="stats__num">4</div>
          <div className="stats__label">Moodboards</div>
          <div className="stats__desc">Stilske različice za prvi izbor smeri.</div>
        </div>
        <div>
          <div className="stats__num">2</div>
          <div className="stats__label">Platforms</div>
          <div className="stats__desc">Desktop + mobile redesign.</div>
        </div>
        <div>
          <div className="stats__num">6</div>
          <div className="stats__label">Months</div>
          <div className="stats__desc">Od brief-a do predaje.</div>
        </div>
        <div>
          <div className="stats__num">1</div>
          <div className="stats__label">Direction</div>
          <div className="stats__desc">V brand paleti, modernejši jezik.</div>
        </div>
      </section>

      <NextCase href={`/${locale}/work/molly-lolly`} title="Molly Lolly<em>.</em>" />
    </CaseShell>
  );
}
