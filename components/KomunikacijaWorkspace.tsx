'use client';

/* Komunikacija — vpogled »klepeti deljeni z mano«. Deluje za KATEREGA KOLI
   prijavljenega uporabnika (tudi povabljenega sodelavca), ker bere niti prek RLS
   (mojeNiti). Levi stolpec = seznam niti; desni = klepet (bubbli + vnos + realtime).
   To je vstopna tocka, ki je manjkala, da sodelavec odpre skupno nit s svoje strani. */

import { useEffect, useRef, useState } from 'react';
import { PaperPlaneRight, ChatsCircle, Paperclip } from '@phosphor-icons/react';
import { mojeNiti, mojEmail, nalozSporocila, posljiSporocilo, narociSporocila, type OblacnaNit, type OblacnoSporocilo } from '@/lib/klepetCloud';

export default function KomunikacijaWorkspace({ jeEn = false }: { jeEn?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [email, setEmail] = useState<string | null>(null);
  const [niti, setNiti] = useState<OblacnaNit[]>([]);
  const [izbrana, setIzbrana] = useState<string | null>(null);
  const [sporocila, setSporocila] = useState<OblacnoSporocilo[]>([]);
  const [vnos, setVnos] = useState('');
  const [nalaganje, setNalaganje] = useState(true);
  const odjavaRef = useRef<(() => void) | null>(null);
  const dnoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    odjavaRef.current?.(); odjavaRef.current = null;
    if (!izbrana) { setSporocila([]); return; }
    let ustavljeno = false;
    void (async () => {
      const msgs = await nalozSporocila(izbrana);
      if (!ustavljeno) setSporocila(msgs);
    })();
    odjavaRef.current = narociSporocila(izbrana, m => setSporocila(prev => (prev.some(p => p.id === m.id) ? prev : [...prev, m])));
    return () => { ustavljeno = true; odjavaRef.current?.(); odjavaRef.current = null; };
  }, [izbrana]);

  useEffect(() => { dnoRef.current?.scrollIntoView({ block: 'end' }); }, [sporocila]);

  const poslji = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = vnos.trim();
    if (!t || !izbrana) return;
    setVnos('');
    await posljiSporocilo(izbrana, t);
  };

  const drugi = (n: OblacnaNit) => n.udelezenci.filter(u => u.email !== (email || '')).map(u => u.ime || u.email);
  const nazivNiti = (n: OblacnaNit) => { const d = drugi(n); return d.length ? d.join(', ') : L('Klepet', 'Chat'); };
  const iniciala = (s: string) => (s || '?').trim().charAt(0).toUpperCase();
  const izbranaNit = niti.find(n => n.threadId === izbrana) || null;

  return (
    <div className="km">
      <header className="km-glava">
        <p className="km-eyebrow"><ChatsCircle size={14} weight="fill" style={{ verticalAlign: '-2px', marginRight: '.35rem' }} />{L('KOMUNIKACIJA', 'COMMUNICATION')}</p>
        <h1>{L('Klepeti v skupni rabi', 'Shared chats')}</h1>
        <p className="km-uvod">{L('Pogovori, ki jih deliš s sodelavci. Odpri nit in klepetaj v živo.', 'Conversations shared with collaborators. Open a thread and chat live.')}</p>
      </header>

      {nalaganje ? (
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
        .km{--k-ink:var(--ink,oklch(19% .014 55));--k-line:var(--line,oklch(93% .007 82));--k-purple:var(--purple,oklch(66% .2 297));max-width:1180px;margin:0 auto;padding:1.4rem 1.2rem}
        .km-eyebrow{margin:0 0 .3rem;font:700 .66rem var(--font-sans),sans-serif;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in oklch,var(--k-ink) 55%,transparent)}
        .km-glava h1{margin:.1rem 0 .3rem;font:500 clamp(1.6rem,3vw,2.2rem) var(--font-serif),Georgia,serif;color:var(--k-ink)}
        .km-uvod{margin:0 0 1.2rem;font:500 .9rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--k-ink) 60%,transparent);line-height:1.5}
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
