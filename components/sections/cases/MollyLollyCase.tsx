'use client';

import { useTranslations } from 'next-intl';
import CaseShell, { NextCase } from './CaseShell';
import BlurText from '@/components/BlurText';

const rich = {
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
  strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  br: () => <br />
};

export default function MollyLollyCase({ locale }: { locale: string }) {
  const t = useTranslations('cases.mollyLolly');
  return (
    <CaseShell>
      {/* ============ HERO ============ */}
      <section className="case-hero">
        <div>
          <p className="eyebrow">{t('heroEyebrow')}</p>
          <BlurText
            tag="h1"
            className="case-title"
            text={t('heroTitle')}
            animateBy="words"
            direction="bottom"
            delay={120}
            stepDuration={0.45}
          />
        </div>

        <div className="case-hero__bottom">
          <p className="case-lede">{t.rich('heroLede', rich)}</p>
          <div className="case-meta-inline">
            <div>
              {t('metaRoleLabel')} <span>{t('metaRoleValue')}</span>
            </div>
            <div>
              {t('metaOutputLabel')} <span>{t('metaOutputValue')}</span>
            </div>
            <div>
              {t('metaAudienceLabel')} <span>{t('metaAudienceValue')}</span>
            </div>
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
              <span className="head-label__num">02</span> · {t('introLabel')}
            </p>
            <h2 className="head-title">{t.rich('introTitle', rich)}</h2>
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
              <p style={{ margin: 0 }}>{t.rich('introBody1', rich)}</p>
              <p style={{ marginTop: 20 }}>{t.rich('introBody2', rich)}</p>
              <p style={{ marginTop: 20 }}>{t.rich('introBody3', rich)}</p>
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
              <Meta label={t('metaMyRoleLabel')}>
                {t.rich('metaMyRoleBody', rich)}
              </Meta>
              <Meta label={t('metaExternalTeamsLabel')} sub={t('metaExternalTeamsSub')}>
                {t.rich('metaExternalTeamsBody', rich)}
              </Meta>
              <Meta label={t('metaTypeLabel')} sub={t('metaTypeSub')}>
                {t('metaTypeBody')}
              </Meta>
              <Meta label={t('metaAudienceLabel')} sub={t('metaAudienceSub')}>
                {t('metaAudienceBody')}
              </Meta>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CAPABILITY STRIP — what I delivered ============ */}
      <section className="case-section" style={{ background: 'var(--paper-warm)' }}>
        <div style={{ marginBottom: 50, maxWidth: 900 }}>
          <p className="head-label">
            <span className="head-label__num">03</span> · {t('universeLabel')}
          </p>
          <h2 className="head-title">{t.rich('universeTitle', rich)}</h2>
          <p className="lede">{t.rich('universeLede', rich)}</p>
        </div>

        <div className="grid-4">
          <Cap label={t('capPrintLabel')} title={t('capPrintTitle')} desc={t('capPrintDesc')} img="/work/molly-lolly/Molly_Lolly_knjigice.png" imgBg="#ffffff" imgFit="contain" />
          <Cap label={t('capActivityLabel')} title={t('capActivityTitle')} desc={t('capActivityDesc')} img="/work/molly-lolly/workbook.jpg" />
          <Cap label={t('capPlushLabel')} title={t('capPlushTitle')} desc={t('capPlushDesc')} img="/work/molly-lolly/plush_room.jpg" />
          <Cap label={t('capDigitalLabel')} title={t('capDigitalTitle')} desc={t('capDigitalDesc')} img="/work/molly-lolly/ar_app.png" />
        </div>
      </section>

      {/* ============ BOOKS ============ */}
      <section className="case-section">
        <div style={{ maxWidth: 900 }}>
          <p className="head-label">
            <span className="head-label__num">04</span> · {t('booksLabel')}
          </p>
          <h2 className="head-title">{t.rich('booksTitle', rich)}</h2>
          <p className="lede">{t.rich('booksLede', rich)}</p>
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
          <p className="head-label" style={{ color: 'rgba(245,242,234,0.55)' }}>
            <span className="head-label__num" style={{ color: 'rgba(245,242,234,0.85)' }}>05</span> · {t('plushLabel')}
          </p>
          <h2 className="head-title" style={{ color: 'var(--paper, #F5F2EA)' }}>
            {t.rich('plushTitle', rich)}
          </h2>
          <p className="lede" style={{ color: 'rgba(245,242,234,0.7)' }}>
            {t.rich('plushLede', rich)}
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
          <p className="head-label">
            <span className="head-label__num">06</span> · {t('digitalLabel')}
          </p>
          <h2 className="head-title">{t.rich('digitalTitle', rich)}</h2>
          <p className="lede">{t.rich('digitalLede', rich)}</p>
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
            <div className="tile-cap">{t('digitalBookCap')}</div>
          </div>
        </div>

        {/* AR + 3D room side by side */}
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="tile tile--wide" style={{ aspectRatio: '4/3' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/work/molly-lolly/ar_app.png" alt="AR app showing 3D monkey on physical book" />
            <div className="tile-cap">{t('digitalArCap')}</div>
          </div>
          <div className="tile tile--wide" style={{ aspectRatio: '4/3' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/work/molly-lolly/room_3d.png" alt="3D room fallback in low light" />
            <div className="tile-cap">{t('digital3dCap')}</div>
          </div>
        </div>

        {/* ProductRows — list of 4 digital products */}
        <div className="two-col" style={{ marginTop: 48 }}>
          <div>
            <p className="head-label" style={{ margin: 0 }}>
              <span className="head-label__num">06a</span> · {t('productsSidelabel')}
            </p>
          </div>
          <div>
            <ProductRow
              num="01"
              title={t.rich('product1Title', rich)}
              desc={t('product1Desc')}
            />
            <ProductRow
              num="02"
              title={t.rich('product2Title', rich)}
              desc={t('product2Desc')}
            />
            <ProductRow
              num="03"
              title={t.rich('product3Title', rich)}
              desc={t('product3Desc')}
            />
            <ProductRow
              num="04"
              title={t.rich('product4Title', rich)}
              desc={t('product4Desc')}
              last
            />
          </div>
        </div>
      </section>

      {/* ============ WEB SHOP ============ */}
      <section className="case-section">
        <div style={{ maxWidth: 900 }}>
          <p className="head-label">
            <span className="head-label__num">07</span> · {t('commerceLabel')}
          </p>
          <h2 className="head-title">{t.rich('commerceTitle', rich)}</h2>
          <p className="lede">{t('commerceLede')}</p>
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
            <div className="tile-cap">{t('commerceCap')}</div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="stats">
        <div>
          <div className="stats__num">7</div>
          <div className="stats__label">{t('statProductsLabel')}</div>
          <div className="stats__desc">{t('statProductsDesc')}</div>
        </div>
        <div>
          <div className="stats__num">4</div>
          <div className="stats__label">{t('statDisciplinesLabel')}</div>
          <div className="stats__desc">{t('statDisciplinesDesc')}</div>
        </div>
        <div>
          <div className="stats__num">1</div>
          <div className="stats__label">{t('statVisionLabel')}</div>
          <div className="stats__desc">{t('statVisionDesc')}</div>
        </div>
        <div>
          <div className="stats__num">∞</div>
          <div className="stats__label">{t('statUniverseLabel')}</div>
          <div className="stats__desc">{t('statUniverseDesc')}</div>
        </div>
      </section>

      <NextCase href={`/${locale}/work/petrol-pay`} title={t.raw('nextCaseTitle')} />
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
              fontSize: 15,
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
            fontSize: 17,
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
