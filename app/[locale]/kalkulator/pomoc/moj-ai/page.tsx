import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { AI_PONUDNIKI } from '@/lib/aiPonudniki';

export const metadata: Metadata = { title: 'Poveži svoj AI | Pinart Flow', robots: { index: false, follow: false } };

/* ZBRANA NAVODILA: kako priti do API ključa pri vsakem ponudniku.
   Isti podatki kot v obrazcu (lib/aiPonudniki) — en sam vir, da se ne razideta. */
export default async function Stran({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  const jeEn = locale === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  return <main className={styles.shell}>
    <DashboardSidebar base={base} active="settings" />
    <section className={styles.workspace}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>{L('POMOČ', 'HELP')}</p>
          <h1>{L('Poveži svoj AI', 'Connect your own AI')}</h1>
        </div>
      </header>

      <div style={{ maxWidth: '46rem', display: 'flex', flexDirection: 'column', gap: '1.4rem', paddingBottom: '3rem' }}>
        <p style={{ margin: 0, fontSize: '.92rem', lineHeight: 1.6, color: '#4a453f' }}>
          {L('Pupa je vključena v tvoj paket in strošek krije Pinart. Če imaš svoj račun pri ponudniku AI, ga lahko povežeš — takrat porabo plačuješ svojemu ponudniku, Pupina kvota pa ostane nedotaknjena.',
             'Pupa is included in your plan and Pinart covers the cost. If you have your own account with an AI provider, you can connect it — usage is then billed by your provider and your Pupa quota stays untouched.')}
        </p>

        <div style={{ padding: '.9rem 1.1rem', border: '1px solid #6E4FA6', borderRadius: '.9rem', background: 'rgba(110,79,166,.06)' }}>
          <strong style={{ fontSize: '.86rem', color: '#4a2f70' }}>
            {L('Najpogostejša zmeda', 'The most common confusion')}
          </strong>
          <p style={{ margin: '.35rem 0 0', fontSize: '.86rem', lineHeight: 1.55, color: '#4a453f' }}>
            {L('Naročnina na ChatGPT Plus ali Claude Pro NE vključuje API-ja. To sta dve ločeni stvari: naročnina je za klepet v njihovi aplikaciji, API pa se plačuje po porabi. Če ključ ne deluje, je razlog skoraj vedno manjkajoče dobroimetje.',
               'A ChatGPT Plus or Claude Pro subscription does NOT include API access. They are two separate things: the subscription is for chatting in their app, while the API is billed per use. If a key does not work, the reason is almost always missing credit.')}
          </p>
        </div>

        {AI_PONUDNIKI.map(p => (
          <article key={p.id} style={{ padding: '1.1rem 1.2rem', border: '1px solid rgba(17,17,17,.1)', borderRadius: '1rem', background: '#fff' }}>
            <h2 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#111' }}>{p.ime}</h2>
            {p.model && (
              <p style={{ margin: '.25rem 0 0', fontSize: '.78rem', color: '#8a8177' }}>
                {L('Privzeti model', 'Default model')}: <code>{p.model}</code>
              </p>
            )}
            <ol style={{ margin: '.7rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '.4rem', fontSize: '.88rem', lineHeight: 1.55, color: '#4a453f' }}>
              {(jeEn ? p.korakiEn : p.korakiSl).map((k, i) => <li key={i}>{k}</li>)}
            </ol>
            {p.url && (
              <a href={p.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: '.7rem', fontSize: '.82rem', fontWeight: 700, color: '#6E4FA6' }}>
                {L('Odpri stran ponudnika →', 'Open the provider page →')}
              </a>
            )}
          </article>
        ))}

        <div style={{ padding: '.9rem 1.1rem', border: '1px solid rgba(17,17,17,.1)', borderRadius: '.9rem', background: '#fff' }}>
          <strong style={{ fontSize: '.86rem' }}>{L('Ko imaš ključ', 'Once you have the key')}</strong>
          <p style={{ margin: '.35rem 0 .6rem', fontSize: '.86rem', lineHeight: 1.55, color: '#4a453f' }}>
            {L('Prilepi ga v Nastavitve → Moj AI in klikni »Preveri povezavo«. Ključ se šifrira na strežniku in se nikoli ne vrne v brskalnik — vidiš le zadnje štiri znake.',
               'Paste it into Settings → My AI and click “Test connection”. The key is encrypted on the server and never returned to the browser — you only see the last four characters.')}
          </p>
          <Link href={`${base}/kalkulator/nastavitve`} style={{ fontSize: '.82rem', fontWeight: 700, color: '#6E4FA6' }}>
            {L('Odpri Nastavitve → Moj AI →', 'Open Settings → My AI →')}
          </Link>
        </div>
      </div>
    </section>
  </main>;
}
