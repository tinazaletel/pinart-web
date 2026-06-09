'use client';

import CaseShell, { NextCase } from './CaseShell';
import BlurText from '@/components/BlurText';

export default function MollyLollyCase({ locale }: { locale: string }) {
  return (
    <CaseShell>
      {/* ============ HERO ============ */}
      <section className="case-hero">
        <div>
          <p className="eyebrow">
            Selected Work · <span className="accent">№ 04</span> · End-to-end brand
          </p>
          <BlurText
            tag="h1"
            className="case-title"
            text="Molly Lolly."
            animateBy="words"
            direction="bottom"
            delay={120}
            stepDuration={0.45}
          />
        </div>

        <div className="case-hero__bottom">
          <p className="case-lede">
            Cel brand z <strong>nič</strong> v knjige, plišasto, AR aplikacijo,
            3D sobo in spletno trgovino — <em>en vizija, ena režija,
            več ekip.</em>
          </p>
          <div className="case-meta-inline">
            <div>Role <span>Creative Direction · Brand Owner · Product Lead</span></div>
            <div>Output <span>Print · Plush · Web · AR &amp; 3D · Games</span></div>
            <div>Audience <span>Ages 0—10</span></div>
          </div>
        </div>

        <div className="case-hero__visual" style={{ aspectRatio: '16/9' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/work/molly-lolly/toy_book.jpg"
            alt="Molly Lolly plush + book"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        </div>
      </section>

      {/* ============ INTRO — what this case proves ============ */}
      <section className="case-section">
        <div className="two-col">
          <div>
            <p className="head-label">
              <span className="head-label__num">02</span> · What this proves
            </p>
            <h2 className="head-title">
              Brand, ki <em>ne ostane</em> v Figmi.
            </h2>
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.65,
                color: 'var(--ink-soft)',
                maxWidth: 640
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Molly Lolly</strong> je primer, ki kaže, kako delam, ko
                me nekdo najame kot <em>brand managerja</em> ali{' '}
                <em>kreativnega direktorja</em>: ne le narišem logo in pošljem
                PDF — vodim brand <strong>od koncepta do izvedbe</strong>.
              </p>
              <p style={{ marginTop: 20 }}>
                Tukaj sem bila hkrati avtorica, naročnica, projektna vodja in
                kreativna direktorica. Ilustracije, knjige, plišasto{' '}
                <strong>in celoten UX/UI digitalnih produktov</strong> sem
                oblikovala sama. Za <em>razvoj aplikacij, AR in 3D okolje</em>{' '}
                sem najela razvijalce — in jih vodila, dokler ni bila vsaka
                stvar v skladu z znamko.
              </p>
              <p style={{ marginTop: 20 }}>
                Rezultat ni mood&shy;board. <em>Rezultat je svet otroka,</em> ki
                lahko prime knjigo, jo prislonil ob tablet in vidi, kako liki
                stopijo na stran.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px 40px',
                marginTop: 48,
                paddingTop: 32,
                borderTop: '1px solid var(--line)',
                maxWidth: 640
              }}
            >
              <Meta label="My role">
                Brand creator<br />Creative direction<br />Illustration<br />
                Product &amp; book design<br />UX &amp; UI design<br />Vendor &amp; team management
              </Meta>
              <Meta label="External teams" sub="led & directed by me">
                App development<br />AR engineering<br />3D environment
              </Meta>
              <Meta label="Type" sub="full IP ownership">
                Own brand · Pinart in-house
              </Meta>
              <Meta label="Audience" sub="and the parents reading with them">
                Ages 0—10
              </Meta>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CAPABILITY STRIP — what I delivered ============ */}
      <section className="case-section" style={{ background: 'var(--paper-warm)' }}>
        <div style={{ marginBottom: 50, maxWidth: 900 }}>
          <p className="head-label">
            <span className="head-label__num">03</span> · The Universe
          </p>
          <h2 className="head-title">
            En lik. <em>Sedem produktov.</em>
          </h2>
          <p className="lede">
            Eno znamko sem razvila v <em>fizično in digitalno družino</em> —
            vse so povezane, vse govorijo isti jezik, vse je nastalo pod mojo
            režijo.
          </p>
        </div>

        <div className="grid-4">
          <Cap label="Print" title="Knjige" desc="Trdovezana izdaja, 25×25, slovenski tisk." img="/work/molly-lolly/books_collection.png" imgBg="#ffffff" imgFit="contain" />
          <Cap label="Activity" title="Zvezki" desc="Riši in Reši — 80 nalepk, naloge, barvanke." img="/work/molly-lolly/workbook.jpg" />
          <Cap label="Plush + textile" title="Igrača" desc="Plišasta opica in širša tekstilna kolekcija (oblačila, kape, copati)." img="/work/molly-lolly/plush_room.jpg" />
          <Cap label="Digital" title="Aplikacije" desc="AR, 3D, memory game, pobarvanke." img="/work/molly-lolly/ar_app.jpg" />
        </div>
      </section>

      {/* ============ BOOKS ============ */}
      <section className="case-section">
        <div style={{ maxWidth: 900 }}>
          <p
            className="head-label"
            style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--accent)' }}
          >
            Chapter I — Print
          </p>
          <h2 className="head-title">
            Dve <em>zgodbi.</em> Ena mala opica.
          </h2>
          <p className="lede">
            Vsaka knjigica je <em>simpatična pripoved s srečnim koncem</em> in
            nevidno pedagoško vrednostjo. Hardcover 25×25 cm, tiskano v Sloveniji.
          </p>
        </div>

        <div className="grid-2" style={{ marginTop: 48 }}>
          <div className="tile tile--wide" style={{ aspectRatio: '3/4' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/work/molly-lolly/child_reading_1.jpg" alt="Child reading" />
          </div>
          <div className="tile tile--wide" style={{ aspectRatio: '3/4' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/work/molly-lolly/child_reading_2.jpg" alt="Child reading" />
          </div>
        </div>
      </section>

      {/* ============ PLUSH ============ */}
      <section
        className="case-section"
        style={{ background: 'var(--ink, #111)', color: 'var(--paper, #F5F2EA)' }}
      >
        <div style={{ maxWidth: 900 }}>
          <p
            className="head-label"
            style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: '#ECE6D5' }}
          >
            Chapter II — Plush
          </p>
          <h2 className="head-title" style={{ color: 'var(--paper, #F5F2EA)' }}>
            Iz strani v <em>objem.</em>
          </h2>
          <p className="lede" style={{ color: 'rgba(245,242,234,0.7)' }}>
            Plišasta Molly Lolly — minimalistična, mehka, slovenska izdelava.
            Poleg igrače je nastala tudi <em>tekstilna kolekcija</em> z oblačili,
            kapami in copati za otroke.
          </p>
        </div>
        <div className="tile tile--wide" style={{ marginTop: 48, aspectRatio: '16/8' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/work/molly-lolly/plush.jpg" alt="Plush Molly Lolly" />
        </div>
      </section>

      {/* ============ DIGITAL PRODUCTS — multi ============ */}
      <section className="case-section" style={{ background: '#fff6e8' }}>
        <div style={{ maxWidth: 900 }}>
          <p
            className="head-label"
            style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--accent)' }}
          >
            Chapter III — Digital
          </p>
          <h2 className="head-title">
            Knjiga, ki <em>oživi</em> v rokah otroka.
          </h2>
          <p className="lede">
            Digitalni svet Molly Lolly ni le ena aplikacija. To je <em>več
            povezanih produktov</em>, ki sem jih zasnovala in režirala — koda jih
            je izvedla ekipa, ki sem jih vodila.
          </p>
        </div>

        {/* Mud Monster digital book — wide shot, constrained so it shows
            both tablets fully without cropping */}
        <div
          style={{
            marginTop: 48,
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}
        >
          <div className="tile tile--wide" style={{ aspectRatio: '5/4', background: 'transparent' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/work/molly-lolly/digital_app.png"
              alt="Mud Monster digital book with games"
              style={{ objectFit: 'contain' }}
            />
            <div className="tile-cap">Digital book · puzzle &amp; games</div>
          </div>
        </div>

        {/* AR + 3D room side by side */}
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="tile tile--wide" style={{ aspectRatio: '4/3' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/work/molly-lolly/ar_app.jpg" alt="AR app showing 3D monkey on physical book" />
            <div className="tile-cap">AR — main app</div>
          </div>
          <div className="tile tile--wide" style={{ aspectRatio: '4/3' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/work/molly-lolly/room_3d.jpg" alt="3D room fallback in low light" />
            <div className="tile-cap">3D soba — low-light fallback</div>
          </div>
        </div>

        {/* ProductRows — list of 4 digital products */}
        <div className="two-col" style={{ marginTop: 48 }}>
          <div>
            <p className="head-label" style={{ margin: 0 }}>
              <span className="head-label__num">04a</span> · Four digital products
            </p>
          </div>
          <div>
            <ProductRow
              num="01"
              title={<>AR <em>aplikacija</em></>}
              desc="Glavni produkt: prepoznava strani knjige in nanjo doda animirane like, glas in interakcijo."
            />
            <ProductRow
              num="02"
              title={<>3D <em>soba</em></>}
              desc="Ko ni dovolj svetlobe za AR, app preklopi v 3D sobo — otrok še vedno sprehaja lik in obišče knjigo, ki odpre digitalno različico."
            />
            <ProductRow
              num="03"
              title={<>Memory <em>game</em></>}
              desc="Igra spomina z liki iz knjig — utrjuje vsebino skozi igro."
            />
            <ProductRow
              num="04"
              title={<>Digitalne <em>pobarvanke</em></>}
              desc="Strani iz aktivnih zvezkov, prenešene v dotik na zaslonu."
              last
            />
          </div>
        </div>
      </section>

      {/* ============ WEB SHOP ============ */}
      <section className="case-section">
        <div style={{ maxWidth: 900 }}>
          <p
            className="head-label"
            style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--accent)' }}
          >
            Chapter IV — Commerce
          </p>
          <h2 className="head-title">
            Trgovina, kjer <em>se vse združi.</em>
          </h2>
          <p className="lede">
            E-commerce z igrivim dizajnom — knjige, plišasta opica, paketi.
            Vsi liki, vse barve, ena znamka.
          </p>
        </div>
        <div
          style={{
            marginTop: 48,
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}
        >
          <div className="tile tile--wide" style={{ aspectRatio: '16/9', background: 'transparent' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/work/molly-lolly/molly_lolly_store.png"
              alt="Molly Lolly web shop — homepage + product page"
              style={{ objectFit: 'contain' }}
            />
            <div className="tile-cap">Homepage + product page</div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="stats">
        <div>
          <div className="stats__num">7</div>
          <div className="stats__label">Products</div>
          <div className="stats__desc">2 knjigi, 2 zvezka, plišasta, AR app, 3D, igre.</div>
        </div>
        <div>
          <div className="stats__num">4</div>
          <div className="stats__label">Disciplines</div>
          <div className="stats__desc">Brand, ilustracija, produkt, digital.</div>
        </div>
        <div>
          <div className="stats__num">1</div>
          <div className="stats__label">Vision</div>
          <div className="stats__desc">Vse iz ene roke, vodila sem vse ekipe.</div>
        </div>
        <div>
          <div className="stats__num">∞</div>
          <div className="stats__label">Univerzum</div>
          <div className="stats__desc">Brand, ki se širi z vsako novo zgodbo.</div>
        </div>
      </section>

      <NextCase href={`/${locale}/work/petrol-pay`} title="Petrol Pay<em>.</em>" />
    </CaseShell>
  );
}

// ---------- helpers ----------

function Meta({
  label,
  sub,
  children
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 8,
          fontWeight: 500
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          lineHeight: 1.4,
          color: 'var(--ink)',
          fontWeight: 500
        }}
      >
        {children}
        {sub && (
          <em
            style={{
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--muted)',
              display: 'block',
              marginTop: 4,
              fontWeight: 400
            }}
          >
            {sub}
          </em>
        )}
      </div>
    </div>
  );
}

function Cap({
  label,
  title,
  desc,
  img,
  imgBg,
  imgFit = 'cover'
}: {
  label: string;
  title: string;
  desc: string;
  img?: string;
  imgBg?: string;
  imgFit?: 'cover' | 'contain';
}) {
  return (
    <div
      style={{
        background: 'var(--paper)',
        borderRadius: 4,
        border: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {img && (
        <div
          style={{
            aspectRatio: '4/3',
            background: imgBg ?? 'var(--paper-warm)',
            overflow: 'hidden'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: imgFit,
              objectPosition: 'center',
              display: 'block'
            }}
          />
        </div>
      )}
      <div
        style={{
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          flex: 1
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontWeight: 600
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: '-0.02em'
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--ink-soft)',
            lineHeight: 1.5,
            marginTop: 'auto'
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

function ProductRow({
  num,
  title,
  desc,
  last
}: {
  num: string;
  title: React.ReactNode;
  desc: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr',
        gap: 24,
        padding: '22px 0',
        borderBottom: last ? 'none' : '1px solid var(--line)'
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--accent)',
          fontWeight: 500,
          lineHeight: 1.1
        }}
      >
        {num}
      </div>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.3rem, 2vw, 1.6rem)',
            lineHeight: 1.15,
            fontWeight: 500,
            color: 'var(--ink)'
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 15,
            color: 'var(--ink-soft)',
            lineHeight: 1.55,
            maxWidth: 460
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}
