'use client';

/* »Moj AI« — uporabnica poveze SVOJEGA AI ponudnika (svoj racun, svoj strosek).
   Zaledje je ze postavljeno in se ga tu NE dotikamo:
     GET    /api/ai/povezave?organizationId=…            → { connections: [...] }
     POST   /api/ai/povezave                             → { connection }
     DELETE /api/ai/povezave?organizationId=…&id=…       → { ok: true }
     POST   /api/ai/povezave/<id>/test  { organizationId } → { ok, testedAt } | { error }
   Kljuc gre samo NAVZGOR (POST). Streznik ga sifrira (AES-256-GCM) in nazaj
   vrne le namig zadnjih stirih znakov (secret_hint) — brskalnik pravega kljuca
   nikoli ne vidi, tudi ob ponovnem nalaganju ne. */

import { useCallback, useEffect, useState } from 'react';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

type Povezava = {
  id: string;
  connection_type: 'api' | 'mcp';
  provider: string;
  label: string;
  model: string | null;
  endpoint_url: string | null;
  secret_hint: string;
  status: 'configured' | 'verified' | 'error' | 'disabled';
  last_tested_at?: string | null;
  last_error?: string | null;
};

/* Ponudniki, ki jih uporabnica lahko izbere. Vrednosti so TOCNO tiste, ki jih
   dovoli zaledje (lib/aiConnections.ts → AI_PROVIDERS). »custom-mcp« tu ni,
   ker ga zaledje ne zna preveriti in zahteva MCP odjemalca. */
const PONUDNIKI = [
  { id: 'openai', ime: 'OpenAI (ChatGPT)', model: 'gpt-4.1-mini', kjeSl: 'platform.openai.com → API keys', kjeEn: 'platform.openai.com → API keys' },
  { id: 'anthropic', ime: 'Anthropic (Claude)', model: 'claude-sonnet-4-20250514', kjeSl: 'console.anthropic.com → API keys', kjeEn: 'console.anthropic.com → API keys' },
  { id: 'google', ime: 'Google (Gemini)', model: 'gemini-2.5-flash', kjeSl: 'aistudio.google.com → API key', kjeEn: 'aistudio.google.com → API key' },
  { id: 'mistral', ime: 'Mistral', model: 'mistral-small-latest', kjeSl: 'console.mistral.ai → API keys', kjeEn: 'console.mistral.ai → API keys' },
  { id: 'openai-compatible', ime: 'Drug ponudnik (OpenAI-združljiv)', model: '', kjeSl: 'pri svojem ponudniku', kjeEn: 'from your provider' },
] as const;

const IMENA_PONUDNIKOV: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  mistral: 'Mistral',
  'openai-compatible': 'OpenAI-združljiv',
  'custom-mcp': 'MCP',
};

export default function MojAiPovezave({ base }: { base: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  const [orgId, setOrgId] = useState('');
  const [povezave, setPovezave] = useState<Povezava[]>([]);
  const [nalagam, setNalagam] = useState(true);
  const [napaka, setNapaka] = useState('');
  const [sporocilo, setSporocilo] = useState('');

  /* obrazec za novo povezavo */
  const [odprtObrazec, setOdprtObrazec] = useState(false);
  const [ponudnik, setPonudnik] = useState<string>('openai');
  const [oznaka, setOznaka] = useState('');
  const [model, setModel] = useState('');
  const [naslov, setNaslov] = useState('');
  const [kljuc, setKljuc] = useState('');
  const [shranjujem, setShranjujem] = useState(false);

  /* id povezave, ki se trenutno preverja oz. brise */
  const [preverjam, setPreverjam] = useState('');
  const [brisem, setBrisem] = useState('');

  const izbrani = PONUDNIKI.find(p => p.id === ponudnik) || PONUDNIKI[0];
  const rabiNaslov = ponudnik === 'openai-compatible';

  const naloziPovezave = useCallback(async (organizationId: string) => {
    const res = await fetch(`/api/ai/povezave?organizationId=${encodeURIComponent(organizationId)}`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d?.error || 'Povezav ni bilo mogoče prebrati.');
    setPovezave((d?.connections || []) as Povezava[]);
  }, []);

  useEffect(() => {
    let ziv = true;
    (async () => {
      try {
        const ctx = await getOrganizationContext();
        if (!ziv) return;
        if (!ctx) {
          setNapaka(L('Za urejanje povezav se moraš prijaviti.', 'Sign in to manage connections.'));
          setNalagam(false);
          return;
        }
        setOrgId(ctx.organizationId);
        await naloziPovezave(ctx.organizationId);
      } catch (e) {
        if (ziv) setNapaka(e instanceof Error ? e.message : L('Povezav ni bilo mogoče prebrati.', 'Could not load connections.'));
      } finally {
        if (ziv) setNalagam(false);
      }
    })();
    return () => { ziv = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- L je stabilna glede na base */
  }, [naloziPovezave]);

  function ponastaviObrazec() {
    setOznaka(''); setModel(''); setNaslov(''); setKljuc('');
  }

  async function dodaj(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || shranjujem) return;
    setNapaka(''); setSporocilo('');
    if (!oznaka.trim()) { setNapaka(L('Vpiši ime povezave (npr. »moj ChatGPT«).', 'Add a name for the connection (e.g. "my ChatGPT").')); return; }
    if (!kljuc.trim()) { setNapaka(L('Vpiši ključ svojega ponudnika.', 'Paste your provider key.')); return; }
    if (rabiNaslov && !naslov.trim()) { setNapaka(L('Za drugega ponudnika vpiši HTTPS naslov API-ja.', 'For a custom provider add the HTTPS API address.')); return; }

    setShranjujem(true);
    try {
      const res = await fetch('/api/ai/povezave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          connectionType: 'api',
          provider: ponudnik,
          label: oznaka.trim(),
          model: model.trim() || null,
          endpointUrl: rabiNaslov ? naslov.trim() : null,
          secret: kljuc.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || L('Povezave ni bilo mogoče shraniti.', 'Could not save the connection.'));
      ponastaviObrazec();
      setOdprtObrazec(false);
      setSporocilo(L('Povezava je shranjena. Ključ je šifriran na strežniku.', 'Connection saved. The key is encrypted on the server.'));
      await naloziPovezave(orgId);
    } catch (err) {
      setNapaka(err instanceof Error ? err.message : L('Povezave ni bilo mogoče shraniti.', 'Could not save the connection.'));
    } finally {
      setShranjujem(false);
    }
  }

  async function preveri(id: string) {
    if (!orgId || preverjam) return;
    setNapaka(''); setSporocilo(''); setPreverjam(id);
    try {
      const res = await fetch(`/api/ai/povezave/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || L('Povezave ni bilo mogoče preveriti.', 'Could not verify the connection.'));
      setSporocilo(L('Povezava deluje.', 'The connection works.'));
    } catch (err) {
      setNapaka(err instanceof Error ? err.message : L('Povezave ni bilo mogoče preveriti.', 'Could not verify the connection.'));
    } finally {
      setPreverjam('');
      try { await naloziPovezave(orgId); } catch { /* stanje ostane, kot je */ }
    }
  }

  async function odstrani(p: Povezava) {
    if (!orgId || brisem) return;
    const vprasanje = L(
      `Odstranim povezavo »${p.label}«? Ključ se dokončno izbriše.`,
      `Remove the connection "${p.label}"? The key is deleted for good.`,
    );
    if (!window.confirm(vprasanje)) return;
    setNapaka(''); setSporocilo(''); setBrisem(p.id);
    try {
      const res = await fetch(`/api/ai/povezave?organizationId=${encodeURIComponent(orgId)}&id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || L('Povezave ni bilo mogoče odstraniti.', 'Could not remove the connection.'));
      setSporocilo(L('Povezava je odstranjena.', 'Connection removed.'));
      await naloziPovezave(orgId);
    } catch (err) {
      setNapaka(err instanceof Error ? err.message : L('Povezave ni bilo mogoče odstraniti.', 'Could not remove the connection.'));
    } finally {
      setBrisem('');
    }
  }

  /* Stanje povedano po človeško — ne surove vrednosti iz baze. */
  function stanjeBesedilo(s: Povezava['status']) {
    if (s === 'verified') return L('Deluje', 'Working');
    if (s === 'error') return L('Napaka', 'Error');
    if (s === 'disabled') return L('Izklopljeno', 'Turned off');
    return L('Še ni preverjeno', 'Not verified yet');
  }
  function stanjeRazred(s: Povezava['status']) {
    if (s === 'verified') return 'ai-stanje ok';
    if (s === 'error') return 'ai-stanje err';
    if (s === 'disabled') return 'ai-stanje off';
    return 'ai-stanje neo';
  }

  return (
    <div className="ai-ovoj">
      <p className="ai-uvod">
        {L(
          'Poveži svoj račun pri AI ponudniku (ChatGPT, Claude, Gemini …). Pupa lahko potem dela prek tvojega ključa — porabo plačuješ svojemu ponudniku, ne nam.',
          'Connect your own AI provider account (ChatGPT, Claude, Gemini …). Pupa can then work through your key — you pay usage to your provider, not to us.',
        )}
      </p>

      <div className="ai-varnost">
        <b>{L('Kaj se zgodi s ključem:', 'What happens to your key:')}</b>{' '}
        {L(
          'ključ se pošlje samo enkrat, na strežniku se šifrira in se nikoli ne vrne v brskalnik. Tu vidiš le zadnje štiri znake. Če ga izgubiš, ga ne moremo prikazati — ustvariš novega pri ponudniku.',
          'the key is sent once, encrypted on the server, and never returned to the browser. You only ever see the last four characters here. If you lose it, we cannot show it — you create a new one at your provider.',
        )}
      </div>

      <div className="ai-blok">
        <span className="ai-oznaka">{L('Tvoje povezave', 'Your connections')}</span>

        {nalagam && <p className="ai-prazno">{L('Nalagam …', 'Loading …')}</p>}

        {!nalagam && !povezave.length && (
          <p className="ai-prazno">{L('Nimaš še nobene povezave. Dodaj jo spodaj.', 'No connections yet. Add one below.')}</p>
        )}

        {povezave.map(p => (
          <div key={p.id} className="ai-vrstica">
            <div className="ai-glava">
              <span className="ai-ime">{p.label}</span>
              <span className={stanjeRazred(p.status)}>{stanjeBesedilo(p.status)}</span>
            </div>
            <p className="ai-meta">
              {IMENA_PONUDNIKOV[p.provider] || p.provider}
              {p.connection_type === 'mcp' ? ' · MCP' : ''}
              {p.model ? ` · ${p.model}` : ` · ${L('privzeti model', 'default model')}`}
              {' · '}
              {L('ključ', 'key')} {p.secret_hint}
            </p>
            {p.status === 'error' && p.last_error && (
              <p className="ai-zadnja-napaka">{p.last_error}</p>
            )}
            <div className="ai-akcije">
              {p.provider !== 'custom-mcp' && p.connection_type === 'api' && (
                <button type="button" className="ai-gumb-tih" onClick={() => preveri(p.id)} disabled={preverjam === p.id}>
                  {preverjam === p.id ? L('Preverjam …', 'Checking …') : L('Preveri povezavo', 'Test connection')}
                </button>
              )}
              <button type="button" className="ai-gumb-brisi" onClick={() => odstrani(p)} disabled={brisem === p.id}>
                {brisem === p.id ? L('Odstranjujem …', 'Removing …') : L('Odstrani', 'Remove')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!odprtObrazec && (
        <button type="button" className="ai-dodaj" onClick={() => { setOdprtObrazec(true); setNapaka(''); setSporocilo(''); }}>
          + {L('Dodaj povezavo', 'Add a connection')}
        </button>
      )}

      {odprtObrazec && (
        <form className="ai-obrazec" onSubmit={dodaj}>
          <span className="ai-oznaka">{L('Nova povezava', 'New connection')}</span>

          <label className="ai-polje">
            <span>{L('Ponudnik', 'Provider')}</span>
            <select value={ponudnik} onChange={e => setPonudnik(e.target.value)}>
              {PONUDNIKI.map(p => <option key={p.id} value={p.id}>{p.ime}</option>)}
            </select>
          </label>

          <label className="ai-polje">
            <span>{L('Ime povezave', 'Connection name')}</span>
            <input
              type="text"
              value={oznaka}
              onChange={e => setOznaka(e.target.value)}
              maxLength={100}
              placeholder={L('npr. moj ChatGPT', 'e.g. my ChatGPT')}
            />
            <small>{L('Samo zate — da veš, kateri račun je to.', 'Just for you — so you know which account this is.')}</small>
          </label>

          {rabiNaslov && (
            <label className="ai-polje">
              <span>{L('Naslov API-ja', 'API address')}</span>
              <input
                type="url"
                value={naslov}
                onChange={e => setNaslov(e.target.value)}
                placeholder="https://api.ponudnik.com/v1"
                spellCheck={false}
              />
              <small>{L('Mora biti HTTPS naslov, ki ti ga da ponudnik.', 'Must be the HTTPS address your provider gives you.')}</small>
            </label>
          )}

          <label className="ai-polje">
            <span>{L('Model (neobvezno)', 'Model (optional)')}</span>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              maxLength={150}
              placeholder={izbrani.model || L('npr. ime modela pri ponudniku', 'e.g. the model name at your provider')}
              spellCheck={false}
            />
            <small>
              {izbrani.model
                ? L(`Pusti prazno in uporabi se ${izbrani.model}. Ime modela najdeš pri ponudniku.`, `Leave empty to use ${izbrani.model}. You find model names at your provider.`)
                : L('Pri tem ponudniku je model obvezen za uporabo — vpiši točno ime, kot ga navaja ponudnik.', 'This provider needs a model name to run — enter it exactly as your provider lists it.')}
            </small>
          </label>

          <label className="ai-polje">
            <span>{L('Ključ', 'Key')}</span>
            <input
              type="password"
              value={kljuc}
              onChange={e => setKljuc(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={L('prilepi ključ sem', 'paste the key here')}
            />
            <small>{L(`Ključ dobiš na ${izbrani.kjeSl}.`, `You get the key at ${izbrani.kjeEn}.`)}</small>
          </label>

          <div className="ai-akcije">
            <button type="submit" className="ai-gumb" disabled={shranjujem || !orgId}>
              {shranjujem ? L('Shranjujem …', 'Saving …') : L('Shrani povezavo', 'Save connection')}
            </button>
            <button type="button" className="ai-gumb-tih" onClick={() => { setOdprtObrazec(false); ponastaviObrazec(); setNapaka(''); }}>
              {L('Prekliči', 'Cancel')}
            </button>
          </div>
        </form>
      )}

      {napaka && <p className="ai-napaka" role="alert">{napaka}</p>}
      {sporocilo && <p className="ai-uspeh" role="status">{sporocilo}</p>}

      <p className="ai-opomba">
        {L(
          'Povezavo lahko urejajo samo lastnik in skrbniki podjetja. Povezava velja za celotno podjetje.',
          'Only the owner and admins can manage connections. A connection applies to the whole company.',
        )}
      </p>

      <style jsx>{`
        .ai-ovoj { display: flex; flex-direction: column; gap: 1.2rem; }
        .ai-uvod { margin: 0; font-size: .9rem; line-height: 1.55; color: #4a4550; }
        .ai-varnost { padding: .85rem 1rem; border-radius: 12px; border: 1px solid rgba(110,79,166,.28); background: rgba(110,79,166,.06); font-size: .84rem; line-height: 1.55; color: #3d3646; }
        .ai-varnost b { color: #6E4FA6; }
        .ai-blok { display: flex; flex-direction: column; gap: .7rem; }
        .ai-oznaka { font-size: .72rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #8a8177; }
        .ai-prazno { margin: 0; font-size: .86rem; color: #6b6459; }

        .ai-vrstica { display: flex; flex-direction: column; gap: .45rem; padding: .95rem 1.05rem; border: 1px solid rgba(17,17,17,.12); border-radius: 12px; background: #fff; }
        .ai-glava { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; }
        .ai-ime { font-size: .95rem; font-weight: 700; color: #111; }
        .ai-meta { margin: 0; font-size: .8rem; color: #6b6459; line-height: 1.5; word-break: break-word; }
        .ai-zadnja-napaka { margin: 0; font-size: .8rem; line-height: 1.5; color: #a4342a; }

        .ai-stanje { display: inline-flex; align-items: center; padding: .2rem .55rem; border-radius: 999px; font-size: .72rem; font-weight: 700; border: 1px solid; }
        .ai-stanje.ok { color: #2F5D50; border-color: rgba(47,93,80,.35); background: rgba(47,93,80,.08); }
        .ai-stanje.err { color: #a4342a; border-color: rgba(164,52,42,.35); background: rgba(164,52,42,.08); }
        .ai-stanje.off { color: #6b6459; border-color: rgba(17,17,17,.18); background: rgba(17,17,17,.05); }
        .ai-stanje.neo { color: #6E4FA6; border-color: rgba(110,79,166,.35); background: rgba(110,79,166,.08); }

        .ai-akcije { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-top: .2rem; }
        .ai-gumb { min-height: 2.5rem; padding: .55rem 1.1rem; border: 0; border-radius: 999px; background: #6E4FA6; color: #fff; font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; }
        .ai-gumb:hover:not(:disabled) { background: #5b3f8c; }
        .ai-gumb-tih { min-height: 2.5rem; padding: .5rem 1rem; border: 1.5px solid rgba(17,17,17,.18); border-radius: 999px; background: #fff; color: #111; font: inherit; font-size: .82rem; font-weight: 600; cursor: pointer; }
        .ai-gumb-tih:hover:not(:disabled) { border-color: rgba(17,17,17,.45); }
        .ai-gumb-brisi { border: 0; background: none; padding: 0; color: #a4342a; font: inherit; font-size: .82rem; font-weight: 600; text-decoration: underline; text-underline-offset: .2em; cursor: pointer; }
        .ai-gumb-brisi:hover:not(:disabled) { color: #7a271f; }
        .ai-gumb:disabled, .ai-gumb-tih:disabled, .ai-gumb-brisi:disabled { opacity: .6; cursor: default; }
        .ai-gumb:focus-visible, .ai-gumb-tih:focus-visible, .ai-gumb-brisi:focus-visible, .ai-dodaj:focus-visible { outline: 3px solid #6E4FA6; outline-offset: 3px; }

        .ai-dodaj { align-self: flex-start; padding: .55rem 1.1rem; border: 1.5px dashed rgba(17,17,17,.25); border-radius: 999px; background: transparent; color: #4a4550; font: inherit; font-size: .84rem; font-weight: 600; cursor: pointer; }
        .ai-dodaj:hover { border-style: solid; border-color: #6E4FA6; color: #6E4FA6; }

        .ai-obrazec { display: flex; flex-direction: column; gap: .9rem; padding: 1.1rem 1.15rem; border: 1px solid rgba(110,79,166,.28); border-radius: 14px; background: #FCFBF7; }
        .ai-polje { display: flex; flex-direction: column; gap: .3rem; }
        .ai-polje > span { font-size: .78rem; font-weight: 600; color: #4a4550; }
        .ai-polje input, .ai-polje select { font: inherit; font-size: .92rem; color: #111; padding: .55rem .75rem; border-radius: 9px; border: 1.5px solid rgba(17,17,17,.15); background: #fff; }
        .ai-polje input:focus, .ai-polje select:focus { outline: none; border-color: #6E4FA6; }
        .ai-polje small { font-size: .76rem; line-height: 1.45; color: #6b6459; }

        .ai-napaka { margin: 0; padding: .7rem .9rem; border-radius: 10px; border: 1px solid rgba(164,52,42,.3); background: rgba(164,52,42,.07); color: #a4342a; font-size: .84rem; line-height: 1.5; }
        .ai-uspeh { margin: 0; padding: .7rem .9rem; border-radius: 10px; border: 1px solid rgba(47,93,80,.3); background: rgba(47,93,80,.07); color: #2F5D50; font-size: .84rem; line-height: 1.5; }
        .ai-opomba { margin: 0; font-size: .78rem; line-height: 1.5; color: #6b6459; }

        @media (max-width: 560px) {
          .ai-gumb, .ai-gumb-tih, .ai-dodaj { width: 100%; }
          .ai-akcije { gap: .5rem; }
        }
      `}</style>
    </div>
  );
}
