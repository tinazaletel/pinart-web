'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CalendarBlank,
  Check,
  CheckSquare,
  Code,
  EnvelopeSimple,
  Megaphone,
  PaintBrushBroad,
  PencilSimple,
  Plus,
  ShareNetwork,
  Sparkle,
  Trash,
  X,
} from '@phosphor-icons/react';
import {
  MARKETING_PREDLOGE,
  novaMarketingKampanja,
  preberiMarketingKampanje,
  shraniMarketingKampanje,
  type MarketingKampanja,
  type MarketingPredloga,
  type MarketingStatus,
  type MarketingVrsta,
} from '@/lib/marketing';
import styles from './MarketingWorkspace.module.css';

type Zavihek = 'pregled' | 'objave' | 'kampanje' | 'predloge' | 'povezave';
type SocialKanal = 'instagram' | 'facebook' | 'linkedin';
type NacrtovanaObjava = { id: string; kanal: SocialKanal; besedilo: string; datum: string; ustvarjeno: string };

const OBJAVE_KLJUC = 'pinart-flow-marketing-objave-v1';
const SOCIAL_LINKI: Record<SocialKanal, string> = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  linkedin: 'https://www.linkedin.com/feed/',
};
const SOCIAL_OZNAKE: Record<SocialKanal, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const PRAZEN = {
  naslov: '',
  vrsta: 'email' as MarketingVrsta,
  status: 'osnutek' as MarketingStatus,
  datumOd: '',
  datumDo: '',
  opis: '',
};

const oznakeVrste: Record<MarketingVrsta, string> = {
  email: 'E-pošta',
  vprasalnik: 'Vprašalnik',
  social: 'Družbena omrežja',
};

const oznakeStatusa: Record<MarketingStatus, string> = {
  osnutek: 'Osnutek',
  nacrtovano: 'Načrtovano',
  aktivno: 'Aktivno',
  zakljuceno: 'Zaključeno',
};

function formatirajRazpon(kampanja: MarketingKampanja) {
  const od = kampanja.datumOd || kampanja.datum;
  const doDatuma = kampanja.datumDo || kampanja.datum;
  const formatiraj = (datum: string) => new Date(`${datum}T12:00:00`).toLocaleDateString('sl-SI');

  if (!od && !doDatuma) return 'Brez obdobja';
  if (od && doDatuma && od !== doDatuma) return `${formatiraj(od)}–${formatiraj(doDatuma)}`;
  return formatiraj(od || doDatuma!);
}

function IkonaVrste({ vrsta, size = 20 }: { vrsta: MarketingVrsta; size?: number }) {
  if (vrsta === 'email') return <EnvelopeSimple size={size} aria-hidden="true" />;
  if (vrsta === 'vprasalnik') return <Code size={size} aria-hidden="true" />;
  return <ShareNetwork size={size} aria-hidden="true" />;
}

export default function MarketingWorkspace({ base }: { base: string }) {
  const [zavihek, setZavihek] = useState<Zavihek>('pregled');
  const [kampanje, setKampanje] = useState<MarketingKampanja[]>([]);
  const [obrazecOdprt, setObrazecOdprt] = useState(false);
  const [urejamId, setUrejamId] = useState<string | null>(null);
  const [obrazec, setObrazec] = useState(PRAZEN);
  const [objave, setObjave] = useState<NacrtovanaObjava[]>([]);
  const [objava, setObjava] = useState<{ kanal: SocialKanal; besedilo: string; datum: string }>({ kanal: 'instagram', besedilo: '', datum: '' });
  const [kopiranoId, setKopiranoId] = useState<string | null>(null);

  useEffect(() => {
    setKampanje(preberiMarketingKampanje());
    try {
      const shranjene = window.localStorage.getItem(OBJAVE_KLJUC);
      setObjave(shranjene ? JSON.parse(shranjene) : []);
    } catch { setObjave([]); }
  }, []);

  useEffect(() => {
    if (!obrazecOdprt) return;
    const zapri = (dogodek: KeyboardEvent) => dogodek.key === 'Escape' && setObrazecOdprt(false);
    document.addEventListener('keydown', zapri);
    return () => document.removeEventListener('keydown', zapri);
  }, [obrazecOdprt]);

  const aktivne = useMemo(
    () => kampanje.filter((kampanja) => kampanja.status === 'aktivno' || kampanja.status === 'nacrtovano').length,
    [kampanje],
  );

  const povzetek = useMemo(() => {
    const stevci = kampanje.reduce<Record<MarketingStatus, number>>(
      (rezultat, kampanja) => ({ ...rezultat, [kampanja.status]: rezultat[kampanja.status] + 1 }),
      { osnutek: 0, nacrtovano: 0, aktivno: 0, zakljuceno: 0 },
    );
    const danes = new Date().toISOString().slice(0, 10);
    const naslednja = [...kampanje]
      .filter((kampanja) => (kampanja.datumOd || kampanja.datum || '') >= danes)
      .sort((a, b) => (a.datumOd || a.datum || '').localeCompare(b.datumOd || b.datum || ''))[0];
    return { stevci, naslednja };
  }, [kampanje]);

  const odpriNovo = (vrsta: MarketingVrsta = 'email') => {
    setUrejamId(null);
    setObrazec({ ...PRAZEN, vrsta });
    setObrazecOdprt(true);
  };

  const uporabiPredlogo = (predloga: MarketingPredloga) => {
    setUrejamId(null);
    setObrazec({ ...PRAZEN, naslov: predloga.naslov, opis: predloga.opis, vrsta: predloga.vrsta });
    setObrazecOdprt(true);
  };

  const uredi = (kampanja: MarketingKampanja) => {
    setUrejamId(kampanja.id);
    setObrazec({
      naslov: kampanja.naslov,
      vrsta: kampanja.vrsta,
      status: kampanja.status,
      datumOd: kampanja.datumOd || kampanja.datum || '',
      datumDo: kampanja.datumDo || kampanja.datum || '',
      opis: kampanja.opis || '',
    });
    setObrazecOdprt(true);
  };

  const shrani = (dogodek: FormEvent) => {
    dogodek.preventDefault();
    const naslednje = urejamId
      ? kampanje.map((kampanja) => kampanja.id === urejamId ? { ...kampanja, ...obrazec } : kampanja)
      : [novaMarketingKampanja(obrazec), ...kampanje];
    setKampanje(naslednje);
    shraniMarketingKampanje(naslednje);
    setObrazecOdprt(false);
    setZavihek('kampanje');
  };

  const izbrisi = (id: string) => {
    const naslednje = kampanje.filter((kampanja) => kampanja.id !== id);
    setKampanje(naslednje);
    shraniMarketingKampanje(naslednje);
  };

  const shraniObjavo = (dogodek: FormEvent) => {
    dogodek.preventDefault();
    const nova: NacrtovanaObjava = {
      ...objava,
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `objava-${Date.now()}`,
      ustvarjeno: new Date().toISOString(),
    };
    const naslednje = [nova, ...objave];
    setObjave(naslednje);
    window.localStorage.setItem(OBJAVE_KLJUC, JSON.stringify(naslednje));
    setObjava({ kanal: objava.kanal, besedilo: '', datum: '' });
  };

  const izbrisiObjavo = (id: string) => {
    const naslednje = objave.filter((vnos) => vnos.id !== id);
    setObjave(naslednje);
    window.localStorage.setItem(OBJAVE_KLJUC, JSON.stringify(naslednje));
  };

  const kopirajObjavo = async (vnos: NacrtovanaObjava) => {
    await navigator.clipboard.writeText(vnos.besedilo);
    setKopiranoId(vnos.id);
    window.setTimeout(() => setKopiranoId((trenutni) => trenutni === vnos.id ? null : trenutni), 1800);
  };

  const Objave = () => (
    <section className={styles.postPlanner} aria-labelledby="objave-naslov">
      <header className={styles.sectionHeader}>
        <div><p className={styles.sectionLabel}>NAČRTOVALEC OBJAV</p><h2 id="objave-naslov">Pripravi. Kopiraj. Objavi.</h2><p>Flow pripravi načrt; objavo na omrežju vedno potrdiš in objaviš sama.</p></div>
        <span className={styles.betaNote}>AI predlogi · kmalu (beta)</span>
      </header>
      <div className={styles.plannerGrid}>
        <form className={styles.postForm} onSubmit={shraniObjavo}>
          <label>Kanal<select value={objava.kanal} onChange={(e) => setObjava({ ...objava, kanal: e.target.value as SocialKanal })}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option></select></label>
          <label>Datum objave<input required type="date" value={objava.datum} onChange={(e) => setObjava({ ...objava, datum: e.target.value })} /></label>
          <label className={styles.captionField}>Besedilo objave<textarea required value={objava.besedilo} onChange={(e) => setObjava({ ...objava, besedilo: e.target.value })} placeholder="Napiši uvod, glavno sporočilo in jasen naslednji korak …" /></label>
          <p className={styles.manualNote}>Flow vsebine ne objavi samodejno. Po shranjevanju jo kopiraš in odpreš izbrano omrežje.</p>
          <button className={styles.primary} type="submit">Shrani načrtovano objavo</button>
        </form>
        <div className={styles.postList} aria-live="polite">
          {objave.length === 0 ? <div className={styles.postEmpty}><ShareNetwork size={30} /><strong>Še nimaš načrtovanih objav.</strong><p>Prva se bo po shranjevanju prikazala tukaj.</p></div> : objave.map((vnos) => (
            <article className={styles.postCard} key={vnos.id}>
              <header><span>{SOCIAL_OZNAKE[vnos.kanal]}</span><time dateTime={vnos.datum}>{new Date(`${vnos.datum}T12:00:00`).toLocaleDateString('sl-SI')}</time></header>
              <p>{vnos.besedilo}</p>
              <div className={styles.postActions}>
                <button className={styles.secondary} type="button" onClick={() => kopirajObjavo(vnos)}>{kopiranoId === vnos.id ? <Check size={18} /> : <Code size={18} />}{kopiranoId === vnos.id ? 'Kopirano' : 'Kopiraj besedilo'}</button>
                <a className={styles.primary} href={SOCIAL_LINKI[vnos.kanal]} target="_blank" rel="noreferrer">Odpri {SOCIAL_OZNAKE[vnos.kanal]} <ArrowRight size={18} /></a>
                <button className={styles.iconButton} type="button" onClick={() => izbrisiObjavo(vnos.id)} aria-label="Izbriši načrtovano objavo"><Trash size={19} /></button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  const Kampanje = () => (
    <section className={styles.campaigns} aria-labelledby="kampanje-naslov">
      <header className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionLabel}>KAMPANJE</p>
          <h2 id="kampanje-naslov">Od zamisli do objave.</h2>
          <p>{kampanje.length === 0 ? 'Prva kampanja se začne z enim jasnim ciljem.' : `${aktivne} aktivnih ali načrtovanih · ${kampanje.length} skupaj`}</p>
        </div>
        <button className={styles.secondary} type="button" onClick={() => odpriNovo()}><Plus size={18} /> Nova kampanja</button>
      </header>
      {kampanje.length === 0 ? (
        <div className={styles.empty}>
          <Megaphone size={34} aria-hidden="true" />
          <strong>Tu bodo tvoje kampanje.</strong>
          <p>Izberi predlogo ali začni prazno. Osnutek se shrani v tvojem brskalniku.</p>
          <button className={styles.primary} type="button" onClick={() => setZavihek('predloge')}>Poglej predloge <ArrowRight size={18} /></button>
        </div>
      ) : (
        <div className={styles.campaignList}>
          {kampanje.map((kampanja) => (
            <article className={styles.campaignRow} key={kampanja.id}>
              <span className={styles.campaignIcon}><IkonaVrste vrsta={kampanja.vrsta} /></span>
              <span className={styles.campaignTitle}>
                <strong>{kampanja.naslov}</strong>
                <small>{oznakeVrste[kampanja.vrsta]}{kampanja.opis ? ` · ${kampanja.opis}` : ''}</small>
              </span>
              <span className={styles.campaignDate}>{formatirajRazpon(kampanja)}</span>
              <span className={styles.status} data-status={kampanja.status}>{oznakeStatusa[kampanja.status]}</span>
              <span className={styles.rowActions}>
                <button className={styles.iconButton} type="button" onClick={() => uredi(kampanja)} aria-label={`Uredi ${kampanja.naslov}`}><PencilSimple size={19} /></button>
                <button className={styles.iconButton} type="button" onClick={() => izbrisi(kampanja.id)} aria-label={`Izbriši ${kampanja.naslov}`}><Trash size={19} /></button>
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const Predloge = () => (
    <section className={styles.templates} aria-labelledby="predloge-naslov">
      <header className={styles.sectionHeader}>
        <div><p className={styles.sectionLabel}>PREDLOGE</p><h2 id="predloge-naslov">Začni z dobro osnovo.</h2></div>
      </header>
      <div className={styles.templateGrid}>
        {MARKETING_PREDLOGE.map((predloga) => (
          <article className={styles.templateCard} key={predloga.id}>
            <IkonaVrste vrsta={predloga.vrsta} size={25} />
            {predloga.oznaka && <span className={styles.badge}>{predloga.oznaka}</span>}
            <h3>{predloga.naslov}</h3>
            <p>{predloga.opis}</p>
            <button className={styles.templateButton} type="button" onClick={() => uporabiPredlogo(predloga)}>Uporabi predlogo <ArrowRight size={17} /></button>
          </article>
        ))}
      </div>
    </section>
  );

  const Povezave = () => (
    <section className={styles.templates} aria-labelledby="povezave-naslov">
      <header className={styles.sectionHeader}>
        <div><p className={styles.sectionLabel}>POVEZAVE</p><h2 id="povezave-naslov">Vse ostane v tvojem toku.</h2><p>Marketing se poveže z orodji, ki jih že uporabljaš v Flowu.</p></div>
      </header>
      <div className={styles.integrationGrid}>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><CalendarBlank size={25} /><span className={styles.connectionState} data-ready="true">Vključeno</span></div><h3>Flow Koledar</h3><p>Načrtovani datumi kampanj so pripravljeni za pregled ob drugih rokih.</p><Link className={styles.secondary} href={`${base}/kalkulator/koledar`}>Odpri koledar</Link></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><CheckSquare size={25} /><span className={styles.connectionState} data-ready="true">Vključeno</span></div><h3>Flow Naloge</h3><p>Pripravo besedil, vizualov in objav vodiš kot opravila.</p><Link className={styles.secondary} href={`${base}/kalkulator/naloge`}>Odpri naloge</Link></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><EnvelopeSimple size={25} /><span className={styles.connectionState}>Kmalu</span></div><h3>Pošiljanje e-pošte</h3><p>Pred dejanskim pošiljanjem bomo dodali privolitev, odjavo in zanesljivo dostavo.</p></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><ShareNetwork size={25} /><span className={styles.connectionState}>Kmalu (beta)</span></div><h3>Družbena omrežja</h3><p>Objave načrtuješ v Flowu, nato besedilo kopiraš in jih ročno objaviš. Samodejna objava še ni na voljo.</p><button className={styles.secondary} type="button" onClick={() => setZavihek('objave')}>Odpri načrtovalec</button></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><Megaphone size={25} /><span className={styles.connectionState}>Načrtovano</span></div><h3>Merjenje obiska</h3><p>Ko povežeš analitiko, bo kampanja pokazala tudi obisk, povpraševanja in dejanski rezultat.</p></article>
      </div>
    </section>
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>MARKETING</p>
          <h2>Naj te opazijo pravi ljudje.</h2>
          <p>Načrtuj kampanje, pripravi vsebine in poveži roke z nalogami — brez še enega nepovezanega orodja.</p>
        </div>
        <button className={styles.primary} type="button" onClick={() => odpriNovo()}><Plus size={19} /> Nova kampanja</button>
      </section>

      <nav className={styles.tabs} aria-label="Marketing pogledi">
        {([['pregled', 'Pregled'], ['objave', 'Objave'], ['kampanje', 'Kampanje'], ['predloge', 'Predloge'], ['povezave', 'Povezave']] as const).map(([id, napis]) => (
          <button key={id} className={styles.tab} type="button" data-active={zavihek === id} onClick={() => setZavihek(id)}>{napis}</button>
        ))}
      </nav>

      {zavihek === 'pregled' && <>
        <section className={styles.overviewGrid} aria-label="Povzetek kampanj">
          <article><span>Aktivno</span><strong>{povzetek.stevci.aktivno}</strong><small>kampanj v teku</small></article>
          <article><span>Načrtovano</span><strong>{povzetek.stevci.nacrtovano}</strong><small>pripravljenih kampanj</small></article>
          <article><span>Osnutki</span><strong>{povzetek.stevci.osnutek}</strong><small>idej za dokončanje</small></article>
          <article className={styles.nextCampaign}>
            <span>Naslednji rok</span>
            <strong>{povzetek.naslednja ? formatirajRazpon(povzetek.naslednja) : '—'}</strong>
            <small>{povzetek.naslednja?.naslov || 'Ko določiš datum, ga vidiš tukaj.'}</small>
          </article>
        </section>
        <section className={styles.quickGrid} aria-label="Hitri začetki">
          <button className={styles.quickCard} type="button" onClick={() => odpriNovo('email')}><EnvelopeSimple aria-hidden="true" /><h2>E-pošta</h2><p>Dobrodošlice, novosti in premišljena sporočila ob pravem času.</p><span className={styles.cardLink}>Ustvari sporočilo →</span></button>
          <button className={styles.quickCard} type="button" onClick={() => odpriNovo('vprasalnik')}><Code aria-hidden="true" /><h2>Vprašalnik</h2><p>Zberi kakovostna povpraševanja z obrazcem za svojo spletno stran.</p><span className={styles.cardLink}>Pripravi obrazec →</span></button>
          <button className={styles.quickCard} type="button" onClick={() => odpriNovo('social')}><ShareNetwork aria-hidden="true" /><h2>Družbena omrežja</h2><p>Objave spremeni v jasen načrt z roki in opravili.</p><span className={styles.cardLink}>Načrtuj objavo →</span></button>
        </section>
        <section className={styles.designBanner} aria-labelledby="grafika-naslov">
          <span className={styles.designIcon} aria-hidden="true"><PaintBrushBroad size={30} weight="light" /></span>
          <div className={styles.designCopy}>
            <p className={styles.sectionLabel}>PINART STUDIO</p>
            <h2 id="grafika-naslov">Potrebuješ tudi grafična dela?</h2>
            <p>Če vizualov ne pripravljaš sama, ti Pinart oblikuje oglase, objave, tiskovine ali celotno kampanjsko podobo.</p>
            <ul className={styles.designTags} aria-label="Grafične storitve">
              <li>Oglasi</li><li>Objave</li><li>Tiskovine</li><li>Kampanjska podoba</li>
            </ul>
          </div>
          <div className={styles.designActions}>
            <Link className={styles.secondary} href={`${base}/services/graphic`}>Poglej storitve <ArrowRight size={18} /></Link>
            <Link className={styles.primary} href={`${base}/kalkulator/orodje`}>Pripravi ponudbo <ArrowRight size={18} /></Link>
          </div>
        </section>
        <section className={styles.flowCard}>
          <div><p className={styles.sectionLabel}>POVEZANO S FLOWOM</p><h2>Kampanja ni osamljen seznam.</h2><p>Roke vodiš v koledarju, pripravo vsebin pa med nalogami. Tako vidiš, kaj sledi in kdo mora kaj dokončati.</p></div>
          <div className={styles.flowActions}><Link className={styles.secondary} href={`${base}/kalkulator/naloge`}><CheckSquare size={18} /> Naloge</Link><Link className={styles.secondary} href={`${base}/kalkulator/koledar`}><CalendarBlank size={18} /> Koledar</Link></div>
        </section>
        <Kampanje />
        <Predloge />
      </>}
      {zavihek === 'kampanje' && <Kampanje />}
      {zavihek === 'objave' && <Objave />}
      {zavihek === 'predloge' && <Predloge />}
      {zavihek === 'povezave' && <Povezave />}

      {obrazecOdprt && (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setObrazecOdprt(false)}>
          <section className={styles.formPanel} role="dialog" aria-modal="true" aria-labelledby="marketing-obrazec-naslov">
            <button className={styles.close} type="button" onClick={() => setObrazecOdprt(false)} aria-label="Zapri"><X size={20} /></button>
            <Sparkle size={25} aria-hidden="true" />
            <h2 id="marketing-obrazec-naslov">{urejamId ? 'Uredi kampanjo.' : 'Nova kampanja.'}</h2>
            <p>Najprej zapiši namen in rok. Vsebino lahko razviješ kasneje.</p>
            <form className={styles.form} onSubmit={shrani}>
              <label>Ime kampanje<input required value={obrazec.naslov} onChange={(e) => setObrazec({ ...obrazec, naslov: e.target.value })} placeholder="Npr. Jesenska predstavitev storitve" autoFocus /></label>
              <label>Vrsta<select value={obrazec.vrsta} onChange={(e) => setObrazec({ ...obrazec, vrsta: e.target.value as MarketingVrsta })}><option value="email">E-pošta</option><option value="vprasalnik">Spletni vprašalnik</option><option value="social">Družbena omrežja</option></select></label>
              <label>Status<select value={obrazec.status} onChange={(e) => setObrazec({ ...obrazec, status: e.target.value as MarketingStatus })}><option value="osnutek">Osnutek</option><option value="nacrtovano">Načrtovano</option><option value="aktivno">Aktivno</option><option value="zakljuceno">Zaključeno</option></select></label>
              <label>Začetek<input type="date" value={obrazec.datumOd} max={obrazec.datumDo || undefined} onChange={(e) => setObrazec({ ...obrazec, datumOd: e.target.value })} /></label>
              <label>Konec<input type="date" value={obrazec.datumDo} min={obrazec.datumOd || undefined} onChange={(e) => setObrazec({ ...obrazec, datumDo: e.target.value })} /></label>
              <label>Kratek opis<textarea value={obrazec.opis} onChange={(e) => setObrazec({ ...obrazec, opis: e.target.value })} placeholder="Kaj želiš doseči in komu govoriš?" /></label>
              <div className={styles.formActions}><button className={styles.quietButton} type="button" onClick={() => setObrazecOdprt(false)}>Prekliči</button><button className={styles.primary} type="submit">Shrani kampanjo</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
