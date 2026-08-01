'use client';

/* Globalna Pupa — plavajoč AI pomočnik, viden na VSEH orodjih (priklopljen v
   app/[locale]/kalkulator/layout.tsx). Klepet + glas prek /api/pupa. Kontekst
   ponudbe dobi prek lib/pupaBridge (orodje objavi nasvete/povzetek); brez
   konteksta je generična pomočnica. Vsi stili inline (injeciran CSS se ne
   osvežuje zanesljivo). */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Microphone, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { preberiPupaKontekst, type PupaKontekst } from '@/lib/pupaBridge';

const OBRAZ = (px: number) => (
  <span aria-hidden style={{ position: 'relative', width: px, height: px, flex: 'none', borderRadius: '50%', background: 'conic-gradient(from 210deg,#ffd54a,#7be0a0,#63c7e8,#a78bfa,#f78fb0,#ffd54a)', display: 'inline-flex' }}>
    <svg viewBox="0 0 40 40" width={px} height={px} style={{ position: 'absolute', inset: 0 }}>
      <path d="M9.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <path d="M23.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <path d="M14.5 23.5q5.5 4.6 11 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <circle cx="11.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
      <circle cx="28.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
    </svg>
  </span>
);

type Sporocilo = { role: 'user' | 'assistant'; content: string };

export default function Pupa() {
  const pathname = usePathname() || '';
  const locale = pathname.startsWith('/en') ? 'en' : 'sl';
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);

  const [mounted, setMounted] = useState(false);
  const [odprt, setOdprt] = useState(false);
  const [ctx, setCtx] = useState<PupaKontekst>({ nasveti: [], kontekst: '', naslov: '' });
  const [spor, setSpor] = useState<Sporocilo[]>([]);
  const [vnos, setVnos] = useState('');
  const [caka, setCaka] = useState(false);
  const [poslusa, setPoslusa] = useState(false);
  const [zvok, setZvok] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCtx(preberiPupaKontekst());
    const onCtx = () => setCtx(preberiPupaKontekst());
    const onOpen = () => setOdprt(true);
    window.addEventListener('pupa:kontekst', onCtx);
    window.addEventListener('pupa:odpri', onOpen);
    return () => { window.removeEventListener('pupa:kontekst', onCtx); window.removeEventListener('pupa:odpri', onOpen); };
  }, []);

  const nasveti = ctx.nasveti;
  const imaPonudbo = !!ctx.kontekst;

  const govori = (t: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = locale === 'en' ? 'en-US' : 'sl-SI';
    window.speechSynthesis.speak(u);
  };

  const posljiPupi = async (besedilo?: string) => {
    const q = (besedilo ?? vnos).trim();
    if (!q || caka) return;
    const zgodovina = spor.slice(-8);
    setSpor(s => [...s, { role: 'user', content: q }]);
    setVnos('');
    setCaka(true);
    try {
      const res = await fetch('/api/pupa', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vprasanje: q, kontekst: preberiPupaKontekst().kontekst, zgodovina }),
      });
      const data = await res.json();
      const odg = data.odgovor || data.napaka || 'Hmm, nekaj je zaškripalo.';
      setSpor(s => [...s, { role: 'assistant', content: odg }]);
      if (zvok) govori(odg);
    } catch {
      setSpor(s => [...s, { role: 'assistant', content: L('Ne morem do zaledja. Poskusi znova.', 'Cannot reach the backend. Try again.') }]);
    } finally {
      setCaka(false);
    }
  };

  const glas = () => {
    if (typeof window === 'undefined') return;
    const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) { alert(L('Glasovni vnos ta brskalnik ne podpira (poskusi Chrome ali Safari).', 'This browser does not support voice input (try Chrome or Safari).')); return; }
    const rec = new (SR as new () => any)();
    rec.lang = locale === 'en' ? 'en-US' : 'sl-SI';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setPoslusa(true);
    rec.onresult = (e: any) => { const t = e.results?.[0]?.[0]?.transcript || ''; if (t) posljiPupi(t); };
    rec.onerror = () => setPoslusa(false);
    rec.onend = () => setPoslusa(false);
    rec.start();
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {!odprt && (
        <button type="button" onClick={() => setOdprt(true)} aria-label={L('Odpri Pupo', 'Open Pupa')} title={L('Pupa: pomočnica', 'Pupa: assistant')}
          style={{ position: 'fixed', right: '1.4rem', bottom: '1.4rem', zIndex: 90, width: 58, height: 58, flex: 'none', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'conic-gradient(from 210deg,#ffd54a,#7be0a0,#63c7e8,#a78bfa,#f78fb0,#ffd54a)', boxShadow: '0 12px 30px rgba(42,32,53,.30)' }}>
          <svg viewBox="0 0 40 40" width="58" height="58" style={{ position: 'absolute', inset: 0 }}>
            <path d="M9.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
            <path d="M23.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
            <path d="M14.5 23.5q5.5 4.6 11 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
            <circle cx="11.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
            <circle cx="28.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
          </svg>
          {nasveti.length > 0 && (
            <span aria-hidden style={{ position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10, background: '#e0567a', color: '#fff', fontSize: '.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{nasveti.length}</span>
          )}
        </button>
      )}

      {odprt && (
        <div role="dialog" aria-label="Pupa" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px, 94vw)', zIndex: 95, background: '#fff', borderLeft: '1px solid rgba(42,32,53,.12)', boxShadow: '-16px 0 50px rgba(42,32,53,.18)', display: 'flex', flexDirection: 'column', color: '#2A2035' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '1rem 1.1rem', borderBottom: '1px solid rgba(42,32,53,.08)' }}>
            {OBRAZ(34)}
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <b style={{ fontSize: '1rem' }}>Pupa</b>
              <div style={{ fontSize: '.74rem', opacity: .6 }}>{L('pomočnica za cene in pravice', 'your pricing & rights helper')}</div>
            </div>
            <button type="button" onClick={() => { const n = !zvok; setZvok(n); if (!n && typeof window !== 'undefined') window.speechSynthesis?.cancel(); }} aria-label={zvok ? L('Izklopi glas', 'Mute voice') : L('Vklopi glas', 'Enable voice')} title={zvok ? L('Glasovni odgovori: vklopljeni', 'Voice replies: on') : L('Glasovni odgovori: izklopljeni', 'Voice replies: off')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: zvok ? '#a78bfa' : 'rgba(42,32,53,.45)', padding: 2, display: 'inline-flex' }}>
              {zvok ? <SpeakerHigh size={19} weight="fill" /> : <SpeakerSlash size={19} />}
            </button>
            <button type="button" onClick={() => setOdprt(false)} aria-label={L('Zapri', 'Close')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 24, lineHeight: 1, color: 'rgba(42,32,53,.5)', padding: 2 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div style={{ alignSelf: 'flex-start', maxWidth: '92%', padding: '.65rem .8rem', borderRadius: 16, background: 'rgba(167,139,250,.12)', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              <p style={{ margin: 0, fontSize: '.88rem', lineHeight: 1.45 }}>
                {imaPonudbo
                  ? L('Zdravo! Pogledala sem tvojo ponudbo. Karkoli te zanima, kar vprašaj — pomagam s ceno, pravicami in besedilom.', 'Hi! I reviewed your quote. Ask me anything — I help with pricing, rights and wording.')
                  : L('Zdravo, tu Pupa! Vprašaj me karkoli o cenah, avtorskih pravicah ali svojem poslovanju.', 'Hi, I’m Pupa! Ask me anything about pricing, copyright or running your business.')}
              </p>
              {nasveti.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {nasveti.map(n => (
                    <li key={n.id} style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', fontSize: '.86rem', lineHeight: 1.45 }}>
                      <span aria-hidden style={{ flex: 'none', width: 18, height: 18, marginTop: 2, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: '#fff', background: n.resnost === 'opozorilo' ? '#e0567a' : '#a78bfa' }}>{n.resnost === 'opozorilo' ? '!' : '·'}</span>
                      <span>{n.besedilo}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {spor.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', padding: '.6rem .8rem', borderRadius: 16, background: m.role === 'user' ? '#2A2035' : 'rgba(167,139,250,.12)', color: m.role === 'user' ? '#fff' : '#2A2035', fontSize: '.88rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{m.content}</div>
            ))}
            {caka && (
              <div style={{ alignSelf: 'flex-start', padding: '.6rem .8rem', borderRadius: 16, background: 'rgba(167,139,250,.12)', fontSize: '.86rem', opacity: .7 }}>{L('Pupa razmišlja…', 'Pupa is thinking…')}</div>
            )}
          </div>

          <form onSubmit={e => { e.preventDefault(); posljiPupi(); }} style={{ padding: '.75rem .9rem', borderTop: '1px solid rgba(42,32,53,.08)', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <button type="button" onClick={glas} aria-label={L('Govori', 'Speak')} title={L('Govori', 'Speak')}
              style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(42,32,53,.18)', cursor: 'pointer', background: poslusa ? '#e0567a' : '#fff', color: poslusa ? '#fff' : '#2A2035', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Microphone size={19} weight={poslusa ? 'fill' : 'regular'} />
            </button>
            <input value={vnos} onChange={e => setVnos(e.target.value)} placeholder={poslusa ? L('Poslušam…', 'Listening…') : L('Vprašaj Pupo…', 'Ask Pupa…')}
              style={{ flex: 1, border: '1px solid rgba(42,32,53,.18)', borderRadius: 12, padding: '.55rem .75rem', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }} />
            <button type="submit" disabled={caka || !vnos.trim()}
              style={{ flex: 'none', border: 'none', borderRadius: 12, padding: '.55rem .9rem', background: '#2A2035', color: '#fff', cursor: caka || !vnos.trim() ? 'default' : 'pointer', fontWeight: 600, opacity: caka || !vnos.trim() ? .5 : 1 }}>{L('Pošlji', 'Send')}</button>
          </form>
        </div>
      )}
    </>,
    document.body,
  );
}
