'use client';

/* POGODBE — prezidano na vzorec RetainerWorkspace (view-swap: nastavitve ->
   dokument -> zakljucek). Urejevalnik, orodjarna, podpis in PDF so KOPIJE
   delujocih vzorcev iz RetainerWorkspace, samo vsebina je pogodbena.
   Vsi novi razredi imajo predpono pg-, da ne trcijo s splosnimi pravili
   pregled.module.css (.shell ima agresivna pravila za input/select/button). */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, CaretUp, Eye, PencilSimple, PenNib, TextAa, TextB, TextItalic } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowClient, type FlowContract } from '@/lib/pinartFlowStore';
import { uploadBusinessDocument } from '@/lib/pinartFlowCloud';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { dokCss, dokFontLink, dokVars, DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI } from '@/lib/dokVidez';

const K_NAST = 'pinart-kalkulator-v2';

type Offer = { id: string; title: string; client: string; scope: string[]; number?: string; status: string; agreedAmount: number };
type Ponudnik = { ime: string; davcna: string; email: string; telefon: string; naslov: string; trr: string };

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const eur = (n: number) => Math.round(n).toLocaleString('sl-SI') + ' €';
const datStr = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;

export default function ContractWorkspace({ base }: { base: string }) {
  /* pod 640px orodjarna postane slide-up predal (kot retainer) */
  const [jeMobilni, setJeMobilni] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const upd = () => setJeMobilni(mq.matches);
    upd(); mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);

  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljenega zapisa pisal v pravo bazo. */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';

  const [offers, setOffers] = useState<Offer[]>([]);
  const [contracts, setContracts] = useState<FlowContract[]>([]);
  const [clients, setClients] = useState<FlowClient[]>([]);
  const [ponudnik, setPonudnik] = useState<Ponudnik>({ ime: '', davcna: '', email: '', telefon: '', naslov: '', trr: '' });
  const [predklic, setPredklic] = useState('+386');
  const [dokBarva, setDokBarva] = useState(DOK_BARVA_PRIVZETA);
  const [dokFont, setDokFont] = useState(DOK_FONT_PRIVZETI);

  /* pogled = katera "stran" je prikazana — ENAKO kot retainer (vprasanja -> ponudba -> zakljucek).
     nastavitve: vir + izbirnik + arhiv; dokument: SAMO oblikovan dokument; zakljucek: prenos + posiljanje. */
  const [pogled, setPogled] = useState<'nastavitve' | 'dokument' | 'zakljucek'>('nastavitve');
  const [vir, setVir] = useState<'ponudba' | 'rocno' | 'stranka'>('ponudba');
  const [offerId, setOfferId] = useState('');
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [rocniNarocnik, setRocniNarocnik] = useState('');
  const [rocniObseg, setRocniObseg] = useState('');
  const [narEmail, setNarEmail] = useState('');
  const [kartaOdprta, setKartaOdprta] = useState(false);

  const [notice, setNotice] = useState('');
  const [napaka, setNapaka] = useState('');
  const [pdfNalaganje, setPdfNalaganje] = useState(false);
  /* id zadnje shranjene pogodbe — ponovni "Shrani" posodobi zapis, ne podvoji */
  const [shranjenaId, setShranjenaId] = useState('');

  /* urejevalnik telesa dokumenta (kopija retainerjevega vzorca) */
  const [predogledMode, setPredogledMode] = useState(false);
  const [ponSheet, setPonSheet] = useState<null | 'oblika' | 'podpis'>(null);
  const [podpisCilj, setPodpisCilj] = useState<'izvajalec' | 'narocnik'>('izvajalec');
  const [narisano, setNarisano] = useState(false);
  const podpisPlatnoRef = useRef<HTMLCanvasElement | null>(null);
  const podpisDatotekaRef = useRef<HTMLInputElement | null>(null);
  const risanjeRef = useRef(false);
  const [oznaciNamig, setOznaciNamig] = useState(false);
  const [velikostBesedila, setVelikostBesedila] = useState(3);
  const [rocnoTelo, setRocnoTelo] = useState(false);
  const [teloHtml, setTeloHtml] = useState('');
  const editorRef = useRef<HTMLDivElement | null>(null);
  const barvaRef = useRef<HTMLInputElement>(null);
  const [predStrani, setPredStrani] = useState<string[]>([]);
  const [predNal, setPredNal] = useState(false);

  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    setOffers(flow.offers.map(({ id, title, client, number, status, scope, agreedAmount }) => ({ id, title, client, number, status, scope, agreedAmount })));
    setContracts(flow.contracts);
    setClients(flow.clients);
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      if (s.ponudnik) setPonudnik({ trr: '', ...s.ponudnik });
      if (s.predklic) setPredklic(s.predklic);
      if (s.dokBarva) setDokBarva(s.dokBarva);
      if (s.dokFont) setDokFont(s.dokFont);
    } catch { /* prazno */ }
  }, [nacin]);

  const selectedOffer = offers.find(item => item.id === offerId);
  /* e-posta narocnika: iz imenika strank (po imenu), da je "Poslji" en klik */
  useEffect(() => {
    if (vir !== 'ponudba' || !selectedOffer) return;
    const stranka = clients.find(c => c.name.trim().toLowerCase() === selectedOffer.client.trim().toLowerCase());
    setNarEmail(stranka?.email || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId, vir, clients]);

  const narocnikIme = () => (vir === 'ponudba' ? selectedOffer?.client || '' : rocniNarocnik).trim();
  const obsegSeznam = () => vir === 'ponudba'
    ? (selectedOffer?.scope || [])
    : rocniObseg.split('\n').map(v => v.trim()).filter(Boolean);

  /* ── dokument: letterhead + CSS + predloga — KOPIJA retainerjevega vzorca ── */
  const glava = () => {
    const kontakt = [ponudnik.davcna.trim() && 'Davčna št.: ' + ponudnik.davcna.trim(), ponudnik.trr.trim() && 'TRR: ' + ponudnik.trr.trim(), ponudnik.telefon.trim() && 'Tel.: ' + predklic + ' ' + ponudnik.telefon.trim(), ponudnik.email.trim()].filter(Boolean).join(' · ');
    return `<div class="lg"><div><b>${esc(ponudnik.ime.trim() || '[Tvoje podjetje]')}</b>${ponudnik.naslov.trim() ? '<br>' + esc(ponudnik.naslov.trim()) : ''}${kontakt ? '<br><span class="mut">' + esc(kontakt) + '</span>' : ''}</div><div class="rt">Pinart</div></div>`;
  };
  const DOC_CSS = `@page{size:A4;margin:16mm 16mm 18mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}body{margin:0;color:#1a1622;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10.5pt;line-height:1.42}.lg{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:12px;border-bottom:1.5px solid #B25476;margin-bottom:20px}.lg .rt{font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:15pt;color:#111}.mut{color:#8a8177;font-size:9pt}h1{font-family:'Bodoni Moda',Didot,Georgia,serif;font-weight:600;font-size:20pt;margin:2px 0 4px;color:#111}.kick{font-size:8.5pt;letter-spacing:.24em;text-transform:uppercase;color:#B25476;font-weight:700}h2{font-size:8.5pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#B25476;margin:11px 0 5px;padding-top:6px;border-top:1px solid #ecdfe4;break-after:avoid}p{margin:0 0 5px}ul{margin:.2rem 0 .7rem;padding-left:1.15rem}li{margin:3px 0;break-inside:avoid}.meta{color:#555;font-size:9.5pt;margin:2px 0 0}.pog-clen{margin:7px 0;break-inside:avoid}.pog-clen h2{border-top:0;padding-top:0;margin:6px 0 3px;font-size:9pt}.parties p{margin:.15rem 0}.sig{display:flex;gap:40px;margin-top:15px;break-inside:avoid}.sig>div{flex:1;font-size:9pt;color:#444;display:flex;flex-direction:column}.sig>div>span:first-child{font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:#8a8177;margin-bottom:24px}.sig .lin{border-top:1px solid #111;margin-bottom:4px}.podpis-img{display:block;max-height:40px;max-width:180px;margin:0 0 -6px}`;
  const doc = (body: string) => `<!doctype html><html lang="sl"><head><meta charset="utf-8">${dokFontLink(dokFont)}<style>${dokCss(DOC_CSS)}</style></head><body style="${dokVars(dokBarva, dokFont)}">${glava()}${body}</body></html>`;

  /* besedilo clenov = vsebinsko ista pogodba kot prej (13 clenov), le v HTML
     obliki dokumenta (.pog-clen), da jo urejevalnik in PDF prikazeta kot retainer */
  const pogodbaHtml = () => {
    const nar = narocnikIme() || '[Naročnik]';
    const izv = [ponudnik.ime.trim() || '[Izvajalec]', ponudnik.naslov.trim(), ponudnik.davcna.trim() && ('davčna št. ' + ponudnik.davcna.trim()), ponudnik.trr.trim() && ('TRR ' + ponudnik.trr.trim())].filter(Boolean).join(', ');
    const st = vir === 'ponudba' ? selectedOffer?.number || '' : '';
    const naslovProj = vir === 'ponudba' ? selectedOffer?.title || '' : '';
    const obseg = obsegSeznam();
    const obsegHtml = obseg.length ? `<ul>${obseg.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '<ul><li>skladno s potrjeno ponudbo</li></ul>';
    const znesek = vir === 'ponudba' && selectedOffer && selectedOffer.agreedAmount > 0 ? ` Dogovorjena vrednost po ponudbi znaša ${eur(selectedOffer.agreedAmount)}.` : '';
    const d = datum ? new Date(datum + 'T00:00:00') : new Date();
    return `
      <div class="kick">Pogodba o poslovnem sodelovanju${st ? ' · ponudba št. ' + esc(st) : ''}</div>
      <h1>Pogodba o poslovnem sodelovanju</h1>
      <p class="meta">Datum: ${datStr(d)}${nar !== '[Naročnik]' ? ' · z: ' + esc(nar) : ''}</p>
      <div class="parties" style="margin-top:14px"><p>ki jo skleneta</p><p><b>Naročnik:</b> ${esc(nar)}</p><p>in</p><p><b>Izvajalec:</b> ${esc(izv)}</p><p>kot sledi:</p></div>
      <div class="pog-clen"><h2>1. člen — Uvodna določba</h2><p>Pogodbeni stranki ugotavljata, da ima izvajalec znanje in izkušnje za izvedbo dogovorjenih storitev ter da želita s pogodbo urediti medsebojne pravice in obveznosti. Izvajalec delo opravlja samostojno in ni v delovnem razmerju z naročnikom.</p></div>
      <div class="pog-clen"><h2>2. člen — Predmet pogodbe</h2><p>Predmet pogodbe je ${naslovProj ? 'izvedba projekta »' + esc(naslovProj) + '« in ' : ''}izvedba naslednjih storitev:</p>${obsegHtml}<p>${st ? `Potrjena ponudba št. ${esc(st)} je sestavni del pogodbe. ` : ''}Dela zunaj navedenega obsega se pred izvedbo dodatno ovrednotijo in pisno potrdijo.</p></div>
      <div class="pog-clen"><h2>3. člen — Način in kakovost dela</h2><p>Izvajalec se zavezuje delo opraviti strokovno, skrbno in v interesu kakovostne izvedbe. Naročnik pravočasno zagotovi informacije, materiale, dostope in potrditve. Izvajalec lahko vključi ustrezno usposobljene podizvajalce in odgovarja za njihovo delo.</p></div>
      <div class="pog-clen"><h2>4. člen — Roki izvedbe</h2><p>Roki veljajo, kot so določeni v ponudbi oziroma naknadno pisno dogovorjeni. Zamude naročnika pri posredovanju gradiv ali potrditvah ustrezno podaljšajo rok izvedbe.</p></div>
      <div class="pog-clen"><h2>5. člen — Cena storitev in način plačila</h2><p>Cena, način obračuna, predplačilo in plačilni roki veljajo skladno s potrjeno ponudbo.${znesek} Dodatne storitve in potrjeni dodatni stroški se obračunajo posebej. Ob zamudi lahko izvajalec obračuna zakonske zamudne obresti.</p></div>
      <div class="pog-clen"><h2>6. člen — Obveznosti naročnika</h2><p>Naročnik zagotovi potrebna gradiva in povratne informacije, potrjuje posamezne faze ter poravna račune v dogovorjenih rokih.</p></div>
      <div class="pog-clen"><h2>7. člen — Obveznosti izvajalca</h2><p>Izvajalec pogodbena dela izvede strokovno, naročnika obvešča o okoliščinah, ki vplivajo na izvedbo, ter omogoči pregled dogovorjenih faz projekta.</p></div>
      <div class="pog-clen"><h2>8. člen — Varovanje podatkov</h2><p>Pogodbeni stranki varujeta poslovne, osebne in druge zaupne podatke, s katerimi se seznanita pri sodelovanju, tudi po prenehanju pogodbe.</p></div>
      <div class="pog-clen"><h2>9. člen — Avtorske pravice</h2><p>Obseg prenosa oziroma licence avtorskih pravic velja, kot je določen v potrjeni ponudbi. Dogovorjene pravice se na naročnika prenesejo po celotnem plačilu. Delovne datoteke, neizbrane rešitve in sredstva tretjih oseb niso vključeni, če ni pisno dogovorjeno drugače.</p></div>
      <div class="pog-clen"><h2>10. člen — Trajanje in prenehanje pogodbe</h2><p>Pogodba velja od podpisa obeh strank do izpolnitve vseh dogovorjenih obveznosti. Vsaka stranka lahko odstopi ob bistveni kršitvi, če druga stranka kršitve ne odpravi v primernem pisno določenem roku.</p></div>
      <div class="pog-clen"><h2>11. člen — Spremembe pogodbe</h2><p>Spremembe in dopolnitve so veljavne le v pisni obliki. Potrditve po elektronski pošti se štejejo kot pisni dogovor, kadar jasno določajo spremembo obsega, roka ali cene.</p></div>
      <div class="pog-clen"><h2>12. člen — Reševanje sporov</h2><p>Stranki bosta morebitne spore reševali sporazumno. Če to ne bo mogoče, je pristojno stvarno pristojno sodišče v kraju izvajalca, če prisilni predpisi ne določajo drugače.</p></div>
      <div class="pog-clen"><h2>13. člen — Končne določbe</h2><p>Pogodba je sestavljena v dveh enakih izvodih oziroma podpisana elektronsko. Sklenjena je z dnem podpisa obeh pogodbenih strank.</p></div>
      <p style="margin-top:12px">Kraj in datum: ____________________</p>
      <div class="sig"><div><span>Naročnik</span><span class="lin"></span>${esc(nar !== '[Naročnik]' ? nar : '')}</div><div><span>Izvajalec</span><span class="lin"></span>${esc(ponudnik.ime.trim() || '')}</div></div>`;
  };

  /* ── urejevalnik telesa (kopija retainerjevega vzorca) ── */
  /* callback-ref: urejevalnik se ustvari prazen -> napolnimo ga (le ce je prazen, da med tipkanjem ne resetiramo kurzorja) */
  const napolniEditor = (el: HTMLDivElement | null) => {
    editorRef.current = el;
    if (el && !el.innerHTML.trim()) el.innerHTML = teloHtml.trim() ? teloHtml : pogodbaHtml();
  };
  const sinhronizirajEditor = () => {
    const html = editorRef.current?.innerHTML || '';
    if (!(editorRef.current?.innerText || '').trim()) return; /* ne shrani praznega */
    setTeloHtml(html);
  };
  const rabiIzbor = new Set(['bold', 'italic', 'underline', 'fontSize', 'foreColor', 'hiliteColor', 'fontName']);
  const oblikuj = (ukaz: string, vrednost?: string) => {
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    const prazenIzbor = !sel || sel.isCollapsed || !sel.toString().trim();
    if (rabiIzbor.has(ukaz) && prazenIzbor) { setOznaciNamig(true); return; }
    editorRef.current?.focus();
    document.execCommand(ukaz, false, vrednost);
    sinhronizirajEditor();
  };
  const velikost = (smer: number) => { const nv = Math.min(7, Math.max(1, velikostBesedila + smer)); setVelikostBesedila(nv); oblikuj('fontSize', String(nv)); };
  const uporabiPisavo = (font: string) => oblikuj('fontName', font);
  const ponastaviTelo = () => { setRocnoTelo(false); const html = pogodbaHtml(); setTeloHtml(html); if (editorRef.current) editorRef.current.innerHTML = html; };
  const izvozniTelo = () => { const e = editorRef.current?.innerHTML?.trim(); if (e) return e; if (teloHtml.trim()) return teloHtml; return pogodbaHtml(); };

  /* ── podpis: canvas za risanje (prst/miska) ali nalozena slika — KOPIJA retainerja ── */
  const pripraviPlatno = (c: HTMLCanvasElement | null) => {
    podpisPlatnoRef.current = c;
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (r.width > 0 && c.width !== Math.round(r.width * 2)) {
      c.width = Math.round(r.width * 2); c.height = Math.round(r.height * 2);
      const ctx = c.getContext('2d');
      if (ctx) { ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1a1622'; }
    }
  };
  const podpisTocka = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const zacniRis = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = podpisPlatnoRef.current?.getContext('2d'); if (!ctx) return;
    risanjeRef.current = true;
    const p = podpisTocka(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const risiPodpis = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!risanjeRef.current) return;
    const ctx = podpisPlatnoRef.current?.getContext('2d'); if (!ctx) return;
    const p = podpisTocka(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (!narisano) setNarisano(true);
  };
  const koncajRis = () => { risanjeRef.current = false; };
  const pocistiPodpis = () => {
    const c = podpisPlatnoRef.current; const ctx = c?.getContext('2d');
    if (c && ctx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore(); }
    setNarisano(false);
  };
  /* vstavi <img> nad podpisno crto izbrane strani; gre tudi v PDF (data URL) */
  const vstaviPodpisImg = (dataUrl: string) => {
    const el = editorRef.current; if (!el) return;
    const stolpca = el.querySelectorAll('.sig > div');
    const cilj = stolpca[podpisCilj === 'narocnik' ? 0 : 1] as HTMLElement | undefined; /* narocnik je tu LEVI stolpec */
    if (!cilj) return;
    cilj.querySelector('img.podpis-img')?.remove();
    const img = document.createElement('img');
    img.src = dataUrl; img.className = 'podpis-img'; img.alt = 'Podpis';
    cilj.insertBefore(img, cilj.querySelector('.lin'));
    setRocnoTelo(true); sinhronizirajEditor(); setPonSheet(null);
  };
  const vstaviNarisanPodpis = () => { const c = podpisPlatnoRef.current; if (c && narisano) vstaviPodpisImg(c.toDataURL('image/png')); };
  const naloziPodpisSliko = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { if (typeof r.result === 'string') vstaviPodpisImg(r.result); };
    r.readAsDataURL(f);
    e.target.value = '';
  };

  /* ── PDF prenos (kopija retainerjevega `prenesi`) ── */
  const prenesi = async () => {
    setNapaka('');
    const html = doc(izvozniTelo());
    const slug = (narocnikIme() || 'pinart').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const ime = 'pogodba-' + (slug || 'pinart');
    setPdfNalaganje(true);
    try {
      const res = await fetch('/api/ponudba-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, ime, footer: [ponudnik.ime.trim(), 'Pogodba o poslovnem sodelovanju'].filter(Boolean).join(' · ') }) });
      if (!res.ok) throw new Error('pdf');
      const blob = await res.blob();
      if (!blob.size) throw new Error('prazen');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = ime + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { setNapaka('PDF-ja ni bilo mogoče pripraviti. Poskusi znova.'); } finally { setPdfNalaganje(false); }
  };

  /* PREDOGLED (kot retainer): dejanski PDF, izrisan po straneh kot slike (pdf.js).
     Renderira le v nacinu Predogled (sicer ne obremenjujemo endpointa med urejanjem). */
  useEffect(() => {
    if (!predogledMode) return;
    let ziv = true;
    setPredNal(true);
    const t = window.setTimeout(async () => {
      try {
        const html = doc(izvozniTelo());
        const res = await fetch('/api/ponudba-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, ime: 'predogled' }) });
        if (!res.ok) throw new Error('pdf');
        const buf = await res.arrayBuffer();
        if (!buf.byteLength || !ziv) return;
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        const strani: string[] = [];
        for (let i = 1; i <= pdf.numPages && ziv; i++) {
          const stran = await pdf.getPage(i);
          const vp = stran.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await stran.render({ canvas, canvasContext: ctx, viewport: vp } as unknown as Parameters<typeof stran.render>[0]).promise;
          strani.push(canvas.toDataURL('image/png'));
        }
        if (ziv) setPredStrani(strani);
      } catch { /* tiho — predogled ni kriticen */ } finally { if (ziv) setPredNal(false); }
    }, 700);
    return () => { ziv = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predogledMode, teloHtml, vir, offerId, datum, rocniNarocnik, rocniObseg, ponudnik, dokBarva, dokFont]);

  /* ob spremembi vhodov osvezi telo urejevalnika — LE ce ni rocno urejeno (kot retainer) */
  useEffect(() => {
    if (rocnoTelo) return;
    const html = pogodbaHtml();
    setTeloHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vir, offerId, offers, datum, rocniNarocnik, rocniObseg, ponudnik]);

  /* namig "oznaci besedilo" izgine sam */
  useEffect(() => {
    if (!oznaciNamig) return;
    const t = window.setTimeout(() => setOznaciNamig(false), 1500);
    return () => window.clearTimeout(t);
  }, [oznaciNamig]);

  /* ob menjavi pogleda: urejevalnik nazaj na Uredi in skok na vrh — ENAKO kot
     retainer (Lenis, ce obstaja; sicer window). Preskoci zacetni render. */
  const prviPogled = useRef(true);
  useEffect(() => {
    if (pogled !== 'dokument') { setPredogledMode(false); setPonSheet(null); }
    if (prviPogled.current) { prviPogled.current = false; return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (t: number, o?: { immediate?: boolean; force?: boolean }) => void; resize?: () => void } }).__pinartLenis;
    lenis?.resize?.();
    if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(0, { immediate: reduce, force: true });
    else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [pogled]);

  /* "Pripravi pogodbo": sveze telo iz predloge in preklop na stran dokumenta */
  const pripraviPogodbo = () => {
    setRocnoTelo(false);
    const html = pogodbaHtml();
    setTeloHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setShranjenaId('');
    setKartaOdprta(false);
    setPogled('dokument');
  };
  const novaPogodba = () => {
    setOfferId(''); setRocniNarocnik(''); setRocniObseg(''); setNarEmail('');
    setTeloHtml(''); setRocnoTelo(false); setShranjenaId(''); setNapaka('');
    setDatum(new Date().toISOString().slice(0, 10));
    setPogled('nastavitve');
  };

  /* ── shranjevanje: telo je HTML iz urejevalnika; ponovni klik posodobi isti zapis ── */
  const shrani = () => {
    if (samoOgled) {
      /* obvestilo se izrise na vrhu strani — brez skoka na vrh ga uporabnica na
         dnu dokumenta sploh ne vidi in izgleda, kot da gumb ne dela */
      setNotice('To so demo podatki — shranjevanje ni mogoče. Zgoraj v vrstici preklopi na »Moji podatki«.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const telo = izvozniTelo();
    const obstojeca = contracts.find(c => c.id === shranjenaId);
    const zapis: FlowContract = {
      id: obstojeca?.id || crypto.randomUUID(),
      title: `Pogodba · ${vir === 'ponudba' && selectedOffer ? selectedOffer.title : (rocniNarocnik.trim() || 'brez naslova')}`,
      client: narocnikIme(),
      date: datum,
      status: obstojeca?.status || 'draft',
      sourceOfferId: vir === 'ponudba' ? selectedOffer?.id : undefined,
      body: telo,
    };
    const next = obstojeca ? contracts.map(c => c.id === zapis.id ? { ...c, ...zapis } : c) : [zapis, ...contracts];
    setContracts(next);
    saveFlowCollection('contracts', next);
    setShranjenaId(zapis.id);
    setNotice('Pogodba je shranjena in povezana s projektom.');
    /* po shranjevanju nazaj na prvo stran — nova pogodba je takoj vidna v arhivu
       (Tina: "naj se shrani in vrnem se na prvo stran") */
    setPogled('nastavitve');
  };

  /* ── pot "Od stranke": nalozen dokument (ohranjena stara logika: oblak, rezerva IndexedDB) ── */
  const storeFile = (id: string, file: File) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('pinart-flow-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('contracts');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction('contracts', 'readwrite');
      transaction.objectStore('contracts').put(file, id);
      transaction.oncomplete = () => { request.result.close(); resolve(); };
    };
  });
  const saveUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (samoOgled) {
      /* obvestilo se izrise na vrhu strani — brez skoka na vrh ga uporabnica na
         dnu dokumenta sploh ne vidi in izgleda, kot da gumb ne dela */
      setNotice('To so demo podatki — shranjevanje ni mogoče. Zgoraj v vrstici preklopi na »Moji podatki«.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const data = new FormData(event.currentTarget);
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) return;
    const id = crypto.randomUUID();
    let filePath: string | undefined;
    try { filePath = await uploadBusinessDocument(file, 'contracts', id); } catch { await storeFile(id, file); }
    const zapis: FlowContract = { id, title: String(data.get('title')), client: String(data.get('client')), date: String(data.get('date')), status: 'received', sourceOfferId: String(data.get('sourceOfferId')) || undefined, fileName: file.name, filePath, notes: String(data.get('notes')) };
    const next = [zapis, ...contracts];
    setContracts(next);
    saveFlowCollection('contracts', next);
    setNotice('Prejeta pogodba je shranjena in čaka na pregled.');
    event.currentTarget.reset();
  };

  /* ── posiljanje (mailto vzorec iz kalkulatorja: kratek povzetek, PDF prilozi rocno) ── */
  const posljiMailto = (zPonudbo: boolean) => {
    const nar = narocnikIme();
    const naslov = vir === 'ponudba' ? selectedOffer?.title || '' : '';
    const podpis = [ponudnik.ime.trim(), [ponudnik.email.trim(), ponudnik.telefon.trim() && (predklic + ' ' + ponudnik.telefon.trim())].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
    const v: string[] = ['Pozdravljeni,', ''];
    if (zPonudbo && selectedOffer) {
      /* povzetek ponudbe zraven — stranka mora vedeti, na kaj se pogodba nanasa */
      v.push(`pošiljam ponudbo${selectedOffer.number ? ' št. ' + selectedOffer.number : ''} in pripadajočo pogodbo o sodelovanju za projekt »${selectedOffer.title}«.`, '');
      v.push('Povzetek ponudbe:');
      v.push(`- Projekt: ${selectedOffer.title}`);
      if (selectedOffer.scope.length) selectedOffer.scope.forEach(s => v.push(`- ${s}`));
      if (selectedOffer.agreedAmount > 0) v.push(`- Vrednost: ${eur(selectedOffer.agreedAmount)}`);
      v.push('', 'Pogodba se nanaša na zgornjo ponudbo; oba dokumenta prilagam v PDF.');
    } else {
      v.push(`pošiljam pogodbo o poslovnem sodelovanju${naslov ? ` za projekt »${naslov}«` : nar ? ` (${nar})` : ''}.`, '');
      v.push('Pogodbo prilagam v PDF. Prosim, da jo pregledate; za podpis ali morebitne pripombe sem na voljo.');
    }
    v.push('', 'Lep pozdrav,');
    if (podpis) v.push(podpis);
    const zadeva = zPonudbo ? `Ponudba in pogodba${naslov ? ': ' + naslov : ''}` : `Pogodba${naslov ? ': ' + naslov : nar ? ': ' + nar : ''}`;
    window.location.href = `mailto:${narEmail.trim()}?subject=${encodeURIComponent(zadeva)}&body=${encodeURIComponent(v.join('\n'))}`;
  };

  /* klikabilna kartica ponudbe: klik razpre povzetek obsega INLINE (brez navigacije) */
  const karticaPonudbe = (strnjena = false) => selectedOffer ? (
    <div className={'pg-kponudba' + (strnjena ? ' pg-kp-strnjena' : '')}>
      <button type="button" className="pg-kp-glava" aria-expanded={kartaOdprta} aria-label={`Ponudba ${selectedOffer.title} — prikaži povzetek obsega`} onClick={() => setKartaOdprta(v => !v)}>
        <span className="pg-kp-ikona" aria-hidden>⌁</span>
        <span className="pg-kp-info">
          <strong>{selectedOffer.title}</strong>
          <small>{selectedOffer.client}{selectedOffer.number ? ' · št. ' + selectedOffer.number : ''}{selectedOffer.agreedAmount > 0 ? ' · ' + eur(selectedOffer.agreedAmount) : ''}</small>
        </span>
        <span className="pg-kp-kazalec" aria-hidden>{kartaOdprta ? <CaretUp size={15} weight="bold" /> : <CaretDown size={15} weight="bold" />}</span>
      </button>
      {kartaOdprta && (
        <div className="pg-kp-vec">
          {selectedOffer.scope.length
            ? <ul>{selectedOffer.scope.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
            : <p className="pg-mini">Ponudba nima vpisanega obsega.</p>}
          <a className="pg-povezava" href={`${base}/kalkulator/projekti`}>Odpri v projektih ↗</a>
        </div>
      )}
    </div>
  ) : null;

  return <div className={`${styles.contractPage} pg`}>
    {notice && <div className={styles.contractNotice}>{notice}<button onClick={() => setNotice('')}>×</button></div>}

    {/* ── POGLED 1: NASTAVITVE (SAMO vstop za novo pogodbo — pregled/arhiv
        shranjenih pogodb je preseljen v Arhiv, ArhivWorkspace) ── */}
    {pogled === 'nastavitve' && <div className="pg-stolpec">
      {/* naslov strani samo tu — ozek sredinski stolpec + kicker/h1 (kot retainer rw-kicker/rw-h1),
          NE vec full-width topbar; vstop je brez bele kartice okoli (kot retainer rw-vsebina) */}
      <p className="pg-kicker">Pogodbe</p>
      <h1 className="pg-h1">Dogovor, brez ugibanja.</h1>
      <section className="pg-sek">
        <div className="pg-chat">
          <span className="pg-mehur"><b>Iz česa nastane pogodba?</b><small>Izberi vir spodaj — iz ponudbe, brez nje ali naložena od stranke.</small></span>
        </div>
        <div className="pg-segpills" role="group" aria-label="Vir pogodbe">
          <button type="button" aria-label="Iz ponudbe" className={vir === 'ponudba' ? 'on' : ''} onClick={() => { setVir('ponudba'); setRocnoTelo(false); }}>Iz ponudbe</button>
          <button type="button" aria-label="Brez ponudbe" className={vir === 'rocno' ? 'on' : ''} onClick={() => { setVir('rocno'); setRocnoTelo(false); }}>Brez ponudbe</button>
          <button type="button" aria-label="Od stranke" className={vir === 'stranka' ? 'on' : ''} onClick={() => setVir('stranka')}>Od stranke</button>
        </div>

        {vir === 'ponudba' ? (
          <>
            <div className="pg-polja">
              <label className="pg-polje">Ponudba
                <select value={offerId} onChange={event => { setOfferId(event.target.value); setKartaOdprta(false); setRocnoTelo(false); }}>
                  <option value="">Izberi ponudbo …</option>
                  {offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}
                </select>
              </label>
              <label className="pg-polje">Datum pogodbe
                <input type="date" value={datum} onChange={event => setDatum(event.target.value)} />
              </label>
            </div>
            {karticaPonudbe()}
          </>
        ) : vir === 'stranka' ? (
          /* pot "Od stranke": nalozi in preglej dokument — shrani takoj v arhiv (status Prejeta) */
          <form onSubmit={saveUpload}>
            <div className="pg-polja">
              <label className="pg-polje">Naziv pogodbe
                <input required name="title" type="text" placeholder="npr. Pogodba o sodelovanju 2026" />
              </label>
              <label className="pg-polje">Stranka
                <input required name="client" type="text" placeholder="npr. Odvetniška družba Volk & Babica" />
              </label>
              <label className="pg-polje">Datum prejema
                <input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="pg-polje">Projekt ali ponudba
                <select name="sourceOfferId" defaultValue="">
                  <option value="">Brez povezave</option>
                  {offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}
                </select>
              </label>
            </div>
            <label className="pg-polje pg-polje-obseg">PDF ali Word
              <input required name="file" type="file" accept=".pdf,.doc,.docx" />
            </label>
            <label className="pg-polje pg-polje-obseg">Opombe za pregled
              <textarea name="notes" rows={4} placeholder="Kaj moraš preveriti ali uskladiti?" />
            </label>
            <div className="pg-gumbi">
              <button type="submit" className="pg-gumb" aria-label="Shrani prejeto pogodbo">Shrani prejeto pogodbo</button>
            </div>
          </form>
        ) : (
          <>
            <div className="pg-polja">
              <label className="pg-polje">Naročnik
                <input type="text" placeholder="npr. Odvetniška družba Volk & Babica" value={rocniNarocnik} onChange={event => setRocniNarocnik(event.target.value)} />
              </label>
              <label className="pg-polje">E-pošta naročnika
                <input type="email" placeholder="npr. pisarna@volk-babica.si" value={narEmail} onChange={event => setNarEmail(event.target.value)} />
              </label>
              <label className="pg-polje">Datum pogodbe
                <input type="date" value={datum} onChange={event => setDatum(event.target.value)} />
              </label>
            </div>
            <label className="pg-polje pg-polje-obseg">Obseg (ena postavka na vrstico)
              <textarea rows={4} placeholder={'npr.\nLogotip\nVizitke in dopisni papir'} value={rocniObseg} onChange={event => setRocniObseg(event.target.value)} />
            </label>
            {/* namig: brez ponudbe pogodba nima cene in obsega iz sistema */}
            <p className="pg-namig">Priporočamo: najprej ustvari <b>ponudbo</b> — obseg, cena in številka se v pogodbo prenesejo sami. <a href={`${base}/kalkulator/orodje`}>Odpri kalkulator →</a></p>
          </>
        )}

        {vir !== 'stranka' && <div className="pg-gumbi">
          <button type="button" className="pg-gumb" aria-label="Pripravi pogodbo" disabled={vir === 'ponudba' && !offerId} onClick={pripraviPogodbo}>Pripravi pogodbo →</button>
        </div>}
      </section>
    </div>}

    {/* ── POGLED 2: DOKUMENT (samostojna stran — sredinski ozek stolpec, kot retainer) ── */}
    {pogled === 'dokument' && <section className="pg-sek pg-stran pg-stolpec">
      {/* jasna pot nazaj na vstopni korak — na vrhu, pred dokumentom */}
      <button type="button" className="pg-povezava pg-nazaj-vrh" onClick={() => setPogled('nastavitve')}>← Nazaj</button>
      {vir === 'ponudba' && karticaPonudbe(true)}
      <div className="pg-pon-vrh">
        <div className="pg-segpills" role="group" aria-label="Pogled">
          <button type="button" aria-label="Uredi" className={!predogledMode ? 'on' : ''} onClick={() => setPredogledMode(false)}><PencilSimple size={15} weight="bold" /> Uredi</button>
          <button type="button" aria-label="Predogled" className={predogledMode ? 'on' : ''} onClick={() => setPredogledMode(true)}><Eye size={16} /> Predogled</button>
        </div>
        {/* samo ikona, da gre vse v eno vrstico (enako kot retainer) */}
        {jeMobilni && !predogledMode && (
          <button type="button" className="pg-sheet-trig" onClick={() => setPonSheet(v => (v ? null : 'oblika'))} aria-label="Oblikovanje" title="Oblikovanje">
            <TextAa size={18} weight="bold" />
          </button>
        )}
      </div>

      {predogledMode ? (
        <div className="pg-predogled">
          {predStrani.length
            ? predStrani.map((u, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={i} className="pg-pred-stran" src={u} alt={`Stran ${i + 1}`} />
            ))
            : <div className="pg-pred-prazno">{predNal ? 'Pripravljam predogled …' : 'Predogled ni na voljo'}</div>}
          {predNal && predStrani.length > 0 && <div className="pg-pred-osvezi" role="status">Osvežujem …</div>}
        </div>
      ) : (
        <>
          {/* Orodjarna: kontrole so en fragment; na namizju inline, na mobilu
              slide-up predal V PORTALU na <body> — KOT RETAINER: position:fixed
              neha meriti na zaslon, ce ima katerikoli prednik transform/filter
              (tu animirana .pg-sek), zato sheet NE sme biti znotraj sekcije. */}
          {(() => {
            const orodjaKontrole = <>
              {oznaciNamig && <div className="pg-oznaci-namig" role="status">Najprej označi besedilo</div>}
              <div className="pg-tool-vel2" role="group" aria-label="Velikost besedila">
                <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); velikost(-1); }} title="Manjše" aria-label="Pomanjšaj"><CaretDown size={14} weight="bold" /></button>
                <span className="pg-tv-aa" aria-hidden>Aa</span>
                <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); velikost(1); }} title="Večje" aria-label="Povečaj"><CaretUp size={14} weight="bold" /></button>
              </div>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('bold'); }} title="Krepko" aria-label="Krepko"><TextB size={17} weight="bold" /></button>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('italic'); }} title="Ležeče" aria-label="Ležeče"><TextItalic size={17} /></button>
              <select className="pg-pisava-select" aria-label="Pisava besedila" defaultValue="" onMouseDown={() => editorRef.current?.focus()} onChange={e => { const v = e.target.value; if (v) uporabiPisavo(v); e.currentTarget.value = ''; }}>
                <option value="" disabled>Pisava</option>
                <option value="Bodoni Moda">Elegantna</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Georgia">Georgia</option>
                <option value="Arial">Arial</option>
              </select>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'h1'); }} title="Naslov" aria-label="Naslov H1">H1</button>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'h2'); }} title="Podnaslov" aria-label="Podnaslov H2">H2</button>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'p'); }} title="Navadno besedilo" aria-label="Navadno besedilo P">P</button>
              <span className="pg-tool-locnica" aria-hidden />
              <button type="button" className="pg-barvica pg-barvica-mavrica" aria-label="Barva besedila (poljubna)" title="Barva besedila — poljubna" onMouseDown={e => { e.preventDefault(); barvaRef.current?.click(); }} />
              <input ref={barvaRef} type="color" hidden onChange={e => oblikuj('foreColor', e.target.value)} />
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('hiliteColor', '#FCE38A'); }} onDoubleClick={e => { e.preventDefault(); oblikuj('hiliteColor', 'transparent'); }} title="Označi besedilo — dvojni klik odstrani" aria-label="Označi besedilo"><span className="pg-hl">T</span></button>
            </>;
            if (!jeMobilni) return <div className="pg-orodjarna" aria-label="Oblikovanje besedila">{orodjaKontrole}</div>;
            return typeof document !== 'undefined' ? createPortal(
              <>
                {ponSheet && <div className="pg-sheet-back" onClick={() => setPonSheet(null)} aria-hidden />}
                <div className={'pg-orodjarna pg-orodjarna-sheet' + (ponSheet ? ' odprt' : '')} aria-label="Oblikovanje besedila" aria-hidden={!ponSheet}>
                  <div className="pg-sheet-glava"><b>Oblikovanje</b><button type="button" className="pg-sheet-x" onClick={() => setPonSheet(null)} aria-label="Zapri">✕</button></div>
                  {orodjaKontrole}
                </div>
              </>,
              document.body,
            ) : null;
          })()}
          <div className="pg-editor-ovoj">
            <div ref={napolniEditor} className="pg-editor" contentEditable suppressContentEditableWarning onInput={() => setRocnoTelo(true)} onBlur={sinhronizirajEditor} />
            {/* ikonica za podpis — desno spodaj, ob podpisnih crtah (kot retainer) */}
            <button type="button" className="pg-podpis-trig" onClick={() => setPonSheet(v => v === 'podpis' ? null : 'podpis')} aria-label="Dodaj podpis" title="Dodaj podpis"><PenNib size={18} /></button>
          </div>
          {/* sheet Podpis: portal na <body> (fixed sidro), namizje + mobil — kot retainer */}
          {typeof document !== 'undefined' && createPortal(
            <>
              {ponSheet === 'podpis' && <div className="pg-sheet-back" onClick={() => setPonSheet(null)} aria-hidden />}
              <div className={'pg-podpis-sheet' + (ponSheet === 'podpis' ? ' odprt' : '')} role="dialog" aria-label="Podpis" aria-hidden={ponSheet !== 'podpis'}>
                <div className="pg-sheet-glava"><b>Podpis</b><button type="button" className="pg-sheet-x" onClick={() => setPonSheet(null)} aria-label="Zapri">✕</button></div>
                <div className="pg-podpis-vrsta" role="group" aria-label="Kam gre podpis">
                  <button type="button" aria-label="Podpis izvajalca" className={'pg-cip' + (podpisCilj === 'izvajalec' ? ' on' : '')} onClick={() => setPodpisCilj('izvajalec')}>Izvajalec</button>
                  <button type="button" aria-label="Podpis naročnika" className={'pg-cip' + (podpisCilj === 'narocnik' ? ' on' : '')} onClick={() => setPodpisCilj('narocnik')}>Naročnik</button>
                </div>
                <canvas ref={pripraviPlatno} className="pg-podpis-platno" onPointerDown={zacniRis} onPointerMove={risiPodpis} onPointerUp={koncajRis} onPointerCancel={koncajRis} />
                <div className="pg-podpis-akcije">
                  <button type="button" aria-label="Počisti podpis" className="pg-cip" onClick={pocistiPodpis}>Počisti</button>
                  <button type="button" aria-label="Vstavi podpis" className="pg-gumb" disabled={!narisano} onClick={vstaviNarisanPodpis}>Vstavi podpis</button>
                </div>
                <div className="pg-podpis-ali">ali</div>
                <button type="button" aria-label="Naloži sliko podpisa" className="pg-cip" onClick={() => podpisDatotekaRef.current?.click()}>Naloži sliko podpisa …</button>
                <input ref={podpisDatotekaRef} type="file" accept="image/*" hidden onChange={naloziPodpisSliko} />
              </div>
            </>,
            document.body,
          )}
          {rocnoTelo && (
            <p className="pg-mini" style={{ marginTop: '.5rem' }}>Besedilo je ročno urejeno in se ob spremembi vhodov ne posodablja več samodejno. <button type="button" className="pg-povezava" onClick={ponastaviTelo}>Povrni samodejno besedilo</button></p>
          )}
        </>
      )}

      <div className="pg-gumbi">
        <button type="button" className="pg-gumb" aria-label="Zaključi" onClick={() => setPogled('zakljucek')}>Zaključi →</button>
        <button type="button" className="pg-gumb sek" aria-label="Prenesi pogodbo PDF" disabled={pdfNalaganje} onClick={prenesi}>{pdfNalaganje ? 'Pripravljam …' : 'Prenesi PDF'}</button>
        <button type="button" className="pg-gumb sek" aria-label="Shrani pogodbo" onClick={shrani}>Shrani pogodbo</button>
      </div>
      {napaka && <p className="pg-napaka">{napaka}</p>}
      <p className="pg-mini" style={{ marginTop: '.7rem' }}>Besedilo preveri; Pinart ne nadomešča pravnega svetovanja.</p>
    </section>}

    {/* ── POGLED 3: ZAKLJUCEK (prenos + posiljanje + shranjevanje) ── */}
    {pogled === 'zakljucek' && <section className="pg-sek pg-stran pg-stolpec pg-zakljucek">
      <p className={styles.eyebrow}>POGODBA{vir === 'ponudba' && selectedOffer?.number ? ` · PONUDBA ŠT. ${selectedOffer.number}` : ''}</p>
      <h2 className="pg-naslov">Zaključek.</h2>
      <p className="pg-uvod">Prenesi pogodbo{narocnikIme() ? ' za ' + narocnikIme() : ''}, jo shrani ali pošlji naročniku.</p>
      <div className="pg-polja pg-polja-email">
        <label className="pg-polje">E-pošta naročnika
          <input type="email" placeholder="npr. pisarna@volk-babica.si" value={narEmail} onChange={event => setNarEmail(event.target.value)} />
        </label>
      </div>
      <div className="pg-gumbi">
        <button type="button" className="pg-gumb" aria-label="Prenesi pogodbo PDF" disabled={pdfNalaganje} onClick={prenesi}>{pdfNalaganje ? 'Pripravljam …' : 'Prenesi pogodbo (PDF)'}</button>
        <button type="button" className="pg-gumb sek" aria-label="Pošlji pogodbo" onClick={() => posljiMailto(false)}>Pošlji pogodbo</button>
        {vir === 'ponudba' && selectedOffer && <button type="button" className="pg-gumb sek" aria-label="Pošlji ponudbo in pogodbo" onClick={() => posljiMailto(true)}>Pošlji ponudbo + pogodbo</button>}
        <button type="button" className="pg-gumb sek" aria-label="Shrani pogodbo" onClick={shrani}>{shranjenaId ? 'Shranjeno ✓ (posodobi)' : 'Shrani pogodbo'}</button>
      </div>
      {napaka && <p className="pg-napaka">{napaka}</p>}
      <p className="pg-mini" style={{ marginTop: '.7rem' }}>E-pošta odpre tvoj poštni program s pripravljenim sporočilom — PDF pogodbe (in ponudbe) pripni ročno.</p>
      <div className="pg-koncna-nav">
        <button type="button" className="pg-povezava" onClick={() => setPogled('dokument')}>← Uredi pogodbo</button>
        <button type="button" className="pg-povezava" onClick={novaPogodba}>↺ Nova pogodba</button>
      </div>
    </section>}

    {/* stili kot retainer: navaden <style> (globalno), zato pg- predpona povsod */}
    <style>{`
      .pg{min-width:0}
      .pg .pg-sek{min-width:0}
      .pg-sek{animation:pgSek .5s cubic-bezier(.16,1,.3,1) both}
      /* KONEC animacije mora biti transform:NONE (ne translateY(0)): vsak transform != none
         na sekciji naredi, da se position:fixed otrok sidra na sekcijo namesto na zaslon. */
      @keyframes pgSek{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      /* izrazit slide-up (nova stran) za pogled dokument/zakljucek — kot rw-stran */
      .pg-sek.pg-stran{animation:pgStran .5s cubic-bezier(.16,1,.3,1) both}
      @keyframes pgStran{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){.pg-sek,.pg-sek.pg-stran{animation:none}}
      /* pogled dokumenta/zakljucka: sredinski ozek stolpec kot retainer (.rw-vsebina).
         max-width namesto min(700px,92vw), ker je stars ozji od viewporta (stranski meni). */
      /* sredinski ozek stolpec SAMO za pogled dokumenta/zakljucka (kot retainer);
         landing (vstop + arhiv) ostane cez sirino delovnega prostora */
      .pg-stolpec{width:100%;max-width:700px;margin-left:auto;margin-right:auto}
      .pg-nazaj-vrh{margin:0 0 1rem}

      /* vstopni kicker+h1 (kot retainer rw-kicker/rw-h1) — naslov strani zdaj v ozkem .pg-stolpec, brez bele kartice */
      .pg-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#B25476);margin:0 0 .3rem}
      .pg-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(2.4rem,6vw,4rem);line-height:1;letter-spacing:-.012em;margin:0 0 1.6rem;color:var(--ink)}
      .pg-naslov{margin:.35rem 0 1.1rem;font:500 clamp(1.7rem,2.6vw,2.4rem)/1.05 var(--font-serif),Georgia,serif;color:var(--ink);overflow-wrap:anywhere}
      .pg-uvod{margin:0 0 1.4rem;font-size:.92rem;line-height:1.55;color:rgba(17,17,17,.72);max-width:34rem}

      /* chat mehurcek vstopnega vprasanja — isti videz kot RetainerWorkspace .rw-chat/.rw-mehur */
      .pg-chat{display:flex;align-items:flex-start;gap:.55rem;max-width:90%;margin:0 0 1.2rem}
      .pg-mehur{position:relative;background:#F7F2FF;border:1px solid rgba(185,160,230,.2);border-radius:18px;border-bottom-left-radius:5px;padding:.85rem 1.25rem .85rem 2.75rem;box-shadow:0 2px 10px rgba(40,25,40,.05)}
      .pg-mehur::before{content:"";position:absolute;left:.9rem;top:.95rem;width:1.3rem;height:1.3rem;border-radius:50%;background:radial-gradient(58% 48% at 30% 24%,rgba(255,255,255,.92),rgba(255,255,255,0) 62%),conic-gradient(from 210deg,#7C3AED,#EC4899,#F59E0B,#38BDF8,#7C3AED);box-shadow:0 2px 6px rgba(124,58,237,.28)}
      .pg-mehur b{display:block;color:var(--ink);font-weight:600;font-size:1.02rem}
      .pg-mehur small{display:block;margin-top:.1rem;color:rgba(17,17,17,.64);font-size:.82rem}
      .pg-zakljucek{background:#FCFBF7;border:1px solid rgba(17,17,17,.08);border-radius:20px;padding:1.6rem 1.7rem 1.9rem;box-shadow:0 4px 18px rgba(17,17,17,.04)}

      .pg-segpills{display:inline-flex;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.25rem;gap:.15rem;margin:0 0 1.1rem}
      .pg-segpills button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .9rem;border-radius:999px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:.35rem;transition:background .18s,color .18s}
      .pg-segpills button.on{background:var(--ink);color:var(--paper)}

      .pg-polja{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem 1.5rem;margin:0 0 1.1rem;min-width:0}
      .pg-polja>*{min-width:0}
      .pg-polja-email{grid-template-columns:minmax(0,26rem);margin-top:.4rem}
      .pg-polje{display:flex;flex-direction:column;gap:.35rem;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(17,17,17,.62)}
      .pg-polje input,.pg-polje select,.pg-polje textarea{width:100%;max-width:100%;min-width:0;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid rgba(17,17,17,.16);border-radius:10px;padding:.6rem .75rem}
      .pg-polje input:focus,.pg-polje select:focus,.pg-polje textarea:focus{outline:none;border-color:var(--ink)}
      .pg-polje textarea{resize:vertical;min-height:6.5rem;line-height:1.5;font-weight:500}
      .pg-polje-obseg{margin:0 0 1.1rem}

      .pg-namig{margin:0 0 1.2rem;padding:.8rem 1rem;border:1px dashed rgba(178,84,118,.45);border-radius:12px;background:rgba(178,84,118,.06);font-size:.85rem;line-height:1.5;color:rgba(17,17,17,.75)}
      .pg-namig a{color:var(--accent,#B25476);font-weight:600;text-decoration:underline;text-underline-offset:.22em;white-space:nowrap}

      /* klikabilna kartica ponudbe (vir dogovora) */
      .pg-kponudba{border:1px solid rgba(17,17,17,.12);border-radius:14px;background:rgba(255,255,255,.72);margin:0 0 1.2rem;overflow:hidden;min-width:0}
      .pg-kp-glava{display:flex;align-items:center;gap:.75rem;width:100%;padding:.8rem .95rem;border:none;background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer;min-width:0}
      .pg-kp-glava:hover strong{text-decoration:underline;text-underline-offset:.2rem}
      .pg-kp-ikona{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:50%;background:oklch(92% .055 163);color:oklch(48% .14 164);flex:none}
      .pg-kp-info{flex:1;min-width:0}
      .pg-kp-info strong{display:block;font-size:.95rem;font-weight:700;overflow-wrap:anywhere}
      .pg-kp-info small{display:block;margin-top:.12rem;font-size:.78rem;color:rgba(17,17,17,.58);overflow-wrap:anywhere}
      .pg-kp-kazalec{display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:50%;background:rgba(17,17,17,.06);color:var(--ink);flex:none}
      .pg-kp-vec{padding:.15rem .95rem 1rem;border-top:1px dashed rgba(17,17,17,.12)}
      .pg-kp-vec ul{margin:.7rem 0 .8rem;padding-left:1.15rem;font-size:.85rem;line-height:1.55;color:rgba(17,17,17,.8)}
      .pg-kp-vec li{margin:.15rem 0}
      .pg-kp-strnjena{background:#FCFBF7;box-shadow:0 4px 14px rgba(17,17,17,.05);margin-bottom:1rem}

      .pg-gumbi{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.3rem;min-width:0}
      .pg-gumb{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:.5rem;border:none;border-radius:999px;padding:.85rem 1.6rem;font:inherit;font-weight:600;font-size:.95rem;cursor:pointer;background:var(--ink);color:var(--paper);transition:transform .2s,opacity .2s}
      .pg-gumb:hover{transform:translateY(-2px)}
      .pg-gumb.sek{background:transparent;color:var(--ink);border:1px solid rgba(17,17,17,.28)}
      .pg-gumb:disabled{opacity:.5;cursor:default;transform:none}
      .pg-povezava{font-family:inherit;font-size:.88rem;font-weight:500;cursor:pointer;border:none;background:none;color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.28em;padding:0;display:inline-flex;align-items:center;gap:.38rem}
      .pg-povezava:hover{opacity:.6}
      .pg-koncna-nav{display:flex;flex-wrap:wrap;gap:1.4rem;margin-top:1.8rem;padding-top:1.3rem;border-top:1px solid rgba(17,17,17,.1)}
      .pg-mini{font-size:.8rem;color:rgba(17,17,17,.55)}
      .pg-napaka{color:#b23434;font-size:.86rem;margin:.6rem 0 0}
      .pg-cip{padding:.42rem .8rem;border:1px solid rgba(17,17,17,.2);border-radius:999px;background:rgba(255,255,255,.5);cursor:pointer;font:inherit;font-size:.86rem;color:var(--ink);transition:border-color .15s,background .15s,color .15s}
      .pg-cip:hover{border-color:var(--ink)}
      .pg-cip.on{border-color:var(--accent,#B25476);background:var(--accent,#B25476);color:#fff;font-weight:600}

      /* UREDI/PREDOGLED vrh + orodjarna + urejevalnik — KOPIJA retainerja (rw- -> pg-) */
      .pg-pon-vrh{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:.2rem 0 .4rem}
      .pg-pon-vrh .pg-segpills{margin:0}
      .pg-orodjarna{position:relative;display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin:1rem 0 .8rem}
      .pg-sheet-trig{display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;padding:0;border:1px solid rgba(17,17,17,.22);border-radius:999px;background:var(--paper);color:var(--ink);cursor:pointer}
      .pg-sheet-back{position:fixed;inset:0;background:rgba(30,18,35,.34);z-index:95}
      .pg-sheet-glava{position:relative;display:flex;align-items:center;justify-content:space-between;width:100%;padding:1.35rem 1.2rem .65rem;border-bottom:1px solid rgba(17,17,17,.1)}
      .pg-sheet-glava::before{content:'';position:absolute;top:.5rem;left:50%;transform:translateX(-50%);width:2.4rem;height:.3rem;border-radius:999px;background:rgba(17,17,17,.18)}
      .pg-sheet-glava b{font-size:1.05rem;font-weight:700}
      .pg-sheet-x{width:2.1rem;height:2.1rem;display:inline-flex;align-items:center;justify-content:center;border:none;background:rgba(17,17,17,.06);border-radius:50%;font-size:1.1rem;line-height:1;color:var(--ink);cursor:pointer}
      .pg-oznaci-namig{position:absolute;top:-2.5rem;left:1rem;background:var(--ink);color:var(--paper);font-size:.8rem;font-weight:600;padding:.4rem .85rem;border-radius:999px;white-space:nowrap;box-shadow:0 8px 22px rgba(17,17,17,.22);z-index:6;pointer-events:none}
      .pg-tool-krog{width:2.6rem;height:2.6rem;border-radius:50%;border:none;background:rgba(17,17,17,.06);color:var(--ink);font-family:inherit;font-weight:700;font-size:.82rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:background .15s,color .15s}
      .pg-tool-krog:hover{background:var(--ink);color:var(--paper)}
      .pg-tool-vel2{display:inline-flex;align-items:center;gap:.3rem}
      .pg-tool-vel2 .pg-tv-aa{font-weight:700;font-size:.9rem}
      .pg-tool-locnica{width:1px;height:1.7rem;background:rgba(17,17,17,.16);margin:0 .2rem}
      .pg-hl{font-weight:800;font-size:.9rem;line-height:1;background:#FCE38A;border-radius:2px;padding:0 .18em}
      .pg-pisava-select{min-height:2.25rem;border:1px solid rgba(17,17,17,.22);background-color:rgba(255,255,255,.32);color:var(--ink);border-radius:999px;padding:0 1.7rem 0 .9rem;font-family:inherit;font-weight:600;font-size:.78rem;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .7rem center}
      .pg-barvica{width:1.35rem;height:1.35rem;border-radius:999px;border:1px solid rgba(17,17,17,.22);cursor:pointer;padding:0}
      .pg-barvica-mavrica{background:conic-gradient(from 0deg,#FA4892,#F8E71C,#50E3C2,#7C3AED,#FA4892);border-color:rgba(17,17,17,.25)}

      .pg-editor-ovoj{position:relative;min-width:0}
      .pg-podpis-trig{position:absolute;right:.65rem;bottom:.65rem;width:2.5rem;height:2.5rem;border-radius:50%;border:1px solid rgba(17,17,17,.22);background:var(--paper);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(17,17,17,.14);z-index:2;transition:background .15s,color .15s}
      .pg-podpis-trig:hover{background:var(--ink);color:var(--paper)}
      .pg-podpis-sheet{position:fixed;left:50%;bottom:0;transform:translate(-50%,102%);width:min(480px,100vw);z-index:96;background:var(--paper);border-radius:20px 20px 0 0;box-shadow:0 -16px 44px rgba(40,25,40,.22);transition:transform .32s cubic-bezier(.2,.8,.3,1);max-height:82dvh;overflow-y:auto;padding:0 1.2rem calc(1.4rem + env(safe-area-inset-bottom,0px))}
      .pg-podpis-sheet.odprt{transform:translate(-50%,0)}
      @media (prefers-reduced-motion:reduce){.pg-podpis-sheet{transition:none}}
      .pg-podpis-vrsta{display:flex;gap:.5rem;margin:1rem 0 .7rem}
      .pg-podpis-platno{display:block;width:100%;height:170px;border:1px dashed rgba(17,17,17,.3);border-radius:12px;background:#fff;touch-action:none;cursor:crosshair}
      .pg-podpis-akcije{display:flex;gap:.6rem;margin-top:.8rem;flex-wrap:wrap;align-items:center}
      .pg-podpis-ali{margin:1rem 0 .6rem;font-size:.72rem;color:rgba(17,17,17,.5);text-transform:uppercase;letter-spacing:.14em;font-weight:700}

      .pg-editor,.pg-doktelo{width:100%;min-width:0;border:1px solid rgba(17,17,17,.22);background:#fff;padding:1.35rem;color:var(--ink);font-family:var(--font-sans),system-ui,sans-serif;font-size:.94rem;line-height:1.62;overflow:auto;border-radius:6px}
      .pg-editor{min-height:340px}
      .pg-editor:focus{outline:none;border-color:var(--ink)}
      .pg-editor h1,.pg-doktelo h1{margin:0 0 .6rem;font-family:var(--font-serif),Didot,serif;font-size:clamp(1.5rem,3.4vw,2.1rem);line-height:1.05;font-weight:600}
      .pg-editor h2,.pg-doktelo h2{margin:1.2rem 0 .4rem;font-size:.74rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent,#B25476)}
      .pg-editor p,.pg-doktelo p{margin:0 0 .7rem;max-width:70ch}
      .pg-editor b,.pg-editor strong,.pg-doktelo b,.pg-doktelo strong{font-weight:800}
      .pg-editor ul,.pg-doktelo ul{margin:.2rem 0 .9rem;padding-left:1.2rem;list-style:disc}
      .pg-editor li,.pg-doktelo li{margin:.2rem 0}
      .pg-editor .kick,.pg-doktelo .kick{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#B25476);font-weight:700;margin-bottom:.3rem}
      .pg-editor .meta,.pg-doktelo .meta{color:#666;font-size:.85rem;margin:.1rem 0 .6rem}
      .pg-editor .mut,.pg-doktelo .mut{color:#8a8177;font-size:.82rem}
      .pg-editor .pog-clen,.pg-doktelo .pog-clen{margin:.7rem 0}
      .pg-editor .pog-clen h2,.pg-doktelo .pog-clen h2{margin:.6rem 0 .2rem}
      .pg-editor .parties p,.pg-doktelo .parties p{margin:.1rem 0}
      .pg-editor .sig,.pg-doktelo .sig{display:flex;gap:2.5rem;margin-top:1.4rem}
      .pg-editor .sig>div,.pg-doktelo .sig>div{flex:1;font-size:.85rem;color:#444}
      .pg-editor .sig .lin,.pg-doktelo .sig .lin{display:block;border-top:1px solid #111;margin:2rem 0 .3rem}
      .pg-editor .podpis-img,.pg-doktelo .podpis-img{display:block;max-height:52px;max-width:200px;margin:0 0 -8px}
      /* letterhead se v telesu ne pojavi (doda ga PDF), a ce je v starem HTML zapisu, naj bo urejen */
      .pg-doktelo .lg{display:flex;justify-content:space-between;gap:1.4rem;padding-bottom:.7rem;border-bottom:1.5px solid #B25476;margin-bottom:1.1rem}
      .pg-doktelo{flex:1 1 auto;min-height:0;margin:1rem 0 0;font-size:.86rem}

      .pg-predogled{position:relative;width:100%;margin-top:1rem;background:#e9e6e0;border:1px solid rgba(17,17,17,.12);border-radius:14px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:18px;box-shadow:inset 0 1px 6px rgba(20,20,20,.06)}
      .pg-pred-stran{width:100%;max-width:794px;height:auto;display:block;box-shadow:0 6px 22px rgba(20,20,20,.14);border-radius:2px}
      .pg-pred-prazno{color:rgba(17,17,17,.5);font-size:.9rem;padding:2.5rem 0}
      .pg-pred-osvezi{position:absolute;top:10px;right:12px;font-size:.72rem;color:rgba(17,17,17,.55);background:rgba(255,255,255,.72);padding:.2rem .55rem;border-radius:999px}

      /* ── mobil: NIC ne sme cez desni rob pri 390px (kot retainer) ── */
      @media (max-width:640px){
        .pg-chat{max-width:100%}
        .pg-polja{grid-template-columns:1fr;gap:1rem}
        .pg-zakljucek{padding:1.2rem 1rem 1.3rem}
        .pg-editor,.pg-editor h1,.pg-editor h2,.pg-editor p,.pg-editor li,.pg-doktelo,.pg-doktelo h1,.pg-doktelo h2,.pg-doktelo p,.pg-doktelo li{overflow-wrap:anywhere}
        /* podpisni stolpci se na ozkem zaslonu zlozijo navpicno (kot retainer) */
        .pg-editor .sig,.pg-doktelo .sig{flex-direction:column;gap:1.2rem}
        .pg-orodjarna.pg-orodjarna-sheet{position:fixed;left:0;right:0;bottom:0;z-index:96;margin:0;max-height:76dvh;overflow-y:auto;padding:0 1.2rem calc(1.5rem + env(safe-area-inset-bottom,0px));background:var(--paper);border-radius:20px 20px 0 0;box-shadow:0 -16px 44px rgba(40,25,40,.22);transform:translateY(102%);transition:transform .32s cubic-bezier(.2,.8,.3,1)}
        .pg-orodjarna.pg-orodjarna-sheet.odprt{transform:translateY(0)}
        .pg-orodjarna.pg-orodjarna-sheet > *:not(.pg-sheet-glava){margin-top:.55rem}
        .pg-gumbi{gap:.6rem}
        .pg-gumb{padding:.8rem 1.25rem}
      }
    `}</style>
  </div>;
}
