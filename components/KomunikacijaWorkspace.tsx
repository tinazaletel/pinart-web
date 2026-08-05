'use client';

/* Komunikacija — vpogled »klepeti deljeni z mano«. Deluje za KATEREGA KOLI
   prijavljenega uporabnika (tudi povabljenega sodelavca), ker bere niti prek RLS
   (mojeNiti). Levi stolpec = seznam niti; desni = klepet (bubbli + vnos + realtime).
   To je vstopna tocka, ki je manjkala, da sodelavec odpre skupno nit s svoje strani. */

import { useEffect, useRef, useState } from 'react';
import { PaperPlaneRight, ChatsCircle, Paperclip, EnvelopeSimple, ChatCircle, MagnifyingGlass, Tray, NotePencil, Trash } from '@phosphor-icons/react';
import { mojeNiti, mojEmail, nalozSporocila, posljiSporocilo, narociSporocila, type OblacnaNit, type OblacnoSporocilo } from '@/lib/klepetCloud';
import { usePredogled } from '@/lib/predogled';
import { preberiVsePoste, type PostaVnos } from '@/lib/postaDnevnik';

/* Demo pošta (»polno poslovanje«) — projektni maili na enem mestu, brez šuma. */
const DEMO_POSTA: PostaVnos[] = [
  { id: 'dp1', projectId: 'demo-portal', smer: 'prejeto', prejemniki: ['info@rokusklett.si'], zadeva: 'Re: Prenova portala — potrditev obsega', datum: '2026-08-04T08:40:00Z', telo: 'Pozdravljeni,\n\nhvala za predlog. Obseg nam ustreza, lahko nadaljujete. Veselimo se sodelovanja.\n\nLep pozdrav,\nRokus Klett' },
  { id: 'dp2', projectId: 'demo-portal', smer: 'poslano', prejemniki: ['info@rokusklett.si'], zadeva: 'Prenova portala — osnutek za pregled', datum: '2026-08-02T12:10:00Z', telo: 'Pozdravljeni,\n\nv prilogi je prvi osnutek. Prosim za komentarje do konca tedna.\n\nLep pozdrav' },
  { id: 'dp3', projectId: 'demo-portal', smer: 'poslano', prejemniki: ['ana@rokusklett.si', 'racuni@rokusklett.si'], zadeva: 'Pogodba o sodelovanju', datum: '2026-07-27T09:00:00Z', telo: 'Pozdravljeni,\n\nv prilogi pošiljam pogodbo v pregled in podpis.\n\nLep pozdrav' },
  { id: 'dp4', projectId: 'demo-portal', smer: 'prejeto', prejemniki: ['ana@rokusklett.si'], zadeva: 'Gradiva in dostopi', datum: '2026-07-25T15:30:00Z', telo: 'Pozdravljeni,\n\npošiljam dostope do mape z gradivi in obstoječimi datotekami.\n\nLep pozdrav' },
];

/* Demo klepeti za način »polno poslovanje« (predogled) — da vidiš, kako izgleda polno. */
const DEMO_EMAIL = 'tina@pinart.si';
const DEMO_NITI: OblacnaNit[] = [
  { threadId: 'demo-k-1', projectId: 'demo-portal', udelezenci: [{ email: DEMO_EMAIL, ime: 'Tina' }, { email: 'luka.mancini@gmail.com', ime: 'Luka Beg' }] },
  { threadId: 'demo-k-2', projectId: 'demo-portal', udelezenci: [{ email: DEMO_EMAIL, ime: 'Tina' }, { email: 'eva.kralj@studio.si', ime: 'Eva Kralj' }, { email: 'marko.zupan@studio.si', ime: 'Marko Zupan' }] },
];
const DEMO_SPOROCILA: Record<string, OblacnoSporocilo[]> = {
  'demo-k-1': [
    { id: 'd1', threadId: 'demo-k-1', body: 'Živjo Luka, ti delim mail stranke — poglej obseg.', senderEmail: DEMO_EMAIL, senderName: 'Tina', odMaila: 'Re: Prenova portala — potrditev obsega', createdAt: '2026-08-04T09:12:00Z' },
    { id: 'd2', threadId: 'demo-k-1', body: 'Super, obseg je jasen. Jaz prevzamem wireframe ključnih strani.', senderEmail: 'luka.mancini@gmail.com', senderName: 'Luka Beg', createdAt: '2026-08-04T09:20:00Z' },
    { id: 'd3', threadId: 'demo-k-1', body: 'Odlično. Do srede rabim prvi osnutek navigacije. 🙌', senderEmail: DEMO_EMAIL, senderName: 'Tina', createdAt: '2026-08-04T09:22:00Z' },
    { id: 'd4', threadId: 'demo-k-1', body: 'Velja. Bom sproti torku poslal Figmo.', senderEmail: 'luka.mancini@gmail.com', senderName: 'Luka Beg', createdAt: '2026-08-04T09:25:00Z' },
  ],
  'demo-k-2': [
    { id: 'd5', threadId: 'demo-k-2', body: 'Ekipa, dostopi do gradiv so v Drive mapi. Eva, ti prevzameš tipografijo?', senderEmail: DEMO_EMAIL, senderName: 'Tina', createdAt: '2026-08-05T11:02:00Z' },
    { id: 'd6', threadId: 'demo-k-2', body: 'Ja, začnem danes. Marko, rabim tvoje ikone za sistem.', senderEmail: 'eva.kralj@studio.si', senderName: 'Eva Kralj', createdAt: '2026-08-05T11:10:00Z' },
    { id: 'd7', threadId: 'demo-k-2', body: 'Pošljem set do jutri zjutraj.', senderEmail: 'marko.zupan@studio.si', senderName: 'Marko Zupan', createdAt: '2026-08-05T11:14:00Z' },
  ],
};

export default function KomunikacijaWorkspace({ jeEn = false }: { jeEn?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [nacin] = usePredogled();
  const demo = nacin !== 'mine';
  const [email, setEmail] = useState<string | null>(null);
  const [niti, setNiti] = useState<OblacnaNit[]>([]);
  const [izbrana, setIzbrana] = useState<string | null>(null);
  const [sporocila, setSporocila] = useState<OblacnoSporocilo[]>([]);
  const [vnos, setVnos] = useState('');
  const [nalaganje, setNalaganje] = useState(true);
  const [zavihek, setZavihek] = useState<'klepet' | 'posta'>('posta');
  const [posta, setPosta] = useState<PostaVnos[]>([]);
  const [mapa, setMapa] = useState<'prejeto' | 'poslano' | 'osnutki' | 'kos'>('prejeto');
  const [postaIsk, setPostaIsk] = useState('');
  const [beriMail, setBeriMail] = useState<PostaVnos | null>(null);
  const [postaStran, setPostaStran] = useState(1);
  useEffect(() => {
    const vsi = demo ? DEMO_POSTA : preberiVsePoste();
    setPosta([...vsi].sort((a, b) => b.datum.localeCompare(a.datum)));
  }, [demo]);
  const odjavaRef = useRef<(() => void) | null>(null);
  const dnoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (demo) { setEmail(DEMO_EMAIL); setNiti(DEMO_NITI); setIzbrana(DEMO_NITI[0].threadId); setNalaganje(false); return; }
    let ustavljeno = false;
    void (async () => {
      const [e, n] = await Promise.all([mojEmail(), mojeNiti()]);
      if (ustavljeno) return;
      setEmail(e);
      setNiti(n);
      if (n[0]) setIzbrana(n[0].threadId);
      setNalaganje(false);
    })();
    return () => { ustavljeno = true; };
  }, [demo]);

  useEffect(() => {
    odjavaRef.current?.(); odjavaRef.current = null;
    if (!izbrana) { setSporocila([]); return; }
    if (demo) { setSporocila(DEMO_SPOROCILA[izbrana] || []); return; }
    let ustavljeno = false;
    void (async () => {
      const msgs = await nalozSporocila(izbrana);
      if (!ustavljeno) setSporocila(msgs);
    })();
    odjavaRef.current = narociSporocila(izbrana, m => setSporocila(prev => (prev.some(p => p.id === m.id) ? prev : [...prev, m])));
    return () => { ustavljeno = true; odjavaRef.current?.(); odjavaRef.current = null; };
  }, [izbrana, demo]);

  useEffect(() => { dnoRef.current?.scrollIntoView({ block: 'end' }); }, [sporocila]);

  const poslji = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = vnos.trim();
    if (!t || !izbrana) return;
    setVnos('');
    if (demo) {
      setSporocila(prev => [...prev, { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `d-${prev.length}`), threadId: izbrana, body: t, senderEmail: DEMO_EMAIL, senderName: 'Tina', createdAt: new Date().toISOString() }]);
      return;
    }
    await posljiSporocilo(izbrana, t);
  };

  const drugi = (n: OblacnaNit) => n.udelezenci.filter(u => u.email !== (email || '')).map(u => u.ime || u.email);
  const nazivNiti = (n: OblacnaNit) => { const d = drugi(n); return d.length ? d.join(', ') : L('Klepet', 'Chat'); };
  const iniciala = (s: string) => (s || '?').trim().charAt(0).toUpperCase();
  const datum = (iso: string) => { try { return new Date(iso).toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI'); } catch { return ''; } };
  const izbranaNit = niti.find(n => n.threadId === izbrana) || null;

  return (
    <div className="km">
      <header className="km-glava">
        <p className="km-eyebrow">{L('Komunikacija', 'Communication')}</p>
        <h1>{L('Vsa komunikacija na enem mestu.', 'All communication in one place.')}</h1>
        <p className="km-uvod">{L('Klepeti s sodelavci in projektni maili — brez brskanja po projektih in brez šuma.', 'Team chats and project mail — no digging through projects, no noise.')}</p>
      </header>

      <div className="km-zavihki" role="tablist">
        <button type="button" role="tab" aria-selected={zavihek === 'posta'} className={zavihek === 'posta' ? 'on' : ''} onClick={() => setZavihek('posta')}><EnvelopeSimple size={15} weight="bold" /> {L('Pošta', 'Mail')}{posta.length ? ` · ${posta.length}` : ''}</button>
        <button type="button" role="tab" aria-selected={zavihek === 'klepet'} className={zavihek === 'klepet' ? 'on' : ''} onClick={() => setZavihek('klepet')}><ChatCircle size={15} weight="bold" /> {L('Klepet', 'Chat')}</button>
      </div>

      {zavihek === 'posta' ? (
        <div className="km-posta-ovoj">
          <div className="km-posta-glava">
            <div className="km-iskalnik"><MagnifyingGlass size={15} weight="bold" /><input value={postaIsk} onChange={e => { setPostaIsk(e.target.value); setPostaStran(1); }} placeholder={L('Išči po pošti …', 'Search mail …')} aria-label={L('Išči', 'Search')} /></div>
            <div className="km-mape">
              {([{ id: 'prejeto', ime: L('Prejeto', 'Inbox'), I: Tray }, { id: 'poslano', ime: L('Poslano', 'Sent'), I: PaperPlaneRight }, { id: 'osnutki', ime: L('Osnutki', 'Drafts'), I: NotePencil }, { id: 'kos', ime: L('Koš', 'Trash'), I: Trash }] as const).map(({ id, ime, I }) => {
                const st = posta.filter(v => (v.izbrisano ? 'kos' : v.osnutek ? 'osnutki' : v.smer === 'poslano' ? 'poslano' : 'prejeto') === id).length;
                return <button type="button" key={id} className={mapa === id ? 'on' : ''} onClick={() => { setMapa(id); setPostaStran(1); setBeriMail(null); }}><I size={15} weight={mapa === id ? 'fill' : 'regular'} /> {ime}{st ? <b>{st}</b> : null}</button>;
              })}
            </div>
          </div>
          {beriMail ? (
            <div className="km-branje">
              <button type="button" className="km-nazaj" onClick={() => setBeriMail(null)}>← {L('Nazaj', 'Back')}</button>
              <div className="km-branje-glava"><b>{beriMail.zadeva || L('(brez zadeve)', '(no subject)')}</b><small>{beriMail.prejemniki.join(', ')} · {datum(beriMail.datum)} · {beriMail.smer === 'poslano' ? L('Poslano', 'Sent') : L('Prejeto', 'Received')}</small></div>
              <div className="km-branje-telo">{(beriMail.telo || beriMail.povzetek || L('(brez besedila)', '(no text)')).replace(/<[^>]+>/g, ' ')}</div>
              <p className="km-branje-op">{L('Odgovori, posreduj, premakni in V nalogo pridejo z enotnim mail-klijentom (kmalu).', 'Reply, forward, move and Add-to-task arrive with the unified mail client (soon).')}</p>
            </div>
          ) : (() => {
            const q = postaIsk.trim().toLowerCase();
            const seznam = posta.filter(v => (v.izbrisano ? 'kos' : v.osnutek ? 'osnutki' : v.smer === 'poslano' ? 'poslano' : 'prejeto') === mapa).filter(v => !q || `${v.zadeva} ${v.prejemniki.join(' ')}`.toLowerCase().includes(q));
            const NA = 12; const strani = Math.max(1, Math.ceil(seznam.length / NA)); const stran = Math.min(Math.max(1, postaStran), strani); const prikaz = seznam.slice((stran - 1) * NA, stran * NA);
            return seznam.length ? (<>
              <div className="km-posta">
                {prikaz.map(v => (
                  <button type="button" key={v.id} className="km-mail-vrsta km-mail-btn" onClick={() => setBeriMail(v)}>
                    <span className="km-av sm" aria-hidden>{iniciala(v.prejemniki[0] || '?')}</span>
                    <span className="km-mail-info"><b>{v.prejemniki.join(', ') || '—'}</b><span className="km-mail-zad">{v.zadeva || L('(brez zadeve)', '(no subject)')}</span></span>
                    <span className="km-mail-meta">{datum(v.datum)}<span className="km-mail-kazalec" aria-hidden>›</span></span>
                  </button>
                ))}
              </div>
              {strani > 1 && (
                <nav className="km-strani" aria-label={L('Strani', 'Pages')}>
                  <button type="button" disabled={stran <= 1} onClick={() => setPostaStran(stran - 1)} aria-label={L('Prejšnja', 'Previous')}>‹</button>
                  {Array.from({ length: strani }, (_, i) => i + 1).map(s => <button type="button" key={s} className={s === stran ? 'on' : ''} aria-current={s === stran ? 'page' : undefined} onClick={() => setPostaStran(s)}>{s}</button>)}
                  <button type="button" disabled={stran >= strani} onClick={() => setPostaStran(stran + 1)} aria-label={L('Naslednja', 'Next')}>›</button>
                </nav>
              )}
            </>) : <div className="km-prazno-box"><EnvelopeSimple size={30} weight="light" /><b>{L('Prazno', 'Empty')}</b><p>{mapa === 'prejeto' ? L('Ni prejete pošte v tej mapi.', 'No received mail in this folder.') : mapa === 'poslano' ? L('Ni poslane pošte.', 'No sent mail.') : mapa === 'osnutki' ? L('Ni osnutkov.', 'No drafts.') : L('Koš je prazen.', 'Trash is empty.')}</p></div>;
          })()}
        </div>
      ) : nalaganje ? (
        <p className="km-prazno">{L('Nalagam …', 'Loading …')}</p>
      ) : !niti.length ? (
        <div className="km-prazno-box">
          <ChatsCircle size={34} weight="light" />
          <b>{L('Še ni klepetov', 'No chats yet')}</b>
          <p>{L('Ko sodelavec deli mail ali ti napiše na projektu, se pogovor pojavi tukaj. Če nisi prijavljen, se najprej prijavi.', 'When a collaborator shares a mail or messages you on a project, the conversation appears here. If you are not signed in, sign in first.')}</p>
        </div>
      ) : (
        <div className="km-mreza">
          <aside className="km-seznam" aria-label={L('Seznam klepetov', 'Chat list')}>
            {niti.map(n => (
              <button type="button" key={n.threadId} className={`km-nit${izbrana === n.threadId ? ' on' : ''}`} onClick={() => setIzbrana(n.threadId)}>
                <span className="km-av" aria-hidden>{iniciala(nazivNiti(n))}</span>
                <span className="km-nit-txt"><b>{nazivNiti(n)}</b><small>{n.udelezenci.length} {L('udeležencev', 'participants')}</small></span>
              </button>
            ))}
          </aside>
          <section className="km-klepet" aria-label={L('Klepet', 'Chat')}>
            {izbranaNit && <div className="km-klepet-glava"><span className="km-av" aria-hidden>{iniciala(nazivNiti(izbranaNit))}</span><b>{nazivNiti(izbranaNit)}</b></div>}
            <div className="km-tok">
              {sporocila.length ? sporocila.map(m => m.odMaila ? (
                <div key={m.id} className={`km-pri${m.senderEmail === (email || '') ? ' jaz' : ''}`}>
                  <div className="km-pri-glava"><Paperclip size={12} weight="bold" /> {L('Deljen mail', 'Shared mail')}</div>
                  <div className="km-pri-zad">{m.odMaila}</div>
                  <div className="km-pri-telo">{m.body}</div>
                </div>
              ) : (
                <div key={m.id} className={`km-b${m.senderEmail === (email || '') ? ' jaz' : ''}`}>{m.senderEmail !== (email || '') && <span className="km-b-kdo">{m.senderName || m.senderEmail}</span>}{m.body}</div>
              )) : <p className="km-prazno">{L('Ni sporočil. Napiši prvo.', 'No messages. Write the first one.')}</p>}
              <div ref={dnoRef} />
            </div>
            <form className="km-vnos" onSubmit={poslji}>
              <input value={vnos} onChange={e => setVnos(e.target.value)} placeholder={L('Napiši sporočilo …', 'Write a message …')} aria-label={L('Sporočilo', 'Message')} disabled={!izbrana} />
              <button type="submit" className="km-poslji" disabled={!vnos.trim() || !izbrana} aria-label={L('Pošlji', 'Send')}><PaperPlaneRight size={16} weight="fill" /></button>
            </form>
          </section>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .km{--k-ink:var(--ink,oklch(19% .014 55));--k-line:var(--line,oklch(93% .007 82));--k-purple:var(--purple,oklch(66% .2 297));max-width:1180px;margin:0 auto;padding:.2rem 1.2rem 1.4rem}
        .km-eyebrow{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,var(--k-purple));margin:0 0 .3rem}
        .km-glava h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(1.7rem,3.4vw,2.4rem);line-height:1;letter-spacing:-.012em;margin:0 0 .6rem;color:var(--k-ink)}
        .km-uvod{font-size:1rem;line-height:1.55;color:rgba(17,17,17,.72);margin:0 0 2rem;max-width:38rem}
        .km-prazno{color:color-mix(in oklch,var(--k-ink) 50%,transparent);font:500 .9rem var(--font-sans),sans-serif}
        .km-prazno-box{display:flex;flex-direction:column;align-items:center;gap:.5rem;text-align:center;padding:3rem 1rem;color:color-mix(in oklch,var(--k-ink) 55%,transparent)}
        .km-prazno-box b{font:700 1.05rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-prazno-box p{max-width:34ch;font:500 .85rem var(--font-sans),sans-serif;line-height:1.5}
        .km-mreza{display:grid;grid-template-columns:18rem 1fr;gap:1rem;height:min(72vh,640px)}
        .km-seznam{overflow-y:auto;display:flex;flex-direction:column;gap:.3rem;background:#fff;border:1px solid var(--k-line);border-radius:1rem;padding:.5rem}
        .km-nit{display:flex;align-items:center;gap:.6rem;width:100%;text-align:left;border:0;background:none;border-radius:.7rem;padding:.6rem .7rem;cursor:pointer}
        .km-nit:hover{background:color-mix(in oklch,var(--k-purple) 7%,transparent)}
        .km-nit.on{background:color-mix(in oklch,var(--k-purple) 12%,transparent)}
        .km-nit-txt{min-width:0}
        .km-nit-txt b{display:block;font:700 .86rem var(--font-sans),sans-serif;color:var(--k-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .km-nit-txt small{font:500 .7rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 48%,transparent)}
        .km-av{flex:none;width:2.1rem;height:2.1rem;border-radius:50%;display:grid;place-items:center;background:linear-gradient(140deg,oklch(72% .13 297),oklch(62% .2 297));color:#fff;font:700 .82rem var(--font-sans),sans-serif}
        .km-av.sm{width:1.9rem;height:1.9rem;font-size:.76rem}
        .km-zavihki{display:inline-flex;gap:.3rem;margin:0 0 1.1rem;padding:.25rem;background:#fff;border:1px solid var(--k-line);border-radius:999px}
        .km-zavihki button{display:inline-flex;align-items:center;gap:.4rem;border:0;background:none;border-radius:999px;padding:.5rem 1.1rem;font:700 .78rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 60%,transparent);cursor:pointer}
        .km-zavihki button.on{background:var(--k-ink,#2a2620);color:#fff}
        .km-posta{display:flex;flex-direction:column;gap:.4rem;max-width:52rem}
        .km-mail-vrsta{background:#fff;border:1px solid var(--k-line);border-radius:.85rem;overflow:hidden}
        .km-mail{display:flex;align-items:center;gap:.7rem;width:100%;text-align:left;border:0;background:none;padding:.75rem .9rem;cursor:pointer}
        .km-mail:hover{background:color-mix(in oklch,var(--k-purple) 5%,transparent)}
        .km-mail-info{flex:1;min-width:0;display:flex;flex-direction:column}
        .km-mail-info b{font:700 .86rem var(--font-sans),sans-serif;color:var(--k-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .km-mail-zad{font:500 .8rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 62%,transparent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .km-mail-meta{flex:none;display:flex;align-items:center;gap:.55rem;font:600 .72rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 48%,transparent);white-space:nowrap}
        .km-mail-smer{font:700 .58rem var(--font-sans),sans-serif;letter-spacing:.05em;text-transform:uppercase;padding:.15rem .45rem;border-radius:999px;color:color-mix(in oklch,var(--k-ink) 55%,transparent);background:color-mix(in oklch,var(--k-ink) 7%,transparent)}
        .km-mail-smer.prejeto{color:oklch(48% .13 160);background:color-mix(in oklch,oklch(62% .16 160) 15%,transparent)}
        .km-mail-telo{padding:.2rem 1rem 1rem 3.6rem;font:500 .84rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 80%,transparent);line-height:1.55;white-space:pre-wrap}
        .km-posta-ovoj{max-width:52rem}
        .km-posta-glava{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin-bottom:.9rem}
        .km-iskalnik{flex:1 1 16rem;display:flex;align-items:center;gap:.5rem;background:#fff;border:1px solid var(--k-line);border-radius:999px;padding:.5rem .9rem;color:color-mix(in oklch,var(--k-ink) 55%,transparent)}
        .km-iskalnik input{flex:1;min-width:0;border:0;background:none;outline:none;font:500 .85rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-mape{display:flex;gap:.3rem;flex-wrap:wrap}
        .km-mape button{display:inline-flex;align-items:center;gap:.35rem;border:1px solid var(--k-line);background:#fff;border-radius:999px;padding:.45rem .8rem;font:700 .74rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 60%,transparent);cursor:pointer}
        .km-mape button.on{background:var(--k-ink,#2a2620);color:#fff;border-color:transparent}
        .km-mape button b{font-size:.66rem;opacity:.7}
        .km-mail-btn{width:100%;text-align:left;border:1px solid var(--k-line);cursor:pointer}
        .km-mail-btn:hover{background:color-mix(in oklch,var(--k-purple) 5%,transparent)}
        .km-mail-kazalec{margin-left:.5rem;opacity:.4}
        .km-branje{max-width:52rem;background:#fff;border:1px solid var(--k-line);border-radius:1rem;padding:1.2rem 1.3rem}
        .km-nazaj{display:inline-flex;align-items:center;border:1px solid var(--k-line);background:#fff;border-radius:999px;padding:.4rem .9rem;font:700 .74rem var(--font-sans),sans-serif;color:var(--k-ink);cursor:pointer;margin-bottom:.8rem}
        .km-nazaj:hover{background:var(--k-ink,#2a2620);color:#fff;border-color:transparent}
        .km-branje-glava b{display:block;font:700 1rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-branje-glava small{display:block;margin-top:.2rem;font:500 .74rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 50%,transparent)}
        .km-branje-telo{margin-top:.8rem;font:500 .88rem var(--font-sans),sans-serif;color:var(--k-ink);line-height:1.6;white-space:pre-wrap}
        .km-branje-op{margin-top:1rem;padding-top:.8rem;border-top:1px solid var(--k-line);font:500 .74rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 45%,transparent)}
        .km-strani{display:flex;justify-content:center;align-items:center;gap:.3rem;margin:1rem 0 .2rem}
        .km-strani button{min-width:1.9rem;height:1.9rem;padding:0 .5rem;border:1px solid var(--k-line);border-radius:.5rem;background:#fff;color:var(--k-ink);font:600 .74rem var(--font-sans),sans-serif;cursor:pointer}
        .km-strani button:hover:not(:disabled){background:color-mix(in oklch,var(--k-purple) 6%,transparent)}
        .km-strani button:disabled{opacity:.4;cursor:default}
        .km-strani button.on{background:var(--k-ink,#2a2620);color:#fff;border-color:transparent}
        .km-klepet{display:flex;flex-direction:column;min-height:0;background:#fff;border:1px solid var(--k-line);border-radius:1rem;overflow:hidden}
        .km-klepet-glava{flex:none;display:flex;align-items:center;gap:.6rem;padding:1rem 1.1rem;border-bottom:1px solid var(--k-line);font:700 .95rem var(--font-sans),sans-serif;color:var(--k-ink)}
        .km-tok{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:.5rem;padding:1.1rem}
        .km-b{max-width:78%;align-self:flex-start;padding:.5rem .8rem;border-radius:1.05rem;background:oklch(95% .008 87);color:var(--k-ink);font:500 .88rem var(--font-sans),sans-serif;line-height:1.45;white-space:pre-wrap;word-break:break-word}
        .km-b.jaz{align-self:flex-end;background:var(--k-purple);color:#fff}
        .km-b-kdo{display:block;font:700 .66rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 55%,transparent);margin-bottom:.15rem}
        .km-pri{align-self:flex-start;max-width:86%;background:#fff;border:1px solid color-mix(in oklch,var(--k-ink) 12%,transparent);border-left:3px solid var(--k-purple);border-radius:.7rem;padding:.5rem .7rem}
        .km-pri.jaz{align-self:flex-end}
        .km-pri-glava{display:inline-flex;align-items:center;gap:.3rem;font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--k-purple)}
        .km-pri-zad{font:700 .84rem var(--font-sans),sans-serif;color:var(--k-ink);margin:.15rem 0}
        .km-pri-telo{font:500 .82rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 78%,transparent);line-height:1.45;white-space:pre-wrap;word-break:break-word}
        .km-vnos{flex:none;display:flex;align-items:center;gap:.5rem;padding:.75rem .9rem;border-top:1px solid var(--k-line)}
        .km-vnos input{flex:1;min-width:0;border:1px solid color-mix(in oklch,var(--k-ink) 10%,transparent);border-radius:999px;padding:.65rem 1rem;font:500 .88rem var(--font-sans),sans-serif;color:var(--k-ink);background:#fff}
        .km-vnos input:focus{outline:none;border-color:var(--k-purple)}
        .km-poslji{flex:none;display:grid;place-items:center;width:2.5rem;height:2.5rem;border:0;border-radius:50%;background:var(--k-purple);color:#fff;cursor:pointer}
        .km-poslji:disabled{opacity:.4;cursor:default}
        @media (max-width:760px){.km-mreza{grid-template-columns:1fr;height:auto}.km-seznam{max-height:14rem}.km-klepet{height:60vh}}
      ` }} />
    </div>
  );
}
