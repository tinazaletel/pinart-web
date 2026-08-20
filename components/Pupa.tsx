'use client';

/* Globalna Pupa — plavajoč AI pomočnik, viden na VSEH orodjih (priklopljen v
   app/[locale]/kalkulator/layout.tsx). Klepet + glas prek /api/pupa. Kontekst
   ponudbe dobi prek lib/pupaBridge (orodje objavi nasvete/povzetek); brez
   konteksta je generična pomočnica. Vsi stili inline (injeciran CSS se ne
   osvežuje zanesljivo). */

import { useEffect, useRef, useState } from 'react';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Microphone, Sparkle } from '@phosphor-icons/react';
import { preberiPupaKontekst, type PupaKontekst } from '@/lib/pupaBridge';
import { preberiPupaStanje, nastaviPupaStanje, PUPA_STANJE_DOGODEK, type PupaStanje } from '@/lib/pupaNastavitve';
import { getAccessTier, canUseFeature } from '@/lib/pinartFlowEntitlements';

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
  const [stanje, setStanje] = useState<PupaStanje>('vklopljena');   /* SSR-varno; pravo stanje se prebere ob mountu */
  const [pupaDovoljena, setPupaDovoljena] = useState(true);         /* paket dovoljuje AI (pro); free -> nadgradnja */
  const [odprt, setOdprt] = useState(false);
  const [ctx, setCtx] = useState<PupaKontekst>({ nasveti: [], kontekst: '', naslov: '' });
  const [spor, setSpor] = useState<Sporocilo[]>([]);
  const [vnos, setVnos] = useState('');
  const [caka, setCaka] = useState(false);
  /* POVEZANI AGENTI (»Moj AI«): uporabnica lahko isto vprašanje pošlje Pupi ali
     svojemu povezanemu ponudniku. Prazen niz = Pupa. Ključi ostanejo na
     strežniku — brskalnik pozna samo oznako in id povezave. */
  const [agenti, setAgenti] = useState<{ id: string; label: string; provider: string }[]>([]);
  const [agent, setAgent] = useState('');
  const orgRef = useRef<string>('');
  const prekiniRef = useRef<AbortController | null>(null);
  const [poslusa, setPoslusa] = useState(false);
  const [zvok, setZvok] = useState(false);
  const [nacin, setNacin] = useState<'chat' | 'glas'>('chat');
  const [govoreca, setGovoreca] = useState(false);
  const [skritScroll, setSkritScroll] = useState(false);
  const sporRef = useRef<HTMLDivElement>(null);

  /* Pupa ne sme prekrivati vsebine: ko drsaš NAVZDOL (bereš), izgine; ko drsaš GOR ali si na vrhu, se vrne. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastY = window.scrollY; let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y > lastY + 6 && y > 120) setSkritScroll(true);
        else if (y < lastY - 6 || y < 60) setSkritScroll(false);
        lastY = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    setMounted(true);
    setCtx(preberiPupaKontekst());
    setStanje(preberiPupaStanje());
    void getAccessTier().then(t => setPupaDovoljena(canUseFeature(t, 'aiConnector'))).catch(() => undefined);
    const onStanje = () => setStanje(preberiPupaStanje());
    window.addEventListener(PUPA_STANJE_DOGODEK, onStanje);
    window.addEventListener('storage', onStanje);
    const onCtx = () => setCtx(preberiPupaKontekst());
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent).detail as { nacin?: 'chat' | 'glas' } | undefined;
      if (d?.nacin) { setNacin(d.nacin); if (d.nacin === 'glas') setZvok(true); }
      setOdprt(true);
    };
    window.addEventListener('pupa:kontekst', onCtx);
    window.addEventListener('pupa:odpri', onOpen);
    return () => { window.removeEventListener('pupa:kontekst', onCtx); window.removeEventListener('pupa:odpri', onOpen); window.removeEventListener(PUPA_STANJE_DOGODEK, onStanje); window.removeEventListener('storage', onStanje); };
  }, []);

  /* Samodejni pomik na dno ob novem sporočilu / med čakanjem / ob odprtju. */
  useEffect(() => {
    const el = sporRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [spor, caka, odprt]);

  const nasveti = ctx.nasveti;
  const imaPonudbo = !!ctx.kontekst;
  const zadnjiU = [...spor].reverse().find(m => m.role === 'user');
  const zadnjiA = [...spor].reverse().find(m => m.role === 'assistant');

  /* TTS bere dobesedno — počistimo markdown/simbole, da ne bere »zvezdica«, »lojtra« ipd. */
  const ocistiZaGovor = (t: string) => t
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-•*]\s+/gm, '')
    .replace(/€/g, locale === 'en' ? ' euros' : ' evrov')
    .replace(/\s+/g, ' ')
    .trim();

  const govori = (t: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const besedilo = ocistiZaGovor(t);
    if (!besedilo) return;
    const sinteza = window.speechSynthesis;
    sinteza.cancel();
    const jezik = locale === 'en' ? 'en-US' : 'sl-SI';
    const pref = jezik.slice(0, 2).toLowerCase();
    let spregovoril = false;
    const izgovori = () => {
      if (spregovoril) return; spregovoril = true;
      const glasovi = sinteza.getVoices();
      const u = new SpeechSynthesisUtterance(besedilo);
      u.rate = 1; u.pitch = 1;
      /* VEDNO izberi konkreten glas (sl -> privzeti -> prvi) — sicer Safari brez
         ujemajocega glasu za lang ostane popolnoma tih. */
      const glas = glasovi.find(v => v.lang?.toLowerCase().startsWith(pref)) || glasovi.find(v => v.default) || glasovi[0];
      if (glas) { u.voice = glas; u.lang = glas.lang; } else { u.lang = jezik; }
      u.onstart = () => setGovoreca(true);
      u.onend = () => setGovoreca(false);
      u.onerror = () => setGovoreca(false);
      sinteza.resume();
      sinteza.speak(u);
    };
    if (sinteza.getVoices().length) izgovori();
    else {
      sinteza.addEventListener('voiceschanged', izgovori, { once: true });
      sinteza.getVoices();
      window.setTimeout(izgovori, 300);
    }
  };

  const posljiPupi = async (besedilo?: string) => {
    const q = (besedilo ?? vnos).trim();
    if (!q || caka) return;
    const zgodovina = spor.slice(-8);
    setSpor(s => [...s, { role: 'user', content: q }]);
    setVnos('');
    setCaka(true);
    const krmilnik = new AbortController();
    prekiniRef.current = krmilnik;
    try {
      const pk = preberiPupaKontekst();
      const kontekstSKorakom = [pk.korak, pk.kontekst].filter(Boolean).join('\n\n');
      /* Izbran tuj agent gre skozi /api/ai/izvedi, ki pozna njegov ključ in
         dovoljenja; Pupa gre po svoji poti. Kontekst dobita oba enak. */
      const res = agent
        ? await fetch('/api/ai/izvedi', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            organizationId: orgRef.current,
            connectionId: agent,
            prompt: [kontekstSKorakom, q].filter(Boolean).join('\n\n'),
          }),
          signal: krmilnik.signal,
        })
        : await fetch('/api/pupa', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ vprasanje: q, kontekst: kontekstSKorakom, zgodovina }),
          signal: krmilnik.signal,
        });
      const data = await res.json();
      const odg = data.odgovor || data.text || data.napaka || data.error || 'Hmm, nekaj je zaškripalo.';
      setSpor(s => [...s, { role: 'assistant', content: odg }]);
      if (zvok || nacin === 'glas') govori(odg);
    } catch (e) {
      /* Uporabnik je pritisnil Stop — brez sporočila o napaki. */
      if ((e as Error)?.name !== 'AbortError') {
        setSpor(s => [...s, { role: 'assistant', content: L('Ne morem do zaledja. Poskusi znova.', 'Cannot reach the backend. Try again.') }]);
      }
    } finally {
      setCaka(false);
      prekiniRef.current = null;
    }
  };

  /* Stop: prekine zahtevo do Pupe in ustavi morebitni govor. */
  const prekini = () => {
    prekiniRef.current?.abort();
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    setCaka(false);
  };

  const glas = () => {
    if (typeof window === 'undefined') return;
    /* odkleni TTS znotraj uporabniške geste (Safari zahteva gesto za prvi govor) */
    try { window.speechSynthesis?.resume(); const odklep = new SpeechSynthesisUtterance(' '); odklep.volume = 0; window.speechSynthesis?.speak(odklep); } catch { /* ignore */ }
    const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) { alert(L('Glasovni vnos najbolje deluje v Chromu (Firefox ga ne podpira).', 'Voice input works best in Chrome (Firefox does not support it).')); return; }
    let rec: any;
    try { rec = new (SR as new () => any)(); } catch { alert(L('Glasovnega vnosa ni bilo mogoče zagnati.', 'Could not start voice input.')); return; }
    rec.lang = locale === 'en' ? 'en-US' : 'sl-SI';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setPoslusa(true);
    rec.onresult = (e: any) => { const t = e.results?.[0]?.[0]?.transcript || ''; if (t) posljiPupi(t); };
    rec.onerror = (e: any) => {
      setPoslusa(false);
      const err = e?.error;
      if (err === 'not-allowed') {
        alert(L('Dovoli mikrofon (ikona ob naslovu / Safari → Nastavitve → Spletišča → Mikrofon), nato osveži.', 'Allow the microphone (address-bar icon / Safari → Settings → Websites → Microphone), then refresh.'));
      } else if (err === 'service-not-allowed' || err === 'language-not-supported') {
        alert(L('Slovenski glasovni vnos v tem brskalniku ni na voljo (Safari nima slovenskega narekovanja). Uporabi Chrome.', 'Slovenian voice input is not available in this browser (Safari lacks Slovenian dictation). Use Chrome.'));
      }
    };
    rec.onend = () => setPoslusa(false);
    try { rec.start(); } catch { setPoslusa(false); }
  };

  /* Safari (in ne Chrome/Firefox) — Apple nima slovenskega narekovanja, zato glasovni VNOS tam ne dela */
  const jeSafari = mounted && typeof navigator !== 'undefined' && /^((?!chrome|android|crios|edg|opr|fxios).)*safari/i.test(navigator.userAgent);

  if (!mounted) return null;
  if (stanje === 'izklopljena') return null;   /* izklopljena v Nastavitvah -> brez gumba */
  /* Pred prijavo (login stran) Pupa ne sme biti vidna — je plačljiva/za prijavljene. Edina
     neprijavljena stran pod /kalkulator je /prijava (drugam middleware preusmeri). */
  if (/\/kalkulator\/prijava(\/|$)/.test(pathname)) return null;
  /* Tudi na ostalih "vratih" (novo geslo, zaprta beta, sprejem vabila) Pupa nima
     kaj iskati: to niso delovne strani, uporabnik tam samo opravi en korak. */
  if (/\/kalkulator\/(geslo|beta)(\/|$)/.test(pathname)) return null;
  if (/\/kalkulator\/ekipa\/sprejmi(\/|$)/.test(pathname)) return null;
  /* Pupa dom JE Pupa (cel pogovorni vmesnik) — plavajoč orb bi bil odveč in podvojen. */
  if (/\/kalkulator\/dom(\/|$)/.test(pathname)) return null;

  return createPortal(
    <>
      {/* Pupa OB STRANI (plavajoči orb) OSTANE — osnovni paket. Na /dom je ni (dom JE Pupa,
          zgoraj return null); v advance paketu se Pupa združi v split okno (Pupa levo, orodje desno).
          Odpira jo tudi sparkle (✨) v glavi prek 'pupa:odpri'. */}
      {/* Na MOBILU je orb spodaj desno vedno visel čez akcijske gumbe (Shrani/Pošlji/Pripravi
          ponudbo). Zato ga tam prestavimo gor desno OB hamburger — desktop ostane spodaj desno. */}
      <style>{'body:has(.izbirnik-zastor) .pupa-fab,body:has(.izbirnik-plosca) .pupa-fab,body:has(.soglasje) .pupa-fab{display:none!important}.pupa-fab-mini{display:none}@media (max-width:760px){.pupa-fab{top:.55rem!important;bottom:auto!important;right:5rem!important;width:2rem!important;height:2rem!important;background:transparent!important;border:0!important;box-shadow:none!important;display:flex!important;align-items:center!important;justify-content:center!important}.pupa-fab .pupa-fab-full{display:none!important}.pupa-fab .pupa-fab-mini{display:block!important}}'}</style>
      {!odprt && (
        <button type="button" className={'pupa-fab' + (skritScroll ? ' pupa-skrit' : '')} onClick={() => setOdprt(true)} aria-label={L('Odpri Pupo', 'Open Pupa')} title={L('Pupa: pomočnica', 'Pupa: assistant')}
          style={{ position: 'fixed', right: '1.4rem', bottom: '1.4rem', zIndex: 90, width: 58, height: 58, flex: 'none', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'conic-gradient(from 210deg,#ffd54a,#7be0a0,#63c7e8,#a78bfa,#f78fb0,#ffd54a)', boxShadow: '0 12px 30px rgba(42,32,53,.30)' }}>
          <span className="pupa-fab-full">
            <svg viewBox="0 0 40 40" width="58" height="58" style={{ position: 'absolute', inset: 0 }}>
              <path d="M9.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
              <path d="M23.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
              <path d="M14.5 23.5q5.5 4.6 11 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
              <circle cx="11.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
              <circle cx="28.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
            </svg>
            <Sparkle size={19} weight="fill" color="#ffcb1f" style={{ position: 'absolute', top: -10, right: -4, filter: 'drop-shadow(0 1px 2px rgba(42,32,53,.28))' }} aria-hidden />
            <Sparkle size={11} weight="fill" color="#ffd54a" style={{ position: 'absolute', top: -3, right: -10, filter: 'drop-shadow(0 1px 2px rgba(42,32,53,.22))' }} aria-hidden />
          </span>
          {/* mobilna varianta: ista čista ✨ ikona kot v meniju/mailu (ne mavrični smiley) */}
          <Sparkle className="pupa-fab-mini" size={18} weight="regular" color="#2A2035" aria-hidden />
          {nasveti.length > 0 && (
            <span aria-hidden style={{ position: 'absolute', bottom: -2, right: -2, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: '#e0567a', color: '#fff', fontSize: '.66rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{nasveti.length}</span>
          )}
        </button>
      )}

      {odprt && (
        <div role="dialog" aria-label="Pupa" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px, 94vw)', zIndex: 95, background: '#fff', borderLeft: '1px solid rgba(42,32,53,.12)', boxShadow: '-16px 0 50px rgba(42,32,53,.18)', display: 'flex', flexDirection: 'column', color: '#2A2035' }}>
          <style>{'@keyframes pupaRing{0%{box-shadow:0 0 0 0 rgba(224,86,122,.40)}100%{box-shadow:0 0 0 32px rgba(224,86,122,0)}}@keyframes pupaBreathe{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(124,58,237,.42)}50%{transform:scale(1.06);box-shadow:0 0 0 18px rgba(124,58,237,0)}}@keyframes pupaBlob{0%,100%{border-radius:42% 58% 55% 45% / 48% 42% 58% 52%;transform:rotate(0deg) scale(1)}33%{border-radius:62% 38% 42% 58% / 55% 62% 38% 45%;transform:rotate(120deg) scale(1.12)}66%{border-radius:45% 55% 62% 38% / 40% 52% 48% 60%;transform:rotate(240deg) scale(.94)}}@media (prefers-reduced-motion: reduce){[style*="pupaBlob"]{animation:none!important}}'}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '1rem 1.1rem', borderBottom: '1px solid rgba(42,32,53,.08)' }}>
            {OBRAZ(34)}
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <b style={{ fontSize: '1rem' }}>Pupa</b>
              <div style={{ fontSize: '.74rem', opacity: .6 }}>{L('pomočnica za cene in pravice', 'your pricing & rights helper')}</div>
            </div>
            <div role="group" aria-label={L('Način', 'Mode')} style={{ display: 'inline-flex', gap: 2, padding: 2, borderRadius: 999, background: 'rgba(42,32,53,.06)' }}>
              <button type="button" onClick={() => setNacin('chat')} aria-pressed={nacin === 'chat'} style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '.3rem .6rem', fontSize: '.73rem', fontWeight: 700, fontFamily: 'inherit', background: nacin === 'chat' ? '#2A2035' : 'transparent', color: nacin === 'chat' ? '#fff' : 'rgba(42,32,53,.6)' }}>{L('Klepet', 'Chat')}</button>
              <button type="button" onClick={() => { setNacin('glas'); setZvok(true); }} aria-pressed={nacin === 'glas'} style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '.3rem .6rem', fontSize: '.73rem', fontWeight: 700, fontFamily: 'inherit', background: nacin === 'glas' ? '#2A2035' : 'transparent', color: nacin === 'glas' ? '#fff' : 'rgba(42,32,53,.6)' }}>{L('Glas', 'Voice')}</button>
            </div>
            <button type="button" onClick={() => { if (typeof window !== 'undefined') { if (zvok) { window.speechSynthesis?.cancel(); } else { try { window.speechSynthesis?.resume(); const o = new SpeechSynthesisUtterance(' '); o.volume = 0; window.speechSynthesis?.speak(o); } catch { /* ignore */ } } } setZvok(z => !z); }} aria-pressed={zvok} aria-label={zvok ? L('Utišaj Pupo', 'Mute Pupa') : L('Vklopi glas Pupe', 'Unmute Pupa')} title={zvok ? L('Pupa bere odgovore na glas — klikni za utišanje', 'Pupa reads answers aloud — click to mute') : L('Vklopi, da Pupa bere odgovore na glas', 'Turn on so Pupa reads answers aloud')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: zvok ? '#2A2035' : 'rgba(42,32,53,.4)', display: 'inline-flex' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 5 6 9H2v6h4l5 4z" />
                {zvok ? <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></> : <path d="M22 9l-6 6M16 9l6 6" />}
              </svg>
            </button>
            <button type="button" onClick={() => { if (typeof window !== 'undefined') window.speechSynthesis?.cancel(); setOdprt(false); }} aria-label={L('Zapri', 'Close')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 24, lineHeight: 1, color: 'rgba(42,32,53,.5)', padding: 2 }}>×</button>
          </div>

          {!pupaDovoljena ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem 1.6rem', textAlign: 'center' }}>
              {OBRAZ(56)}
              <b style={{ fontSize: '1.05rem' }}>{L('Pupa je v paketu Pro', 'Pupa is a Pro feature')}</b>
              <p style={{ margin: 0, fontSize: '.9rem', lineHeight: 1.5, color: 'rgba(42,32,53,.72)', maxWidth: '30ch' }}>{L('Pametna pomočnica za cene, pravice in besedilo je na voljo v paketu Pro. Nadgradi in Pupa ti pomaga pri vsaki ponudbi.', 'Your smart helper for pricing, rights and wording is available on Pro. Upgrade and Pupa helps with every quote.')}</p>
              <a href={`${locale === 'en' ? '/en' : ''}/flow`} onClick={() => setOdprt(false)} style={{ textDecoration: 'none', border: 'none', borderRadius: 12, padding: '.65rem 1.2rem', background: '#2A2035', color: '#fff', fontWeight: 700, fontSize: '.9rem' }}>{L('Nadgradi na Pro', 'Upgrade to Pro')}</a>
            </div>
          ) : stanje === 'privolitev' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem 1.6rem', textAlign: 'center' }}>
              {OBRAZ(56)}
              <b style={{ fontSize: '1.05rem' }}>{L('Vklopiš Pupo?', 'Turn on Pupa?')}</b>
              <p style={{ margin: 0, fontSize: '.88rem', lineHeight: 1.5, color: 'rgba(42,32,53,.72)', maxWidth: '32ch' }}>{L('Pupa je AI pomočnica. Ko jo vprašaš, se podatki trenutne ponudbe pošljejo AI ponudniku (Anthropic) samo zato, da ti odgovori. Podatki se NE uporabljajo za učenje modela. Pupo lahko kadar koli izklopiš v Nastavitvah.', 'Pupa is an AI helper. When you ask, your current quote details are sent to the AI provider (Anthropic) only to answer you. Data is NOT used to train the model. You can turn Pupa off anytime in Settings.')}</p>
              <div style={{ display: 'flex', gap: '.6rem', marginTop: '.2rem' }}>
                <button type="button" onClick={() => setOdprt(false)} style={{ border: '1px solid rgba(42,32,53,.2)', borderRadius: 12, padding: '.6rem 1rem', background: '#fff', color: '#2A2035', fontWeight: 600, fontSize: '.86rem', cursor: 'pointer' }}>{L('Ne zdaj', 'Not now')}</button>
                <button type="button" onClick={() => { nastaviPupaStanje('vklopljena'); setStanje('vklopljena'); }} style={{ border: 'none', borderRadius: 12, padding: '.6rem 1.2rem', background: '#2A2035', color: '#fff', fontWeight: 700, fontSize: '.86rem', cursor: 'pointer' }}>{L('Vklopi Pupo', 'Turn on Pupa')}</button>
              </div>
            </div>
          ) : nacin === 'glas' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '1.5rem 1.4rem', textAlign: 'center' }}>
              {zadnjiA && <p style={{ margin: 0, maxWidth: '30ch', fontSize: '.94rem', lineHeight: 1.5, opacity: caka ? .35 : 1 }}>{zadnjiA.content}</p>}
              <button type="button" onClick={() => { if (!poslusa && !caka) glas(); }} aria-label={L('Tapni in govori', 'Tap to talk')}
                style={{ position: 'relative', width: 148, height: 148, flex: 'none', borderRadius: '50%', border: 'none', padding: 0, cursor: poslusa || caka ? 'default' : 'pointer', background: 'conic-gradient(from 210deg,#ffd54a,#7be0a0,#63c7e8,#a78bfa,#f78fb0,#ffd54a)', animation: poslusa ? 'pupaRing 1.4s ease-out infinite' : govoreca ? 'pupaBreathe 0.85s ease-in-out infinite' : 'none' }}>
                <svg viewBox="0 0 40 40" width="148" height="148" style={{ position: 'absolute', inset: 0 }}>
                  <path d="M9.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
                  <path d="M23.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
                  <path d="M14.5 23.5q5.5 4.6 11 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
                  <circle cx="11.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
                  <circle cx="28.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.5)" />
                </svg>
              </button>
              <div style={{ minHeight: '1.4em', fontSize: '.92rem', fontWeight: 600, color: poslusa ? '#e0567a' : 'rgba(42,32,53,.72)' }}>
                {poslusa ? L('Poslušam…', 'Listening…') : caka ? L('Pupa razmišlja…', 'Pupa is thinking…') : govoreca ? L('Pupa govori…', 'Pupa is speaking…') : L('Tapni krog in govori', 'Tap the circle and talk')}
              </div>
              {zadnjiU && <p style={{ margin: 0, fontSize: '.78rem', opacity: .5, maxWidth: '30ch' }}>{L('Ti:', 'You:')} {zadnjiU.content}</p>}
              {jeSafari && (
                <p style={{ margin: '.4rem 0 0', padding: '.55rem .8rem', borderRadius: 12, background: 'rgba(178,84,118,.09)', color: '#b25476', fontSize: '.74rem', lineHeight: 1.45, maxWidth: '32ch' }}>
                  {L('Safari (Apple) ne podpira slovenskega glasovnega vnosa. Za pogovor s Pupo na glas uporabi Chrome. (Branje odgovorov na glas deluje.)', 'Safari (Apple) does not support Slovenian voice input. Use Chrome to talk to Pupa. (Reading answers aloud still works.)')}
                </p>
              )}
            </div>
          ) : (
          <><div ref={sporRef} style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div aria-hidden style={{ position: 'absolute', top: '26%', left: 0, right: 0, marginLeft: 'auto', marginRight: 'auto', width: 'min(78%, 270px)', aspectRatio: '1', zIndex: 0, pointerEvents: 'none', borderRadius: '50%', background: 'radial-gradient(circle at 34% 30%, rgba(180,140,255,.46), rgba(120,165,240,.28) 55%, transparent 74%)', filter: 'blur(8px)', animation: 'pupaBlob 7s ease-in-out infinite', transition: 'opacity .4s ease', opacity: caka ? 1 : .68 }} />
            <div style={{ position: 'relative', zIndex: 1, alignSelf: 'flex-start', maxWidth: '92%', padding: '.65rem .8rem', borderRadius: 16, background: 'rgba(167,139,250,.12)', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
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
              <div key={i} style={{ position: 'relative', zIndex: 1, alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', padding: '.6rem .8rem', borderRadius: 16, background: m.role === 'user' ? '#2A2035' : 'rgba(167,139,250,.12)', color: m.role === 'user' ? '#fff' : '#2A2035', fontSize: '.88rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{m.content}</div>
            ))}
            {caka && (
              <div style={{ position: 'relative', zIndex: 1, alignSelf: 'flex-start', padding: '.6rem .8rem', borderRadius: 16, background: 'rgba(167,139,250,.12)', fontSize: '.86rem', opacity: .7 }}>{L('Pupa razmišlja…', 'Pupa is thinking…')}</div>
            )}
          </div>

          <form onSubmit={e => { e.preventDefault(); posljiPupi(); }} style={{ padding: '.75rem .9rem', borderTop: '1px solid rgba(42,32,53,.08)', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <button type="button" onClick={glas} aria-label={L('Govori', 'Speak')} title={L('Govori', 'Speak')}
              style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(42,32,53,.18)', cursor: 'pointer', background: poslusa ? '#e0567a' : '#fff', color: poslusa ? '#fff' : '#2A2035', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Microphone size={19} weight={poslusa ? 'fill' : 'regular'} />
            </button>
            {agenti.length > 0 && (
              /* Izbira, KDO odgovori. Pokaže se šele, ko je povezan vsaj en
                 tvoj agent — sicer je izbira brez pomena. */
              <select value={agent} onChange={e => setAgent(e.target.value)}
                aria-label={L('Kdo naj odgovori', 'Who should answer')}
                title={L('Kdo naj odgovori', 'Who should answer')}
                style={{ flex: 'none', maxWidth: '8.5rem', padding: '.4rem .3rem', borderRadius: '.6rem', border: '1px solid rgba(42,32,53,.14)', background: '#fff', font: '600 .74rem inherit', color: '#2a2035', cursor: 'pointer' }}>
                <option value="">Pupa</option>
                {agenti.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            )}
            <input value={vnos} onChange={e => setVnos(e.target.value)} placeholder={poslusa ? L('Poslušam…', 'Listening…') : L('Vprašaj Pupo…', 'Ask Pupa…')}
              style={{ flex: 1, border: '1px solid rgba(42,32,53,.18)', borderRadius: 12, padding: '.55rem .75rem', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }} />
            {caka ? (
              <button type="button" onClick={prekini} aria-label={L('Ustavi', 'Stop')} title={L('Ustavi', 'Stop')}
                style={{ flex: 'none', border: 'none', borderRadius: 12, padding: '.55rem .9rem', background: '#2A2035', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                <span style={{ width: 11, height: 11, background: '#fff', borderRadius: 2, display: 'inline-block' }} aria-hidden="true" />{L('Ustavi', 'Stop')}
              </button>
            ) : (
              <button type="submit" disabled={!vnos.trim()}
                style={{ flex: 'none', border: 'none', borderRadius: 12, padding: '.55rem .9rem', background: '#2A2035', color: '#fff', cursor: !vnos.trim() ? 'default' : 'pointer', fontWeight: 600, opacity: !vnos.trim() ? .5 : 1 }}>{L('Pošlji', 'Send')}</button>
            )}
          </form>
          </>
          )}
        </div>
      )}
    </>,
    document.body,
  );
}
