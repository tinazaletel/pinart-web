'use client';

/* NAPIŠI POSLOVNI CANVAS — tretje Pupino opravilo (po briefu in pitchu).
 *
 * Vzorec je isti: poveš po domače, kaj delaš, model vrne JSON, ti pregledaš in
 * shraniš. Razlika je v tem, KATERA vprašanja se postavijo — canvas ni prosto
 * besedilo, ampak devet polj, ki jih mora znati zapolniti nekdo, ki pozna posel.
 *
 * Prav to je Pupina prednost: uporabnik ne ve, kaj naj vpraša ChatGPT, da dobi
 * uporaben poslovni model. Tu tega ni treba vedeti.
 */

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { EMPTY_BUSINESS_CANVAS, saveLocalCanvas, saveCloudCanvas, type BusinessCanvas } from '@/lib/pinartCanvas';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

const POLJA: [keyof BusinessCanvas, string, string][] = [
  ['segments', 'Ciljne stranke', 'Komu ustvarjaš največ vrednosti?'],
  ['value', 'Vrednost za stranko', 'Zakaj bi stranka izbrala prav tebe?'],
  ['channels', 'Kanali', 'Kje te stranke odkrijejo in kupijo?'],
  ['relationships', 'Odnosi s strankami', 'Kako jih pridobiš, vodiš in obdržiš?'],
  ['revenue', 'Prihodki', 'Za kaj ti stranke dejansko plačajo?'],
  ['resources', 'Ključni viri', 'Kaj potrebuješ za izvedbo?'],
  ['activities', 'Ključne aktivnosti', 'Kaj moraš redno delati, da posel deluje?'],
  ['partners', 'Ključni partnerji', 'Brez koga ne gre?'],
  ['costs', 'Stroški', 'Kateri stroški nastajajo, tudi ko ne prodajaš?'],
];

const NAVODILO = `Si izkušen poslovni svetovalec. Iz opisa sestavi POSLOVNI MODEL CANVAS.
Odgovori IZKLJUČNO z JSON objektom, brez uvoda in brez oznak za kodo:
{"segments":"…","value":"…","channels":"…","relationships":"…","revenue":"…","resources":"…","activities":"…","partners":"…","costs":"…"}
Pravila: piši v slovenščini, vsako polje 1–3 kratke povedi ali naštevanje.
Bodi konkreten in oprt na to, kar je uporabnik povedal. Ne izmišljaj si številk, imen partnerjev ali dosežkov.
Če česa iz opisa ni mogoče sklepati, napiši smiselno domnevo in jo zapiši previdno ("verjetno", "za začetek").`;

function izlusciJson(besedilo: string): Partial<BusinessCanvas> | null {
  const zac = besedilo.indexOf('{');
  const kon = besedilo.lastIndexOf('}');
  if (zac === -1 || kon <= zac) return null;
  try { return JSON.parse(besedilo.slice(zac, kon + 1)) as Partial<BusinessCanvas>; } catch { return null; }
}

export default function CanvasAgent({ base = '' }: { base?: string }) {
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);

  const [opis, setOpis] = useState('');
  const [dela, setDela] = useState(false);
  const [napaka, setNapaka] = useState('');
  const [izid, setIzid] = useState<Partial<BusinessCanvas> | null>(null);
  const [shranjeno, setShranjeno] = useState(false);

  const [agenti, setAgenti] = useState<{ id: string; label: string }[]>([]);
  const [agent, setAgent] = useState('');
  const [orgId, setOrgId] = useState('');

  useEffect(() => {
    let ziv = true;
    (async () => {
      try {
        const ctx = await getOrganizationContext();
        if (!ctx || !ziv) return;
        setOrgId(ctx.organizationId);
        const res = await fetch(`/api/ai/povezave?organizationId=${ctx.organizationId}`);
        if (!res.ok) return;
        const d = await res.json();
        const upor = (d?.connections || [])
          .filter((c: { connection_type: string; provider: string; status: string }) =>
            c.connection_type === 'api' && c.provider !== 'custom-mcp' && c.status !== 'disabled')
          .map((c: { id: string; label: string }) => ({ id: c.id, label: c.label }));
        if (ziv) setAgenti(upor);
      } catch { /* brez povezav piše Pupa */ }
    })();
    return () => { ziv = false; };
  }, []);

  const napisi = async () => {
    if (!opis.trim() || dela) return;
    setDela(true); setNapaka(''); setIzid(null); setShranjeno(false);
    const poziv = `${NAVODILO}\n\nOpis posla:\n${opis.trim()}`;
    try {
      const res = agent && orgId
        ? await fetch('/api/ai/izvedi', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ organizationId: orgId, connectionId: agent, prompt: poziv }),
        })
        : await fetch('/api/pupa', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ vprasanje: poziv, kontekst: '', zgodovina: [] }),
        });
      const data = await res.json();
      const besedilo: string = data.odgovor || data.text || '';
      if (!besedilo) { setNapaka(data.napaka || data.error || L('Odgovora ni bilo.', 'No answer came back.')); return; }
      const polja = izlusciJson(besedilo);
      if (!polja) { setNapaka(L('Odgovor ni bil v pričakovani obliki. Poskusi znova.', 'The answer was not in the expected shape. Try again.')); return; }
      setIzid(polja);
    } catch {
      setNapaka(L('Ne morem do zaledja. Poskusi znova.', 'Cannot reach the backend. Try again.'));
    } finally {
      setDela(false);
    }
  };

  const shrani = async () => {
    if (!izid) return;
    const canvas: BusinessCanvas = { ...EMPTY_BUSINESS_CANVAS };
    (Object.keys(EMPTY_BUSINESS_CANVAS) as (keyof BusinessCanvas)[]).forEach(k => {
      canvas[k] = (izid[k] || '').toString();
    });
    saveLocalCanvas(canvas);
    await saveCloudCanvas(canvas).catch(() => undefined);
    setShranjeno(true);
  };

  return (
    <div className="ca">
      <header>
        <p className="ca-nad">{L('POSLOVNI OKVIR', 'BUSINESS FRAMEWORK')}</p>
        <h1>{L('Povej, kaj delaš. Canvas napišem jaz.', 'Tell me what you do. I will write the canvas.')}</h1>
        <p className="ca-pod">{L('Devet polj poslovnega modela — komu prodajaš, zakaj tebi, kje te najdejo, od česa živiš.', 'Nine blocks of the business model — who you sell to, why you, where they find you, what you live on.')}</p>
      </header>

      <label className="ca-polje">
        <span>{L('Opiši svoj posel po domače', 'Describe your business in plain words')}</span>
        <textarea rows={5} value={opis} onChange={e => setOpis(e.target.value)}
          placeholder={L('npr. Delam grafično oblikovanje za male slovenske firme. Največ celostnih podob in spletnih strani. Stranke pridejo prek priporočil. Sama sem, včasih najamem programerja.',
                         'e.g. I do graphic design for small local companies. Mostly brand identities and websites. Clients come through referrals. I work alone, sometimes hire a developer.')} />
      </label>

      <div className="ca-akcije">
        {agenti.length > 0 && (
          <select value={agent} onChange={e => setAgent(e.target.value)} aria-label={L('Kdo naj napiše', 'Who writes it')}>
            <option value="">Pupa</option>
            {agenti.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        )}
        <button type="button" className="ca-glavni" onClick={napisi} disabled={!opis.trim() || dela}>
          {dela ? L('Pišem …', 'Writing …') : L('Napiši canvas', 'Write the canvas')}
        </button>
        {izid && !shranjeno && (
          <button type="button" className="ca-drugi" onClick={shrani}>{L('Shrani v canvas', 'Save to canvas')}</button>
        )}
        {shranjeno && (
          <a className="ca-drugi" href={`${base}/kalkulator/poslovni-nacrt`}>{L('Odpri canvas →', 'Open the canvas →')}</a>
        )}
      </div>

      {napaka && <p className="ca-napaka" role="alert">{napaka}</p>}
      {shranjeno && <p className="ca-ok" role="status">{L('Shranjeno v Poslovni okvir.', 'Saved to the business framework.')}</p>}

      {izid && (
        <div className="ca-mreza">
          {POLJA.map(([k, naslov, namig]) => (
            <section key={k} className="ca-blok">
              <b>{naslov}</b>
              <small>{namig}</small>
              <p>{izid[k] || '—'}</p>
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        .ca { max-width: 56rem; margin: 0 auto; padding: 2.2rem 1.2rem 4rem; display: flex; flex-direction: column; gap: 1rem; }
        .ca-nad { margin: 0; font-size: .64rem; font-weight: 800; letter-spacing: .18em; color: #8a8177; }
        h1 { margin: .2rem 0 .3rem; font-size: 1.9rem; font-family: var(--font-serif-flow, var(--font-serif)), serif; color: var(--ink, #111); }
        .ca-pod { margin: 0; font-size: .88rem; line-height: 1.5; color: #6b655d; }
        .ca-polje { display: grid; gap: .3rem; font-size: .68rem; font-weight: 800; color: #6b655d; }
        .ca-polje textarea { width: 100%; padding: .7rem .8rem; border: 1px solid rgba(17,17,17,.14); border-radius: .7rem; background: #fff; font: 500 .9rem var(--font-sans), sans-serif; line-height: 1.5; resize: vertical; color: var(--ink, #111); }
        .ca-akcije { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
        .ca-akcije select { padding: .55rem .7rem; border: 1px solid rgba(17,17,17,.14); border-radius: 999px; background: #fff; font: 700 .8rem var(--font-sans), sans-serif; }
        .ca-glavni, .ca-drugi { padding: .65rem 1.1rem; border-radius: 999px; font: 800 .82rem var(--font-sans), sans-serif; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
        .ca-glavni { border: 0; background: #6E4FA6; color: #fff; }
        .ca-glavni:disabled { opacity: .5; cursor: default; }
        .ca-drugi { border: 1px solid rgba(17,17,17,.16); background: #fff; color: var(--ink, #111); }
        .ca-napaka { margin: 0; font-size: .84rem; font-weight: 600; color: #a4342a; }
        .ca-ok { margin: 0; font-size: .84rem; font-weight: 600; color: #2F5D50; }
        .ca-mreza { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; }
        .ca-blok { padding: .9rem 1rem; border: 1px solid rgba(17,17,17,.1); border-radius: .9rem; background: #fff; display: flex; flex-direction: column; gap: .2rem; }
        .ca-blok b { font-size: .8rem; color: var(--ink, #111); }
        .ca-blok small { font-size: .68rem; color: #8a8177; }
        .ca-blok p { margin: .3rem 0 0; font-size: .84rem; line-height: 1.5; color: #4a453f; }
        @media (max-width: 900px) { .ca-mreza { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 600px) { .ca-mreza { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
