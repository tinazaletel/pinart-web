'use client';

import { preberiVstopnoStran, zapisiVstopnoStran, type VstopnaStran } from '@/lib/vstopnaStran';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { PaintBrush, Sparkle, EnvelopeSimple, PlugsConnected } from '@phosphor-icons/react';
import VidezDokumentov from '@/components/VidezDokumentov';
import MojAiPovezave from '@/components/MojAiPovezave';
import PovprasevanjeVgradnja from '@/components/PovprasevanjeVgradnja';
import { preberiPupaStanje, nastaviPupaStanje } from '@/lib/pupaNastavitve';
import { DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI, nastaviLogoAktivne, aktivniLogo } from '@/lib/dokVidez';
import { type PodpisPodatki, podpisHtml, podpisPrazen } from '@/lib/podpis';
import styles from './SettingsWorkspace.module.css';
import PriporociFlow from '@/components/PriporociFlow';

/* Nastavitve videza (stran "Dizajn"). Vsebina je PRENESENA iz profila
   kalkulatorja (videz dokumentov, logotip), da ni na dveh mestih razlicno.
   Vse zivi v localStorage — istih kljucih kot kalkulator, zato velja povsod.
   Izbris vseh podatkov je bil premaknjen v "Moj profil". */
const K_NAST = 'pinart-kalkulator-v2';
const K_LOGO = 'pinart-kalkulator-logo';

export default function SettingsWorkspace({ base, zavihek: zacetniZavihek }: { base: string; zavihek?: 'dokumenti' | 'ai' }) {
  const jeEn = useLocale() === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  /* ZAVIHKI: pet razdelkov je malo, a dva sta dolga (Videz dokumentov, Moj AI).
     Na telefonu si moral cez cel dolg razdelek do kratkega za njim. Loceno
     strani bi bila slabsa resitev — nastavitve, razprsene po vec poteh, so
     tezje najdljive od enega seznama. Zato skupine na ISTI strani. */
  const [zavihek, setZavihek] = useState<'dokumenti' | 'ai'>(zacetniZavihek || 'dokumenti');
  /* Zavihek pride s STREZNIKA iz ?zavihek=... Prej se je bral iz naslova v
     ucinku z [] — in ce si bila ze na Nastavitvah, klik na drugo postavko v
     meniju ni naredil nicesar: naslov se je spremenil, komponenta pa se ni
     postavila na novo (Tina, 30. 8. 2026). Prop se ob navigaciji spremeni,
     zato se zavihek preklopi. */
  useEffect(() => {
    if (zacetniZavihek) setZavihek(zacetniZavihek);
  }, [zacetniZavihek]);

  /* Izbrana vstopna stran; beremo v ucinku, ker localStorage na strezniku ni. */
  const [vstopna, setVstopna] = useState<VstopnaStran>('domov');
  useEffect(() => { setVstopna(preberiVstopnoStran()); }, []);

  const [barva, setBarva] = useState(DOK_BARVA_PRIVZETA);
  const [font, setFont] = useState(DOK_FONT_PRIVZETI);
  const [logo, setLogo] = useState('');
  const [nalozeno, setNalozeno] = useState(false);
  const [sporocilo, setSporocilo] = useState('');
  const datoteka = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const PODPIS_BARVE = ['#1A73E8', '#6E4FA6', '#111111', '#2F5D50', '#A44A3F', '#B8860B'];
  const [podpis, setPodpis] = useState('');
  const [podpisP, setPodpisP] = useState<PodpisPodatki>({});
  const [pupaVklop, setPupaVklop] = useState(true);
  const nastaviPodpisPolje = (k: keyof PodpisPodatki, v: string | boolean) => setPodpisP(prev => ({ ...prev, [k]: v }));
  const dodajPovezavo = () => setPodpisP(prev => ({ ...prev, povezave: [...(prev.povezave || []), { oznaka: '', url: '' }] }));
  const posodobiPovezavo = (i: number, polje: 'oznaka' | 'url', v: string) => setPodpisP(prev => { const next = [...(prev.povezave || [])]; next[i] = { ...next[i], [polje]: v }; return { ...prev, povezave: next }; });
  const odstraniPovezavo = (i: number) => setPodpisP(prev => ({ ...prev, povezave: (prev.povezave || []).filter((_, x) => x !== i) }));

  useEffect(() => { setPupaVklop(preberiPupaStanje() !== 'izklopljena'); }, []);
  const preklopiPupo = (vklop: boolean) => { setPupaVklop(vklop); nastaviPupaStanje(vklop ? 'vklopljena' : 'izklopljena'); };

  /* Preberi obstojece nastavitve iz istega kljuca kot kalkulator. */
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      if (s.dokBarva) setBarva(String(s.dokBarva));
      if (s.dokFont) setFont(String(s.dokFont));
      if (typeof s.podpisMaila === 'string') setPodpis(s.podpisMaila);
      if (s.podpisPodatki && typeof s.podpisPodatki === 'object') setPodpisP(s.podpisPodatki as PodpisPodatki);
    } catch { /* pokvarjen zapis ignoriramo */ }
    try { setLogo(localStorage.getItem(K_LOGO) || ''); } catch { /* ignoriraj */ }
    setNalozeno(true);
  }, []);

  /* Shrani nazaj v K_NAST, ne da bi povozil ostale nastavitve kalkulatorja. */
  useEffect(() => {
    if (!nalozeno) return;
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      localStorage.setItem(K_NAST, JSON.stringify({ ...s, dokBarva: barva, dokFont: font, podpisMaila: podpis, podpisPodatki: podpisP }));
    } catch { /* ignoriraj */ }
  }, [barva, font, podpis, podpisP, nalozeno]);

  function naloziBanner(f?: File) {
    if (!f) return;
    if (f.size > 800_000) { setSporocilo(L('Banner je prevelik (največ 800 kB). Zmanjšaj ga in poskusi znova.', 'The banner is too large (maximum 800 kB). Make it smaller and try again.')); return; }
    const fr = new FileReader();
    fr.onload = () => setPodpisP(prev => ({ ...prev, banner: String(fr.result || '') }));
    fr.readAsDataURL(f);
  }
  function naloziLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 600_000) { setSporocilo(L('Slika je prevelika (največ 600 kB). Zmanjšaj jo in poskusi znova.', 'The image is too large (maximum 600 kB). Make it smaller and try again.')); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const url = String(fr.result || '');
      setLogo(url);
      try { localStorage.setItem(K_LOGO, url); setSporocilo(L('Logotip je shranjen.', 'Logo saved.')); }
      catch { setSporocilo(L('Shramba je polna — logotipa ni bilo mogoče shraniti.', 'Storage is full — the logo could not be saved.')); }
      nastaviLogoAktivne(url);   /* zapomni tudi na AKTIVNO predlogo (vec predlog) */
    };
    fr.readAsDataURL(f);
  }

  function odstraniLogo() {
    setLogo('');
    try { localStorage.removeItem(K_LOGO); } catch { /* ignoriraj */ }
    nastaviLogoAktivne('');
    if (datoteka.current) datoteka.current.value = '';
    setSporocilo(L('Logotip je odstranjen.', 'Logo removed.'));
  }

  /* Ponovi uvodni pogovor: v zapisu kalkulatorja odklopi zakljucek uvoda in
     postavi pogovor na prvi korak. Odgovori (ime, izkusnje, podrocja) ostanejo
     in se v pogovoru prednapolnijo — samo znova gres skozenj. Cene, stranke in
     ponudbe se ne dotaknejo. onboarding-koncan zbrisemo, da se vrne tudi kartica
     "Dokoncaj nastavitev". Nato odpremo kalkulator, ki iz posodobljenega zapisa
     pogovor tudi zares zene. */
  function ponastaviVprasalnik() {
    if (!window.confirm(L('Ponovim uvodni vprašalnik? Cene in ponudbe ostanejo.', 'Repeat the introductory questionnaire? Your prices and proposals will remain.'))) return;
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      s.uvodKoncan = false; s.chatKorak = 0;
      localStorage.setItem(K_NAST, JSON.stringify(s));
      localStorage.removeItem('pinart-onboarding-koncan');
    } catch { /* zasebni nacin */ }
    window.location.href = `${base}/kalkulator/orodje?uvod=1`;
  }

  return (
    <div className={styles.wrap}>
      <nav aria-label={L('Razdelki nastavitev', 'Settings sections')}
        style={{ display: 'flex', gap: '1.4rem', margin: '0 0 1.6rem', borderBottom: '1px solid rgba(17,17,17,.12)' }}>
        {([['dokumenti', L('Dokumenti', 'Documents')],
           ['ai', 'AI']] as const).map(([v, ime]) => (
          <button key={v} type="button" onClick={() => setZavihek(v)} aria-current={zavihek === v ? 'page' : undefined}
            style={{
              padding: '0 .15rem .7rem', border: 0, background: 'transparent', cursor: 'pointer',
              font: `${zavihek === v ? 800 : 600} 1rem var(--font-sans), sans-serif`,
              color: zavihek === v ? '#111' : '#8a8177',
              borderBottom: zavihek === v ? '2px solid #6E4FA6' : '2px solid transparent',
              marginBottom: -1,
            }}>{ime}</button>
        ))}
      </nav>
      <section className={styles.card} style={{ display: zavihek === 'dokumenti' ? undefined : 'none' }}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}><PaintBrush size={20} weight="regular" /> {L('Videz dokumentov', 'Document appearance')}</h2>
        <p>{L('Velja za vse dokumente — ponudbe, pogodbe, račune in dolgoročne ponudbe.', 'Applies to all documents — proposals, contracts, invoices and retainers.')}</p>

        <div className={styles.logoRow}>
          <div className={styles.logoPredogled}>
            {logo
              /* eslint-disable-next-line @next/next/no-img-element -- data URL iz localStorage */
              ? <img src={logo} alt={L('Tvoj logotip', 'Your logo')} />
              : <span>{L('Ni logotipa', 'No logo')}</span>}
          </div>
          <div className={styles.logoAkcije}>
            <label className={styles.gumb}>
              {logo ? L('Zamenjaj logotip', 'Replace logo') : L('Naloži logotip', 'Upload logo')}
              <input ref={datoteka} type="file" accept="image/*" onChange={naloziLogo} hidden />
            </label>
            {logo && <button type="button" className={styles.gumbTih} onClick={odstraniLogo}>{L('Odstrani', 'Remove')}</button>}
            <small>{L('PNG ali SVG s prosojnim ozadjem, do 600 kB.', 'PNG or SVG with a transparent background, up to 600 kB.')}</small>
          </div>
        </div>

        {sporocilo && <p className={styles.opomba} role="status">{sporocilo}</p>}

        {nalozeno && <VidezDokumentov barva={barva} font={font} onBarva={setBarva} onFont={setFont} logo={logo} onLogo={setLogo} />}
      </section>

      <section className={styles.card} style={{ display: zavihek === 'dokumenti' ? undefined : 'none' }}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}><EnvelopeSimple size={20} weight="regular" /> {L('Podpis pošte', 'Email signature')}</h2>
        <p>{L('Samodejno se doda na dno vsakega novega sporočila iz projekta. Izpolni polja — Flow sestavi oblikovan podpis s ', 'Automatically added to the bottom of every new project message. Complete the fields and Flow will create a formatted signature with a ')}<b>{L('klikabilnim telefonom, e-pošto in spletom', 'clickable phone number, email and website')}</b>.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.7rem' }}>
          {([
            ['ime', L('Ime in priimek', 'Full name'), L('Ana Novak', 'Anna Smith')],
            ['funkcija', L('Funkcija / naziv', 'Role / title'), L('Direktorica', 'Director')],
            ['naziv', L('Podjetje', 'Company'), L('Studio d.o.o.', 'Studio Ltd.')],
            ['naslov', L('Naslov podjetja', 'Company address'), L('Ulica 1, 1000 Ljubljana', '1 High Street, London')],
            ['telefon', L('Telefon', 'Phone'), '+386 40 123 456'],
            ['email', L('E-pošta', 'Email'), L('ime@domena.si', 'name@domain.com')],
            ['splet', L('Spletna stran', 'Website'), L('domena.si', 'domain.com')],
          ] as const).map(([k, lbl, ph]) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', fontSize: '.8rem', color: '#4a4550', gridColumn: k === 'naslov' ? 'span 2' : undefined, gridColumnStart: k === 'telefon' ? 1 : undefined }}>
              {lbl}
              <input value={(podpisP[k] as string) || ''} onChange={e => nastaviPodpisPolje(k, e.target.value)} placeholder={ph} style={{ font: 'inherit', fontSize: '.9rem', color: '#111', padding: '.55rem .7rem', borderRadius: '.5rem', border: '1px solid rgba(17,17,17,.15)', background: '#fff' }} />
            </label>
          ))}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', fontSize: '.8rem', color: '#4a4550', marginTop: '.7rem' }}>
          {L('Zaključna vrstica (neobvezno)', 'Closing line (optional)')}
          <textarea value={podpisP.pripis || ''} onChange={e => nastaviPodpisPolje('pripis', e.target.value)} placeholder={L('Prosim, odgovorite na to sporočilo.', 'Please reply to this message.')} rows={2} style={{ font: 'inherit', fontSize: '.9rem', color: '#111', padding: '.55rem .7rem', borderRadius: '.5rem', border: '1px solid rgba(17,17,17,.15)', background: '#fff', resize: 'vertical', minHeight: '2.6rem' }} />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', marginTop: '.8rem', fontSize: '.88rem', fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!podpisP.logo} onChange={e => nastaviPodpisPolje('logo', e.target.checked)} /> {L('Vključi logo v podpis', 'Include logo in signature')}
        </label>

        <div style={{ marginTop: '.9rem' }}>
          <p style={{ margin: '0 0 .4rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8177' }}>{L('Povezave (socialna omrežja, portfelj, druge strani)', 'Links (social media, portfolio, other pages)')}</p>
          {(podpisP.povezave || []).map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={v.oznaka} onChange={e => posodobiPovezavo(i, 'oznaka', e.target.value)} placeholder={L('Oznaka (npr. Instagram)', 'Label (e.g. Instagram)')} style={{ font: 'inherit', fontSize: '.88rem', padding: '.45rem .6rem', borderRadius: '.5rem', border: '1px solid rgba(17,17,17,.15)', background: '#fff', width: '160px' }} />
              <input value={v.url} onChange={e => posodobiPovezavo(i, 'url', e.target.value)} placeholder={L('https://…', 'https://…')} style={{ font: 'inherit', fontSize: '.88rem', padding: '.45rem .6rem', borderRadius: '.5rem', border: '1px solid rgba(17,17,17,.15)', background: '#fff', flex: '1 1 180px' }} />
              <button type="button" onClick={() => odstraniPovezavo(i)} aria-label={L('Odstrani povezavo', 'Remove link')} style={{ border: 0, background: 'none', color: '#a44a3f', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          ))}
          <button type="button" onClick={dodajPovezavo} style={{ border: '1px dashed rgba(17,17,17,.25)', background: 'transparent', color: '#4a4550', fontSize: '.82rem', fontWeight: 600, padding: '.4rem .8rem', borderRadius: '.5rem', cursor: 'pointer' }}>{L('+ Dodaj povezavo', '+ Add link')}</button>
        </div>

        <div style={{ marginTop: '.9rem' }}>
          <p style={{ margin: '0 0 .4rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8177' }}>{L('Barva povezav in ikon', 'Link and icon colour')}</p>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {PODPIS_BARVE.map(b => (
              <button key={b} type="button" aria-label={b} onClick={() => nastaviPodpisPolje('barva', b)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: (podpisP.barva || '#1A73E8').toLowerCase() === b.toLowerCase() ? '2px solid #111' : '1px solid rgba(0,0,0,.15)', background: b, cursor: 'pointer', padding: 0 }} />
            ))}
            <label style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(0,0,0,.15)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', overflow: 'hidden' }} title={L('Poljubna barva', 'Custom colour')}>
              <input type="color" value={podpisP.barva || '#1A73E8'} onChange={e => nastaviPodpisPolje('barva', e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />+
            </label>
          </div>
        </div>

        <div style={{ marginTop: '.9rem' }}>
          <p style={{ margin: '0 0 .4rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8177' }}>{L('Oglasni banner (neobvezno · širina 600 px)', 'Promotional banner (optional · 600 px wide)')}</p>
          {podpisP.banner ? (
            <div>
              <img src={podpisP.banner} alt="" style={{ width: '100%', maxWidth: '600px', borderRadius: '8px', display: 'block', border: '1px solid rgba(0,0,0,.08)' }} />
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={podpisP.bannerLink || ''} onChange={e => nastaviPodpisPolje('bannerLink', e.target.value)} placeholder={L('Povezava (npr. mojastran.si)', 'Link (e.g. mysite.com)')} style={{ font: 'inherit', fontSize: '.88rem', padding: '.45rem .6rem', borderRadius: '.5rem', border: '1px solid rgba(17,17,17,.15)', background: '#fff', flex: '1 1 200px' }} />
                <button type="button" onClick={() => bannerRef.current?.click()} style={{ border: '1px solid rgba(17,17,17,.2)', background: '#fff', borderRadius: '.5rem', padding: '.4rem .8rem', fontSize: '.82rem', cursor: 'pointer' }}>{L('Zamenjaj', 'Replace')}</button>
                <button type="button" onClick={() => setPodpisP(prev => ({ ...prev, banner: '', bannerLink: '' }))} style={{ border: 0, background: 'none', color: '#a44a3f', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>{L('Odstrani', 'Remove')}</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => bannerRef.current?.click()} style={{ border: '1px dashed rgba(17,17,17,.25)', background: 'transparent', color: '#4a4550', fontSize: '.82rem', fontWeight: 600, padding: '.5rem 1rem', borderRadius: '.5rem', cursor: 'pointer' }}>{L('Naloži banner …', 'Upload banner …')}</button>
          )}
          <input ref={bannerRef} type="file" accept="image/*" hidden onChange={e => { naloziBanner(e.target.files?.[0]); e.currentTarget.value = ''; }} />
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem 1.1rem', borderRadius: '.7rem', border: '1px solid rgba(17,17,17,.1)', background: '#FCFBF7' }}>
          <p style={{ margin: '0 0 .6rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a8177' }}>{L('Predogled', 'Preview')}</p>
          {podpisPrazen(podpisP)
            ? <p style={{ margin: 0, fontSize: '.85rem', color: '#9a9088' }}>{L('Izpolni polja zgoraj za predogled podpisa.', 'Complete the fields above to preview your signature.')}</p>
            : <div dangerouslySetInnerHTML={{ __html: podpisHtml(podpisP, podpisP.logo ? aktivniLogo() : '') }} />}
        </div>
      </section>

      {/* KAM PO PRIJAVI — kdor Pupe ne uporablja, hoce pregled; kdor se z njo
          pogovarja, hoce njo. Nastavitev je vezana na napravo (glej lib/vstopnaStran):
          na telefonu je pogovor pogosto bolj uporaben kot tabela. */}
      <section className={styles.card} style={{ display: zavihek === 'ai' ? undefined : 'none' }}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}><Sparkle size={20} weight="fill" /> {L('Kam po prijavi', 'Where to go after signing in')}</h2>
        <p>{L('Ko se prijaviš, te Flow odloži na to stran. Velja za to napravo — na telefonu imaš lahko drugače kot na računalniku.', 'Flow opens this page after you sign in. This setting applies to this device — your phone can use a different page from your computer.')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginTop: '.6rem' }}>
          {([['domov', L('Domov', 'Home'), L('Pregled poslovanja — številke, projekti, roki.', 'Business overview — numbers, projects and deadlines.')],
             ['pupa', 'Pupa', L('Pogovor — poveš, kaj rabiš, in Pupa uredi.', 'Conversation — tell Pupa what you need and she will take care of it.')]] as const).map(([v, ime, opis]) => (
            <button key={v} type="button"
              onClick={() => { zapisiVstopnoStran(v); setVstopna(v); }}
              style={{
                flex: '1 1 14rem', textAlign: 'left', padding: '.75rem .9rem', borderRadius: '.85rem', cursor: 'pointer',
                border: vstopna === v ? '1.5px solid #6E4FA6' : '1px solid rgba(17,17,17,.14)',
                background: vstopna === v ? 'rgba(110,79,166,.06)' : '#fff',
              }}>
              <strong style={{ display: 'block', fontSize: '.9rem', color: vstopna === v ? '#4a2f70' : '#111' }}>{ime}</strong>
              <span style={{ fontSize: '.8rem', lineHeight: 1.45, color: '#6b6459' }}>{opis}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.card} style={{ display: zavihek === 'ai' ? undefined : 'none' }}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}><Sparkle size={20} weight="fill" /> {L('Pupa (AI pomočnica)', 'Pupa (AI assistant)')}</h2>
        <p>
          {L('Pupa svetuje pri cenah, pravicah in besedilu. Ko jo vprašaš, se podatki trenutne ponudbe pošljejo AI ponudniku (Anthropic) samo zato, da ti odgovori — ne uporabijo se za učenje modela. Kadar koli jo lahko izklopiš.', 'Pupa advises on prices, rights and copy. When you ask her a question, data from the current proposal is sent to the AI provider (Anthropic) only so she can respond — it is not used to train the model. You can turn her off at any time.')}
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.6rem' }}>
          <button
            type="button"
            role="switch"
            aria-checked={pupaVklop}
            aria-label={pupaVklop ? L('Izklopi Pupo', 'Turn Pupa off') : L('Vklopi Pupo', 'Turn Pupa on')}
            onClick={() => preklopiPupo(!pupaVklop)}
            style={{ position: 'relative', width: '2.6rem', height: '1.5rem', flex: '0 0 auto', padding: 0, border: 0, borderRadius: '999px', cursor: 'pointer', background: pupaVklop ? 'var(--accent, oklch(66% .2 297))' : 'color-mix(in oklch, var(--ink) 25%, transparent)', transition: 'background .18s' }}
          >
            <span style={{ position: 'absolute', top: '50%', left: pupaVklop ? 'calc(100% - 1.3rem)' : '.2rem', transform: 'translateY(-50%)', width: '1.1rem', height: '1.1rem', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.28)', transition: 'left .18s' }} />
          </button>
          <span style={{ fontWeight: 600, fontSize: '.92rem' }}>{pupaVklop ? L('Pupa je vklopljena', 'Pupa is on') : L('Pupa je izklopljena', 'Pupa is off')}</span>
        </div>
      </section>

      {/* Obrazec za povprasevanje: vgradnja na TUJO spletno stran, zato sodi med
          dokumente in orodja, ne med AI — je lead-gen, ne pomocnik. */}
      <section className={styles.card} style={{ display: zavihek === 'dokumenti' ? undefined : 'none' }}>
        <PovprasevanjeVgradnja />
      </section>
      <section className={styles.card} style={{ display: zavihek === 'dokumenti' ? undefined : 'none' }}><PriporociFlow base={base} /></section>

      <section className={styles.card} style={{ display: zavihek === 'ai' ? undefined : 'none' }}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}><PlugsConnected size={20} weight="regular" /> {L('Moj AI', 'My AI')}</h2>
        <p>
          {L('Poveži svoj račun pri AI ponudniku. To ni naročnina — uporabiš svoj ključ in porabo plačuješ svojemu ponudniku.', 'Connect your own AI provider account. Not a subscription — you use your own key and pay usage to your provider.')}
        </p>
        <MojAiPovezave base={base} />
      </section>

      {/* "Pomoč in kontakt" odstranjen: Pomoč je zdaj svoja stran v meniju,
          tukaj je bila podvojena. */}
      {/* "Izbriši vse podatke" je premaknjen v "Moj profil" (ProfileWorkspace). */}
    </div>
  );
}
