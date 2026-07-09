'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const labelStyle = { display: 'grid', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 600 } as const;
const inputStyle = { width: '100%', padding: '0.8rem 0', border: 0, borderBottom: '1px solid rgba(17,17,17,0.28)', borderRadius: 0, outline: 'none', background: 'transparent', color: 'var(--ink)', font: 'inherit' } as const;

export default function FloatingUI() {
  const pathname = usePathname();
  const [arrowVisible, setArrowVisible] = useState(false);
  const [pastHero,     setPastHero]     = useState(false);
  const [isDark,       setIsDark]       = useState(false);
  const [talkOpen,     setTalkOpen]     = useState(false);
  const [inquiryType,  setInquiryType]  = useState('');
  const [submitState,  setSubmitState]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const isSl = pathname.startsWith('/sl');
  /* Na kalkulatorju "Let's talk" ne sme prodajati storitev (Tina: "se ne gre
     vec o mojih storitvah") — tu gre za orodje samo, zato zbiramo povratne
     informacije in predloge, ne povprasevanj za projekte. */
  const isKalkulator = pathname.includes('/kalkulator/orodje');

  const kalkulatorCopy = {
    eyebrow: 'Povratna informacija',
    title: 'Kaj bi izboljšali?',
    body: 'Deli predlog, opozori na napako ali samo povej, kako ti kalkulator služi. Berem osebno.',
    options: [
      ['Predlog za izboljšavo', 'kaj bi dodala, spremenila ali poenostavila'],
      ['Nekaj ne deluje', 'napaka, nejasnost ali cena, ki ne štima'],
      ['Splošno mnenje', 'kaj ti je všeč, kaj ne'],
    ],
    email: 'Piši mi neposredno',
    back: 'Nazaj',
    send: 'Pošlji',
    sending: 'Pošiljam ...',
    sent: 'Hvala za povratno informacijo!',
    error: 'Sporočila trenutno ni bilo mogoče poslati. Poskusi znova ali mi piši neposredno.',
    fields: { name: 'Ime', company: '', email: 'E-pošta', brief: 'Opiši predlog, napako ali mnenje', budget: '', timing: '' },
    close: 'Zapri',
  };

  const talkCopy = isKalkulator ? kalkulatorCopy : isSl ? {
    eyebrow: 'Začniva pogovor',
    title: 'Kaj ustvarjava?',
    body: 'Izberi izhodišče. Odgovorila ti bom osebno in skupaj bova določila naslednji korak.',
    options: [
      ['Nov projekt', 'branding, spletna stran ali digitalna izkušnja'],
      ['Kreativno sodelovanje', 'ideja, kampanja ali dolgoročnejše sodelovanje'],
      ['Samo vprašanje', 'kratek pogovor brez obveznosti'],
    ],
    email: 'Piši mi neposredno',
    back: 'Nazaj',
    send: 'Pošlji povpraševanje',
    sending: 'Pošiljam ...',
    sent: 'Hvala. Tvoje sporočilo je varno prispelo.',
    error: 'Sporočila trenutno ni bilo mogoče poslati. Poskusi ponovno ali mi piši neposredno.',
    fields: { name: 'Ime in priimek', company: 'Podjetje (neobvezno)', email: 'E-pošta', brief: 'Na kratko opiši projekt ali vprašanje', budget: 'Okvirni proračun', timing: 'Želeni rok' },
    close: 'Zapri pogovor',
  } : {
    eyebrow: 'Start a conversation',
    title: 'What shall we create?',
    body: 'Choose a starting point. I will reply personally and we can shape the next step together.',
    options: [
      ['New project', 'branding, website or digital experience'],
      ['Creative collaboration', 'an idea, campaign or longer partnership'],
      ['Just a question', 'a short conversation with no pressure'],
    ],
    email: 'Email me directly',
    back: 'Back',
    send: 'Send inquiry',
    sending: 'Sending ...',
    sent: 'Thank you. Your message arrived safely.',
    error: 'The message could not be sent right now. Please try again or email me directly.',
    fields: { name: 'Name', company: 'Company (optional)', email: 'Email', brief: 'Briefly describe your project or question', budget: 'Approximate budget', timing: 'Preferred timing' },
    close: 'Close conversation',
  };

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState('sending');
    const form = event.currentTarget;
    const response = await fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    }).catch(() => null);
    setSubmitState(response?.ok ? 'sent' : 'error');
    if (response?.ok) form.reset();
  };

  useEffect(() => {
    // show arrow once hero animation finishes (~13 s)
    const t = setTimeout(() => setArrowVisible(true), 13500);

    const checkDark = () => {
      /* Barva se odloca po tem, kaj lezi POD samim gumbom (spodnji desni rob),
         ne po tem, kaj je kjerkoli v viewportu — zrcalno Nav.tsx, ki gleda
         vrstico menija. Prej je gumb ostal bel se cel viewport za herojem,
         ceprav je bil pod njim ze svetel Services. */
      const labelY = window.innerHeight - 110; // sredina "Let's talk" stolpca

      const hero = document.getElementById('hero');
      const heroRect = hero?.getBoundingClientRect();

      // The hero controls its own light/dark state through the pinart-dark
      // event — but only while it actually sits under the label.
      if (heroRect && heroRect.top < labelY && heroRect.bottom > labelY) return;

      const darkSections = document.querySelectorAll('[data-nav-dark]');
      const onDark = Array.from(darkSections).some(el => {
        if ((el as HTMLElement).dataset.navLightUi === 'true') return false;
        const rect = el.getBoundingClientRect();
        const op = parseFloat((el as HTMLElement).style.opacity ?? '1');
        const visible = isNaN(op) || op > 0.08;
        return visible && rect.top < labelY && rect.bottom > labelY;
      });
      setIsDark(onDark);
    };

    const onScroll = () => {
      setPastHero(window.scrollY > window.innerHeight * 0.45);
      checkDark();
    };

    // hero fires this when ink finale covers the screen
    const onPinartDark = (e: Event) => {
      setIsDark((e as CustomEvent<{ dark: boolean }>).detail.dark);
      requestAnimationFrame(checkDark);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', checkDark, { passive: true });
    window.addEventListener('hashchange', checkDark);
    window.addEventListener('pinart-dark', onPinartDark);
    checkDark();
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', checkDark);
      window.removeEventListener('hashchange', checkDark);
      window.removeEventListener('pinart-dark', onPinartDark);
    };
  }, []);

  useEffect(() => {
    if (!talkOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTalkOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [talkOpen]);

  const ink   = isDark ? '#ffffff' : 'var(--ink)';

  return (
    <>
      {/* scroll arrow removed — replaced by Lottie cue in Hero.tsx */}

      {/* ── Let's talk — bottom right ──────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setTalkOpen(true)}
        aria-label="Let's talk"
        className="edge-right-ui"
        style={{
          position:       'fixed',
          right:          'clamp(1rem, 2vw, 1.8rem)',
          bottom:         'clamp(1.2rem, 2.5vh, 2rem)',
          zIndex:         45,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            '0.55rem',
          textDecoration: 'none',
          color:          ink,
          opacity:        0.72,
          border:         0,
          background:     'transparent',
          padding:        0,
          cursor:         'pointer',
          transition:     'opacity 0.3s ease, color 0.5s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.72')}
      >
        <span
          style={{
            fontFamily:    'var(--font-sans)',
            fontSize:      '9px',
            fontWeight:    600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            writingMode:   'vertical-rl',
            transform:     'rotate(180deg)',
            color:         ink,
            transition:    'color 0.5s ease',
          }}
        >
          Let&rsquo;s talk
        </span>
        <Image
          src="/chat 1.svg"
          alt=""
          width={26}
          height={26}
          style={{ filter: isDark ? 'invert(1)' : 'none', transition: 'filter 0.5s ease' }}
        />
      </button>

      {talkOpen && (
        <div
          role="presentation"
          className="talk-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTalkOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: 'clamp(1rem,3vw,2.5rem)',
            background: 'rgba(5,4,3,0.46)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="talk-title"
            data-lenis-prevent
            className="talk-panel"
            style={{
              position: 'relative',
              width: 'min(34rem,100%)',
              maxHeight: 'calc(100vh - 2rem)',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: 'clamp(1.5rem,4vw,2.8rem)',
              paddingRight: 'clamp(1.8rem,4.5vw,3.4rem)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
              clipPath: 'polygon(0 1.4rem, 100% 0, 100% calc(100% - 1.2rem), 1.2rem 100%, 0 100%)',
            }}
          >
            <button
              type="button"
              onClick={() => setTalkOpen(false)}
              aria-label={talkCopy.close}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: '2.4rem', height: '2.4rem', border: '1px solid rgba(17,17,17,0.24)', borderRadius: '50%', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem' }}
            >
              ×
            </button>

            <p className="kicker" style={{ marginBottom: '1.2rem' }}>{talkCopy.eyebrow}</p>
            <h2 id="talk-title" className="talk-panel-title" style={{ maxWidth: '8ch', margin: '0 0 1rem', fontFamily: 'var(--font-serif)', fontSize: 'clamp(3rem,7vw,5.4rem)', fontWeight: 400, lineHeight: 0.98 }}>
              {talkCopy.title}
            </h2>
            <p style={{ maxWidth: '27rem', margin: '0 0 2rem', fontSize: '1rem', lineHeight: 1.5, opacity: 0.68 }}>{talkCopy.body}</p>

            <div style={{ display: 'grid', gap: '0.55rem' }}>
              {!inquiryType && talkCopy.options.map(([title, description]) => (
                <button
                  type="button"
                  key={title}
                  onClick={() => { setInquiryType(title); setSubmitState('idle'); }}
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center', width: '100%', padding: '1rem 0', border: 0, borderTop: '1px solid rgba(17,17,17,0.2)', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
                >
                  <span>
                    <strong style={{ display: 'block', marginBottom: '0.2rem', fontSize: '1.05rem' }}>{title}</strong>
                    <span style={{ fontSize: '0.86rem', opacity: 0.58 }}>{description}</span>
                  </span>
                  <span aria-hidden style={{ fontSize: '1.4rem' }}>↗</span>
                </button>
              ))}
            </div>

            {inquiryType && (
              <form onSubmit={submitInquiry} style={{ display: 'grid', gap: '1rem' }}>
                <input type="hidden" name="type" value={inquiryType} />
                <input type="hidden" name="locale" value={isSl ? 'sl' : 'en'} />
                <input type="hidden" name="source" value={isKalkulator ? 'kalkulator-feedback' : 'website'} />
                <input name="website" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: 'absolute', left: '-10000px' }} />
                <button type="button" onClick={() => { setInquiryType(''); setSubmitState('idle'); }} style={{ width: 'fit-content', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit', textDecoration: 'underline', textUnderlineOffset: '0.3rem' }}>← {talkCopy.back}</button>
                <strong style={{ fontSize: '1.15rem' }}>{inquiryType}</strong>
                <label style={labelStyle}>{talkCopy.fields.name}<input required name="name" style={inputStyle} /></label>
                {!isKalkulator && (
                  <label style={labelStyle}>{talkCopy.fields.company}<input name="company" style={inputStyle} /></label>
                )}
                <label style={labelStyle}>{talkCopy.fields.email}<input required type="email" name="email" style={inputStyle} /></label>
                <label style={labelStyle}>{talkCopy.fields.brief}<textarea required name="brief" rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></label>
                {!isKalkulator && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={labelStyle}>{talkCopy.fields.budget}<input name="budget" style={inputStyle} /></label>
                    <label style={labelStyle}>{talkCopy.fields.timing}<input name="timing" style={inputStyle} /></label>
                  </div>
                )}
                <button disabled={submitState === 'sending'} type="submit" style={{ padding: '1rem 1.2rem', border: 0, background: 'var(--ink)', color: 'var(--paper)', cursor: 'pointer', font: 'inherit', fontWeight: 600 }}>
                  {submitState === 'sending' ? talkCopy.sending : talkCopy.send}
                </button>
                {submitState === 'sent' && <p role="status" style={{ margin: 0, lineHeight: 1.45 }}>{talkCopy.sent}</p>}
                {submitState === 'error' && <p role="alert" style={{ margin: 0, lineHeight: 1.45, color: '#8b2020' }}>{talkCopy.error}</p>}
              </form>
            )}

            {!inquiryType && <a href="mailto:tina@pinart.si" style={{ display: 'inline-block', marginTop: '1.8rem', color: 'inherit', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', textUnderlineOffset: '0.35rem' }}>{talkCopy.email}</a>}
          </section>
        </div>
      )}
    </>
  );
}
