'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import BackButton from '@/components/BackButton';
import BlurText from '@/components/BlurText';
import { gsap } from '@/lib/gsap';

// `src` is the lightbox hero image; `images` (optional) is a rotation
// shown inside the card itself. When `images` has more than one entry the
// card crossfades through them every few seconds.
type GalleryItem = {
  key: string;
  src: string;
  images?: readonly string[];
  // When a project folder ships a video (mp4/webm), prefer it inside the
  // card — it plays muted/looped and replaces the image slideshow.
  video?: string;
};

const MW = '/more_work';

const GALLERY_ITEMS: readonly GalleryItem[] = [
  // ───────── FRESH / strongest pieces (per Tina) ─────────
  {
    key: 'isla',
    src: `${MW}/Isla/Isla_oglas.jpg`,
    images: [
      `${MW}/Isla/Isla_oglas.jpg`,
      `${MW}/Isla/Isla_oglas_miski_2.jpg`,
      `${MW}/Isla/oglasa_isla_2-1-scaled.jpg`,
    ],
  },
  {
    // Hybrid: video plays once, then stills cycle, then video again
    key: 'pupaGlam',
    src: `${MW}/Pupa_glam/branding.jpg`,
    video: `${MW}/Pupa_glam/pupa_glam_web.mp4`,
    images: [
      `${MW}/Pupa_glam/branding.jpg`,
      `${MW}/Pupa_glam/pupa_t-sirt.jpg`,
      `${MW}/Pupa_glam/973d28_0293db469d4a4fc399728754776b969e~mv2.jpg`,
    ],
  },
  {
    key: 'ribbonLips',
    src: `${MW}/RibbonLips/1920x1080_header_ribbon_lips.jpg`,
    video: `${MW}/RibbonLips/Screen Recording 2026-06-07 at 21.49.31_web.mp4`,
    images: [
      `${MW}/RibbonLips/1920x1080_header_ribbon_lips.jpg`,
      `${MW}/RibbonLips/RibbonLips_embalaža.jpg`,
      `${MW}/RibbonLips/Ribbonlips_kolekcija_2021-scaled.jpg`,
    ],
  },
  {
    key: 'universum',
    src: `${MW}/Universum/Universum_web.jpg`,
    video: `${MW}/Universum/universum_web.mp4`,
    images: [
      `${MW}/Universum/Universum_web.jpg`,
    ],
  },
  {
    key: 'wishCard',
    src: `${MW}/wish_card/wish_card.jpg`,
    images: [
      `${MW}/wish_card/wish_card.jpg`,
      `${MW}/wish_card/wish_card_web.png`,
      `${MW}/wish_card/BB_wish_2.jpg`,
      `${MW}/wish_card/Comic_illustration.jpg`,
    ],
  },
  {
    key: 'mbills',
    src: `${MW}/mBills/mBills_Mastercard.jpg`,
    video: `${MW}/mBills/mBills_web_min.mp4`,
    images: [
      `${MW}/mBills/mBills_Mastercard.jpg`,
      `${MW}/mBills/Mastercard_mBills.png`,
      `${MW}/mBills/mBills_portal.png`,
    ],
  },
  {
    key: 'digitrajni',
    src: `${MW}/Digitrajni/oglas_digitrajni_1-06.png`,
    images: [
      `${MW}/Digitrajni/oglas_digitrajni_1-06.png`,
      `${MW}/Digitrajni/digitranj-scaled.jpg`,
      `${MW}/Digitrajni/digitrajni_logo-scaled.jpg`,
    ],
  },
  {
    key: 'izziRokus',
    src: `${MW}/Izzikonferenca/izzi_rokus_konferenca-scaled.jpg`,
    video: `${MW}/Izzikonferenca/konferenca-izzirokus_web.mp4`,
    images: [
      `${MW}/Izzikonferenca/izzi_rokus_konferenca-scaled.jpg`,
    ],
  },
  {
    key: 'combisafe',
    src: `${MW}/combisafe/combisafe_web.mp4`,
    video: `${MW}/combisafe/combisafe_web.mp4`,
  },
  {
    key: 'inovis',
    src: `${MW}/Inovis/inovis_web-scaled.jpg`,
    video: `${MW}/Inovis/Inovis_web.mp4`,
    images: [
      `${MW}/Inovis/inovis_web-scaled.jpg`,
      `${MW}/Inovis/kombi-scaled.jpg`,
    ],
  },
  {
    key: 'spaycy',
    src: `${MW}/Spaycy/spaycy_logo-scaled.jpg`,
    images: [
      `${MW}/Spaycy/spaycy_logo-scaled.jpg`,
      `${MW}/Spaycy/spacy_graphic.png`,
    ],
  },
  {
    key: 'sag',
    src: `${MW}/SAG/SAG-1.png`,
  },
  // ───────── decent middle tier ─────────
  {
    key: 'chewieGreen',
    src: `${MW}/EFSA/zelenu_cuvaj.png`,
    video: `${MW}/EFSA/freepik__a-whimsical-character-made-entirely-of-greenery-an__35564.mp4`,
    images: [
      `${MW}/EFSA/zelenu_cuvaj.png`,
      `${MW}/EFSA/chewie_green_insta.png`,
    ],
  },
  {
    key: 'vseStoritve',
    src: `${MW}/Vsestoritve/Vsestoritve.jpg`,
    images: [
      `${MW}/Vsestoritve/Vsestoritve.jpg`,
      `${MW}/Vsestoritve/Vsestoritve_web.png`,
      `${MW}/Vsestoritve/vsestoritve_stojnica.jpg`,
      `${MW}/Vsestoritve/3bae1668-0756-443d-bf72-cc547a154bf9_2017-01-26-16-47-52_hSHAW6.jpg`,
      `${MW}/Vsestoritve/3bae1668-0756-443d-bf72-cc547a154bf9_2018-03-27-21-34-39_IiJ0bt.jpg`,
    ],
  },
  // ───────── portrait ads row ─────────
  {
    key: 'petrolOglasi',
    src: `${MW}/Petrol_adds/oglas_petrol.jpg`,
    video: `${MW}/Petrol_adds/petrol_ad_web.mp4`,
    images: [
      `${MW}/Petrol_adds/oglas_petrol.jpg`,
      `${MW}/Petrol_adds/1024x768_Baner_Petrol_klub_ugodnosti.jpg`,
      `${MW}/Petrol_adds/oglas_sendvic.jpg`,
    ],
  },
  {
    key: 'mbillsMini',
    src: `${MW}/Mbills_adds/70x100_mBills_MINI.png`,
    images: [
      `${MW}/Mbills_adds/70x100_mBills_MINI.png`,
      `${MW}/Mbills_adds/70x100_mBills.png`,
      `${MW}/Mbills_adds/70x100_Tapandpay_1a.jpg`,
    ],
  },
  {
    key: 'karieraKnjiga',
    src: `${MW}/Kariera/Knjiga-kariera.jpg`,
    images: [
      `${MW}/Kariera/Knjiga-kariera.jpg`,
    ],
  },
  // ───────── older items ─────────
  {
    key: 'maxMorrison',
    src: `${MW}/Max_Morrison/Max_Morrison_app.png`,
    video: `${MW}/Max_Morrison/max_morrison_web.mp4`,
  },
  {
    key: 'memGame',
    src: `${MW}/Mem_game/memgame-scaled.jpg`,
    images: [
      `${MW}/Mem_game/memgame-scaled.jpg`,
      `${MW}/Mem_game/net_str_memgame_6.jpg`,
    ],
  },
  {
    key: 'appleWatch',
    src: `${MW}/Apple_watch/apple_watch.png`,
    images: [
      `${MW}/Apple_watch/apple_watch.png`,
      `${MW}/Apple_watch/mBills.png`,
      `${MW}/Apple_watch/IMG_0009.jpg`,
    ],
  },
  {
    key: 'logos',
    src: `${MW}/Logos/potocnik_logo_3-scaled.jpg`,
    images: [
      `${MW}/Logos/potocnik_logo_3-scaled.jpg`,
      `${MW}/Logos/Simel-scaled.jpg`,
      `${MW}/Logos/medi_pedi-scaled.jpg`,
      `${MW}/Logos/ghost_card-scaled.jpg`,
      `${MW}/Logos/ghost_card_2-scaled.jpg`,
      `${MW}/Logos/computer_plan.png`,
      `${MW}/Logos/rekruter.svg`,
      `${MW}/vse_vec_je_dobrih_gostiln/Vse_vec_je_dobrih_gostiln-scaled.jpg`,
    ],
  },
  {
    key: 'familyFun',
    src: `${MW}/Family_fun/family_fun_logo-scaled.jpg`,
    images: [
      `${MW}/Family_fun/family_fun_logo-scaled.jpg`,
      `${MW}/Family_fun/Sequence-01_8-2-1.gif`,
    ],
  },
  {
    key: 'kraljZara',
    src: `${MW}/Kralj_žara/Kralj-žara-knjiga.jpg`,
    images: [
      `${MW}/Kralj_žara/Kralj-žara-knjiga.jpg`,
      `${MW}/Kralj_žara/pinart-graficno-oblikovanje-in-marketing-doo_2015-11-17-18-11-38_ti11.jpg`,
    ],
  },
  { key: 'blendedLearnings', src: `${MW}/Blended_learnings/Blended_learnings.png` },
  // ───────── oldest / least relevant — at the very end ─────────
  {
    key: 'mdRevija',
    src: `${MW}/Moje_delo_tiskovine/MD_karierna_revija.jpg`,
    images: [
      `${MW}/Moje_delo_tiskovine/MD_karierna_revija.jpg`,
      `${MW}/Moje_delo_tiskovine/Kariera.jpg`,
      `${MW}/Moje_delo_tiskovine/student_knjiga.jpg`,
    ],
  },
  { key: 'rokusKlett', src: `${MW}/Rokus_Klett/Rokus_Klett.png` },
  { key: 'portalZnanja', src: `${MW}/Portal_znanja/Portal_znanja.png` },
  { key: 'cankarjevDom', src: `${MW}/Cankarjev_dom/cankarjev_dom_kartice.png` },
];

export default function MoreWorkGallery() {
  const t = useTranslations('moreWork');
  const locale = useLocale();
  const [active, setActive] = useState<GalleryItem | null>(null);
  const [lbIdx, setLbIdx] = useState(0);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!active) return;
    const imgs = active.images && active.images.length > 0 ? active.images : [active.src];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActive(null); return; }
      if (e.key === 'ArrowRight') setLbIdx(i => (i + 1) % imgs.length);
      if (e.key === 'ArrowLeft') setLbIdx(i => (i - 1 + imgs.length) % imgs.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      cardRefs.current.forEach((card, index) => {
        if (!card) return;

        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 110 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1.05,
            ease: 'power3.out',
            // tiny per-card delay so a row of cards rises with a soft cascade
            // instead of all snapping in together
            delay: (index % 2) * 0.12,
            scrollTrigger: {
              trigger: card,
              start: 'top 92%',
              once: true,
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="more-work-page">
      <section className="more-work-top">
        <div>
          <BackButton
            fallbackHref={`/${locale}/#work`}
            className="more-work-back"
          >
            ← {t('back')}
          </BackButton>
          <p className="kicker">{t('kicker')}</p>
          <BlurText
            tag="h1"
            className="more-work-heading"
            text={t('heading')}
            animateBy="words"
            direction="bottom"
            delay={120}
            stepDuration={0.45}
          />
        </div>
        <div className="more-work-intro">
          <p>{t('intro')}</p>
        </div>
      </section>

      <section className="more-work-grid" aria-label={t('kicker')}>
        {GALLERY_ITEMS.map((item, index) => (
          <button
            type="button"
            key={item.key}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            className="more-work-card"
            onClick={() => { setActive(item); setLbIdx(0); }}
            aria-label={`${t('open')}: ${t(`items.${item.key}.title`)}`}
          >
            <CardMedia item={item} />
            <span className="more-work-card__caption">
              <small>{String(index + 1).padStart(2, '0')}</small>
              <strong>{t(`items.${item.key}.title`)}</strong>
              <em>{t(`items.${item.key}.meta`)}</em>
            </span>
          </button>
        ))}
      </section>

      {active && (() => {
        const lbImgs = active.images && active.images.length > 0 ? active.images : [active.src];
        const hasMany = lbImgs.length > 1;
        return (
          <div
            className="more-work-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={t(`items.${active.key}.title`)}
            onClick={() => setActive(null)}
          >
            <button
              type="button"
              className="more-work-lightbox__close"
              onClick={() => setActive(null)}
            >
              {t('close')}
            </button>
            <div className="more-work-lightbox__inner" onClick={(e) => e.stopPropagation()}>
              <div className="more-work-lightbox__img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lbImgs[lbIdx]} alt={t(`items.${active.key}.title`)} />
                {hasMany && (
                  <>
                    <button
                      type="button"
                      className="more-work-lightbox__arrow more-work-lightbox__arrow--prev"
                      onClick={() => setLbIdx(i => (i - 1 + lbImgs.length) % lbImgs.length)}
                      aria-label="Prejšnja slika"
                    >‹</button>
                    <button
                      type="button"
                      className="more-work-lightbox__arrow more-work-lightbox__arrow--next"
                      onClick={() => setLbIdx(i => (i + 1) % lbImgs.length)}
                      aria-label="Naslednja slika"
                    >›</button>
                    <span className="more-work-lightbox__counter">
                      {lbIdx + 1} / {lbImgs.length}
                    </span>
                  </>
                )}
              </div>
              <div className="more-work-lightbox__caption">
                <p className="kicker">{t(`items.${active.key}.meta`)}</p>
                <div>
                  <h2>{t(`items.${active.key}.title`)}</h2>
                  <p>{t(`items.${active.key}.desc`)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}


// ---------- card media (slideshow for items with multiple images) ----------

function CardMedia({ item }: { item: GalleryItem }) {
  const images = item.images && item.images.length > 0 ? item.images : [item.src];
  const hasVideo = !!item.video;
  const hasMultipleImages = images.length > 1 || (hasVideo && images.length >= 1);

  // mode: 'video' or 'images' — start with video if one exists, otherwise images
  const [mode, setMode] = useState<'video' | 'images'>(hasVideo ? 'video' : 'images');
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  // nextSlide: index of the image currently fading IN (outgoing stays visible)
  const [nextSlide, setNextSlide] = useState<number | null>(null);

  const switchMode = (nextMode: 'video' | 'images', nextActiveIdx = 0) => {
    setFading(true);
    setTimeout(() => {
      // First: switch mode (new content renders at opacity 0 because fading=true)
      setMode(nextMode);
      setActive(nextActiveIdx);
      setNextSlide(null);
      // Then on the next paint: clear fading so new content fades in smoothly
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFading(false));
      });
    }, 400);
  };

  // Ref so the interval always reads the latest active index without needing
  // it as a dependency (which would restart the interval on every slide change)
  const activeRef = useRef(active);
  activeRef.current = active;

  // Image cycling — only runs while in 'images' mode and there are multiple
  useEffect(() => {
    if (mode !== 'images') return;
    if (images.length < 2 && !hasVideo) return;

    const id = window.setInterval(() => {
      const cur = activeRef.current;
      const next = cur + 1;
      if (next >= images.length) {
        if (hasVideo) { switchMode('video', 0); return; }
        // wrap around: crossfade to first image
        setNextSlide(0);
        setTimeout(() => { setActive(0); setNextSlide(null); }, 400);
        return;
      }
      // crossfade to next image: incoming fades in, outgoing stays visible
      setNextSlide(next);
      setTimeout(() => { setActive(next); setNextSlide(null); }, 400);
    }, 3500);
    return () => window.clearInterval(id);
  }, [mode, images.length, hasVideo]);

  // Safety net: if onEnded doesn't fire (autoplay blocked, codec hiccup,
  // browser quirk) the card would freeze on the poster forever. Hard-cap
  // the video stage at 8s and force a hand-off to the image cycle.
  useEffect(() => {
    if (mode !== 'video') return;
    if (!item.images || item.images.length === 0) return;
    const t = window.setTimeout(() => {
      switchMode('images', 0);
    }, 8000);
    return () => window.clearTimeout(t);
  }, [mode, item.images]);

  // After ending: if there are also images, hand off to image cycle; otherwise
  // just loop the video.
  const handleVideoEnded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (item.images && item.images.length > 0) {
      switchMode('images', 0);
    } else {
      // No images — restart the video manually so it keeps looping
      const v = e.currentTarget;
      v.currentTime = 0;
      void v.play();
    }
  };

  if (mode === 'video' && item.video) {
    return (
      <video
        // key forces React to remount on every re-entry so autoplay fires
        key={`video-${item.key}`}
        className={`more-work-card__slide${fading ? ' fading' : ''}`}
        src={item.video}
        poster={item.src}
        autoPlay
        muted
        playsInline
        preload="metadata"
        onEnded={handleVideoEnded}
      />
    );
  }

  if (images.length === 1 && !hasVideo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={images[0]} alt="" loading="lazy" />;
  }

  return (
    <>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className="more-work-card__slide"
          style={{
            opacity: fading ? 0 : (i === active || i === nextSlide ? 1 : 0),
            transition: 'opacity 400ms ease-in-out',
          }}
        />
      ))}
    </>
  );
}
