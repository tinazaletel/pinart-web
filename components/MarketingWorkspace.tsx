'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
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

type Prevod = (sl: string, en: string) => string;

const oznakeVrste = (L: Prevod): Record<MarketingVrsta, string> => ({
  email: L('E-pošta', 'Email'),
  vprasalnik: L('Vprašalnik', 'Questionnaire'),
  social: L('Družbena omrežja', 'Social media'),
});

const oznakeStatusa = (L: Prevod): Record<MarketingStatus, string> => ({
  osnutek: L('Osnutek', 'Draft'),
  nacrtovano: L('Načrtovano', 'Planned'),
  aktivno: L('Aktivno', 'Active'),
  zakljuceno: L('Zaključeno', 'Completed'),
});

function formatirajRazpon(kampanja: MarketingKampanja, L: Prevod) {
  const od = kampanja.datumOd || kampanja.datum;
  const doDatuma = kampanja.datumDo || kampanja.datum;
  const formatiraj = (datum: string) => new Date(`${datum}T12:00:00`).toLocaleDateString('sl-SI');

  if (!od && !doDatuma) return L('Brez obdobja', 'No period');
  if (od && doDatuma && od !== doDatuma) return `${formatiraj(od)}–${formatiraj(doDatuma)}`;
  return formatiraj(od || doDatuma!);
}

function IkonaVrste({ vrsta, size = 20 }: { vrsta: MarketingVrsta; size?: number }) {
  if (vrsta === 'email') return <EnvelopeSimple size={size} aria-hidden="true" />;
  if (vrsta === 'vprasalnik') return <Code size={size} aria-hidden="true" />;
  return <ShareNetwork size={size} aria-hidden="true" />;
}

export default function MarketingWorkspace({ base }: { base: string }) {
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);
  const dl = locale === 'en' ? 'en-GB' : 'sl-SI';
  const vrsteOznake = oznakeVrste(L);
  const statusiOznake = oznakeStatusa(L);
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
    /* predloga vodi v PRAVO orodje glede na vrsto — ne vse v isti generični obrazec */
    if (predloga.vrsta === 'social') {
      setObjava((o) => ({ ...o, besedilo: predloga.opis }));
      setZavihek('objave');
      return;
    }
    setUrejamId(null);
    setObrazec({ ...PRAZEN, naslov: predloga.naslov, opis: predloga.opis, vrsta: predloga.vrsta });
    setObrazecOdprt(true);
    setZavihek('kampanje');
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
        <div><p className={styles.sectionLabel}>{L('NAČRTOVALEC OBJAV', 'POST PLANNER')}</p><h2 id="objave-naslov">{L('Pripravi. Kopiraj. Objavi.', 'Prepare. Copy. Post.')}</h2><p>{L('Flow pripravi načrt; objavo na omrežju vedno potrdiš in objaviš sama.', 'Flow prepares the plan; you always confirm and publish the post to the network yourself.')}</p></div>
        <span className={styles.betaNote}>{L('AI predlogi · kmalu (beta)', 'AI suggestions · coming soon (beta)')}</span>
      </header>
      <div className={styles.plannerGrid}>
        <form className={styles.postForm} onSubmit={shraniObjavo}>
          <label>{L('Kanal', 'Channel')}<select value={objava.kanal} onChange={(e) => setObjava({ ...objava, kanal: e.target.value as SocialKanal })}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option></select></label>
          <label>{L('Datum objave', 'Post date')}<input required type="date" value={objava.datum} onChange={(e) => setObjava({ ...objava, datum: e.target.value })} />{objava.datum && <small style={{ display: 'block', marginTop: '.3rem', fontSize: '.72rem', color: 'rgba(17,17,17,.6)' }}>{new Date(objava.datum + 'T00:00:00').toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small>}</label>
          <label className={styles.captionField}>{L('Besedilo objave', 'Post text')}<textarea required value={objava.besedilo} onChange={(e) => setObjava({ ...objava, besedilo: e.target.value })} placeholder={L('Napiši uvod, glavno sporočilo in jasen naslednji korak …', 'Write an intro, the main message and a clear next step …')} /></label>
          <p className={styles.manualNote}>{L('Flow vsebine ne objavi samodejno. Po shranjevanju jo kopiraš in odpreš izbrano omrežje.', 'Flow does not post content automatically. After saving, you copy it and open the chosen network.')}</p>
          <button className={styles.primary} type="submit">{L('Shrani načrtovano objavo', 'Save planned post')}</button>
        </form>
        <div className={styles.postList} aria-live="polite">
          {objave.length === 0 ? <div className={styles.postEmpty}><ShareNetwork size={30} /><strong>{L('Še nimaš načrtovanih objav.', 'You have no planned posts yet.')}</strong><p>{L('Prva se bo po shranjevanju prikazala tukaj.', 'The first one will appear here after you save it.')}</p></div> : objave.map((vnos) => (
            <article className={styles.postCard} key={vnos.id}>
              <header><span>{SOCIAL_OZNAKE[vnos.kanal]}</span><time dateTime={vnos.datum}>{new Date(`${vnos.datum}T12:00:00`).toLocaleDateString(dl)}</time></header>
              <p>{vnos.besedilo}</p>
              <div className={styles.postActions}>
                <button className={styles.secondary} type="button" onClick={() => kopirajObjavo(vnos)}>{kopiranoId === vnos.id ? <Check size={18} /> : <Code size={18} />}{kopiranoId === vnos.id ? L('Kopirano', 'Copied') : L('Kopiraj besedilo', 'Copy text')}</button>
                <a className={styles.primary} href={SOCIAL_LINKI[vnos.kanal]} target="_blank" rel="noreferrer">{L('Odpri', 'Open')} {SOCIAL_OZNAKE[vnos.kanal]} <ArrowRight size={18} /></a>
                <button className={styles.iconButton} type="button" onClick={() => izbrisiObjavo(vnos.id)} aria-label={L('Izbriši načrtovano objavo', 'Delete planned post')}><Trash size={19} /></button>
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
          <p className={styles.sectionLabel}>{L('KAMPANJE', 'CAMPAIGNS')}</p>
          <h2 id="kampanje-naslov">{L('Od zamisli do objave.', 'From idea to launch.')}</h2>
          <p>{kampanje.length === 0 ? L('Prva kampanja se začne z enim jasnim ciljem.', 'The first campaign starts with one clear goal.') : L(`${aktivne} aktivnih ali načrtovanih · ${kampanje.length} skupaj`, `${aktivne} active or planned · ${kampanje.length} total`)}</p>
        </div>
        <button className={styles.secondary} type="button" onClick={() => odpriNovo()}><Plus size={18} /> {L('Nova kampanja', 'New campaign')}</button>
      </header>
      {kampanje.length === 0 ? (
        <div className={styles.empty}>
          <Megaphone size={34} aria-hidden="true" />
          <strong>{L('Tu bodo tvoje kampanje.', 'Your campaigns will live here.')}</strong>
          <p>{L('Izberi predlogo ali začni prazno. Osnutek se shrani v tvojem brskalniku.', 'Pick a template or start blank. The draft is saved in your browser.')}</p>
          <button className={styles.primary} type="button" onClick={() => setZavihek('predloge')}>{L('Poglej predloge', 'View templates')} <ArrowRight size={18} /></button>
        </div>
      ) : (
        <div className={styles.campaignList}>
          {kampanje.map((kampanja) => (
            <article className={styles.campaignRow} key={kampanja.id}>
              <span className={styles.campaignIcon}><IkonaVrste vrsta={kampanja.vrsta} /></span>
              <span className={styles.campaignTitle}>
                <strong>{kampanja.naslov}</strong>
                <small>{vrsteOznake[kampanja.vrsta]}{kampanja.opis ? ` · ${kampanja.opis}` : ''}</small>
              </span>
              <span className={styles.campaignDate}>{formatirajRazpon(kampanja, L)}</span>
              <span className={styles.status} data-status={kampanja.status}>{statusiOznake[kampanja.status]}</span>
              <span className={styles.rowActions}>
                <button className={styles.iconButton} type="button" onClick={() => uredi(kampanja)} aria-label={L(`Uredi ${kampanja.naslov}`, `Edit ${kampanja.naslov}`)}><PencilSimple size={19} /></button>
                <button className={styles.iconButton} type="button" onClick={() => izbrisi(kampanja.id)} aria-label={L(`Izbriši ${kampanja.naslov}`, `Delete ${kampanja.naslov}`)}><Trash size={19} /></button>
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
        <div><p className={styles.sectionLabel}>{L('PREDLOGE', 'TEMPLATES')}</p><h2 id="predloge-naslov">{L('Začni z dobro osnovo.', 'Start with a solid base.')}</h2></div>
      </header>
      <div className={styles.templateGrid}>
        {MARKETING_PREDLOGE.map((predloga) => (
          <article className={styles.templateCard} key={predloga.id}>
            <IkonaVrste vrsta={predloga.vrsta} size={25} />
            {predloga.oznaka && <span className={styles.badge}>{predloga.oznaka}</span>}
            <h3>{predloga.naslov}</h3>
            <p>{predloga.opis}</p>
            <button className={styles.templateButton} type="button" onClick={() => uporabiPredlogo(predloga)}>{L('Uporabi predlogo', 'Use template')} <ArrowRight size={17} /></button>
          </article>
        ))}
      </div>
    </section>
  );

  const Povezave = () => (
    <section className={styles.templates} aria-labelledby="povezave-naslov">
      <header className={styles.sectionHeader}>
        <div><p className={styles.sectionLabel}>{L('POVEZAVE', 'CONNECTIONS')}</p><h2 id="povezave-naslov">{L('Vse ostane v tvojem toku.', 'Everything stays in your flow.')}</h2><p>{L('Marketing se poveže z orodji, ki jih že uporabljaš v Flowu.', 'Marketing connects to the tools you already use in Flow.')}</p></div>
      </header>
      <div className={styles.integrationGrid}>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><CalendarBlank size={25} /><span className={styles.connectionState} data-ready="true">{L('Vključeno', 'Enabled')}</span></div><h3>{L('Flow Koledar', 'Flow Calendar')}</h3><p>{L('Načrtovani datumi kampanj so pripravljeni za pregled ob drugih rokih.', 'Planned campaign dates are ready to review alongside your other deadlines.')}</p><Link className={styles.secondary} href={`${base}/kalkulator/koledar`}>{L('Odpri koledar', 'Open calendar')}</Link></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><CheckSquare size={25} /><span className={styles.connectionState} data-ready="true">{L('Vključeno', 'Enabled')}</span></div><h3>{L('Flow Naloge', 'Flow Tasks')}</h3><p>{L('Pripravo besedil, vizualov in objav vodiš kot opravila.', 'You manage copy, visuals and post prep as tasks.')}</p><Link className={styles.secondary} href={`${base}/kalkulator/naloge`}>{L('Odpri naloge', 'Open tasks')}</Link></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><EnvelopeSimple size={25} /><span className={styles.connectionState}>{L('Kmalu', 'Soon')}</span></div><h3>{L('Pošiljanje e-pošte', 'Email sending')}</h3><p>{L('Pred dejanskim pošiljanjem bomo dodali privolitev, odjavo in zanesljivo dostavo.', 'Before any real sending, we will add consent, unsubscribe and reliable delivery.')}</p></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><ShareNetwork size={25} /><span className={styles.connectionState}>{L('Kmalu (beta)', 'Soon (beta)')}</span></div><h3>{L('Družbena omrežja', 'Social media')}</h3><p>{L('Objave načrtuješ v Flowu, nato besedilo kopiraš in jih ročno objaviš. Samodejna objava še ni na voljo.', 'You plan posts in Flow, then copy the text and publish them manually. Automatic posting is not available yet.')}</p><button className={styles.secondary} type="button" onClick={() => setZavihek('objave')}>{L('Odpri načrtovalec', 'Open planner')}</button></article>
        <article className={styles.integrationCard}><div className={styles.integrationHead}><Megaphone size={25} /><span className={styles.connectionState}>{L('Načrtovano', 'Planned')}</span></div><h3>{L('Merjenje obiska', 'Traffic tracking')}</h3><p>{L('Ko povežeš analitiko, bo kampanja pokazala tudi obisk, povpraševanja in dejanski rezultat.', 'Once you connect analytics, each campaign will also show traffic, inquiries and real results.')}</p></article>
      </div>
    </section>
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>MARKETING</p>
          <h2>{L('Naj te opazijo pravi ljudje.', 'Get noticed by the right people.')}</h2>
          <p>{L('Načrtuj kampanje, pripravi vsebine in poveži roke z nalogami — brez še enega nepovezanega orodja.', 'Plan campaigns, prepare content and tie deadlines to tasks — without yet another disconnected tool.')}</p>
        </div>
        <button className={styles.primary} type="button" onClick={() => odpriNovo()}><Plus size={19} /> {L('Nova kampanja', 'New campaign')}</button>
      </section>

      <nav className={styles.tabs} aria-label={L('Marketing pogledi', 'Marketing views')}>
        {([['pregled', L('Pregled', 'Overview')], ['objave', L('Objave', 'Posts')], ['kampanje', L('Kampanje', 'Campaigns')], ['predloge', L('Predloge', 'Templates')], ['povezave', L('Povezave', 'Connections')]] as const).map(([id, napis]) => (
          <button key={id} className={styles.tab} type="button" data-active={zavihek === id} onClick={() => setZavihek(id)}>{napis}</button>
        ))}
      </nav>

      {zavihek === 'pregled' && <>
        <section className={styles.overviewGrid} aria-label={L('Povzetek kampanj', 'Campaign summary')}>
          <article><span>{L('Aktivno', 'Active')}</span><strong>{povzetek.stevci.aktivno}</strong><small>{L('kampanj v teku', 'campaigns in progress')}</small></article>
          <article><span>{L('Načrtovano', 'Planned')}</span><strong>{povzetek.stevci.nacrtovano}</strong><small>{L('pripravljenih kampanj', 'campaigns ready')}</small></article>
          <article><span>{L('Osnutki', 'Drafts')}</span><strong>{povzetek.stevci.osnutek}</strong><small>{L('idej za dokončanje', 'ideas to finish')}</small></article>
          <article className={styles.nextCampaign}>
            <span>{L('Naslednji rok', 'Next deadline')}</span>
            <strong>{povzetek.naslednja ? formatirajRazpon(povzetek.naslednja, L) : '—'}</strong>
            <small>{povzetek.naslednja?.naslov || L('Ko določiš datum, ga vidiš tukaj.', 'Once you set a date, you will see it here.')}</small>
          </article>
        </section>
        <section className={styles.quickGrid} aria-label={L('Hitri začetki', 'Quick starts')}>
          <button className={styles.quickCard} type="button" onClick={() => odpriNovo('email')}><EnvelopeSimple aria-hidden="true" /><h2>{L('E-pošta', 'Email')}</h2><p>{L('Dobrodošlice, novosti in premišljena sporočila ob pravem času.', 'Welcomes, updates and thoughtful messages at the right time.')}</p><span className={styles.cardLink}>{L('Ustvari sporočilo →', 'Create a message →')}</span></button>
          <button className={styles.quickCard} type="button" onClick={() => odpriNovo('vprasalnik')}><Code aria-hidden="true" /><h2>{L('Vprašalnik', 'Questionnaire')}</h2><p>{L('Zberi kakovostna povpraševanja z obrazcem za svojo spletno stran.', 'Collect quality inquiries with a form for your website.')}</p><span className={styles.cardLink}>{L('Pripravi obrazec →', 'Build a form →')}</span></button>
          <button className={styles.quickCard} type="button" onClick={() => odpriNovo('social')}><ShareNetwork aria-hidden="true" /><h2>{L('Družbena omrežja', 'Social media')}</h2><p>{L('Objave spremeni v jasen načrt z roki in opravili.', 'Turn posts into a clear plan with deadlines and tasks.')}</p><span className={styles.cardLink}>{L('Načrtuj objavo →', 'Plan a post →')}</span></button>
        </section>
        <section className={styles.designBanner} aria-labelledby="grafika-naslov">
          <span className={styles.designIcon} aria-hidden="true"><PaintBrushBroad size={30} weight="light" /></span>
          <div className={styles.designCopy}>
            <p className={styles.sectionLabel}>PINART STUDIO</p>
            <h2 id="grafika-naslov">{L('Potrebuješ tudi grafična dela?', 'Need graphic work too?')}</h2>
            <p>{L('Če vizualov ne pripravljaš sama, ti Pinart oblikuje oglase, objave, tiskovine ali celotno kampanjsko podobo.', 'If you do not create the visuals yourself, Pinart designs your ads, posts, print materials or the whole campaign look.')}</p>
            <ul className={styles.designTags} aria-label={L('Grafične storitve', 'Graphic services')}>
              <li>{L('Oglasi', 'Ads')}</li><li>{L('Objave', 'Posts')}</li><li>{L('Tiskovine', 'Print')}</li><li>{L('Kampanjska podoba', 'Campaign look')}</li><li>{L('Spletna stran', 'Website')}</li>
            </ul>
          </div>
          <div className={styles.designActions}>
            <Link className={styles.secondary} href={`${base}/services/graphic`}>{L('Poglej storitve', 'View services')} <ArrowRight size={18} /></Link>
            <Link className={styles.primary} href={`${base}/kalkulator/orodje`}>{L('Oddaj povpraševanje', 'Send an inquiry')} <ArrowRight size={18} /></Link>
          </div>
        </section>
        <section className={styles.flowCard}>
          <div><p className={styles.sectionLabel}>{L('POVEZANO S FLOWOM', 'CONNECTED TO FLOW')}</p><h2>{L('Kampanja ni osamljen seznam.', 'A campaign is not an isolated list.')}</h2><p>{L('Roke vodiš v koledarju, pripravo vsebin pa med nalogami. Tako vidiš, kaj sledi in kdo mora kaj dokončati.', 'You track deadlines in the calendar and content prep among your tasks. That way you see what is next and who needs to finish what.')}</p></div>
          <div className={styles.flowActions}><Link className={styles.secondary} href={`${base}/kalkulator/naloge`}><CheckSquare size={18} /> {L('Naloge', 'Tasks')}</Link><Link className={styles.secondary} href={`${base}/kalkulator/koledar`}><CalendarBlank size={18} /> {L('Koledar', 'Calendar')}</Link></div>
        </section>
        {Kampanje()}
        {Predloge()}
      </>}
      {zavihek === 'kampanje' && Kampanje()}
      {zavihek === 'objave' && Objave()}
      {zavihek === 'predloge' && Predloge()}
      {zavihek === 'povezave' && Povezave()}

      {obrazecOdprt && (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setObrazecOdprt(false)}>
          <section className={styles.formPanel} role="dialog" aria-modal="true" aria-labelledby="marketing-obrazec-naslov">
            <button className={styles.close} type="button" onClick={() => setObrazecOdprt(false)} aria-label={L('Zapri', 'Close')}><X size={20} /></button>
            <Sparkle size={25} aria-hidden="true" />
            <h2 id="marketing-obrazec-naslov">{urejamId ? L('Uredi kampanjo.', 'Edit campaign.') : L('Nova kampanja.', 'New campaign.')}</h2>
            <p>{L('Najprej zapiši namen in rok. Vsebino lahko razviješ kasneje.', 'First write down the purpose and deadline. You can develop the content later.')}</p>
            <form className={styles.form} onSubmit={shrani}>
              <label>{L('Ime kampanje', 'Campaign name')}<input required value={obrazec.naslov} onChange={(e) => setObrazec({ ...obrazec, naslov: e.target.value })} placeholder={L('Npr. Jesenska predstavitev storitve', 'E.g. Autumn service launch')} autoFocus /></label>
              <label>{L('Vrsta', 'Type')}<select value={obrazec.vrsta} onChange={(e) => setObrazec({ ...obrazec, vrsta: e.target.value as MarketingVrsta })}><option value="email">{L('E-pošta', 'Email')}</option><option value="vprasalnik">{L('Spletni vprašalnik', 'Online questionnaire')}</option><option value="social">{L('Družbena omrežja', 'Social media')}</option></select></label>
              <label>Status<select value={obrazec.status} onChange={(e) => setObrazec({ ...obrazec, status: e.target.value as MarketingStatus })}><option value="osnutek">{L('Osnutek', 'Draft')}</option><option value="nacrtovano">{L('Načrtovano', 'Planned')}</option><option value="aktivno">{L('Aktivno', 'Active')}</option><option value="zakljuceno">{L('Zaključeno', 'Completed')}</option></select></label>
              <label>{L('Začetek', 'Start')}<input type="date" value={obrazec.datumOd} max={obrazec.datumDo || undefined} onChange={(e) => setObrazec({ ...obrazec, datumOd: e.target.value })} />{obrazec.datumOd && <small style={{ display: 'block', marginTop: '.3rem', fontSize: '.72rem', color: 'rgba(17,17,17,.6)' }}>{new Date(obrazec.datumOd + 'T00:00:00').toLocaleDateString(dl, { day: 'numeric', month: 'long', year: 'numeric' })}</small>}</label>
              <label>{L('Konec', 'End')}<input type="date" value={obrazec.datumDo} min={obrazec.datumOd || undefined} onChange={(e) => setObrazec({ ...obrazec, datumDo: e.target.value })} />{obrazec.datumDo && <small style={{ display: 'block', marginTop: '.3rem', fontSize: '.72rem', color: 'rgba(17,17,17,.6)' }}>{new Date(obrazec.datumDo + 'T00:00:00').toLocaleDateString(dl, { day: 'numeric', month: 'long', year: 'numeric' })}</small>}</label>
              <label>{L('Kratek opis', 'Short description')}<textarea value={obrazec.opis} onChange={(e) => setObrazec({ ...obrazec, opis: e.target.value })} placeholder={L('Kaj želiš doseči in komu govoriš?', 'What do you want to achieve and who are you speaking to?')} /></label>
              <div className={styles.formActions}><button className={styles.quietButton} type="button" onClick={() => setObrazecOdprt(false)}>{L('Prekliči', 'Cancel')}</button><button className={styles.primary} type="submit">{L('Shrani kampanjo', 'Save campaign')}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
