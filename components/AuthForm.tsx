'use client';

import { potVstopneStrani } from '@/lib/vstopnaStran';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/[locale]/kalkulator/prijava/prijava.module.css';

type Mode = 'signin' | 'signup' | 'reset';

/* Supabase vraca angleske napake. Prevedemo znane, NEZNANE pa pokazemo dobesedno —
   prej je vse padlo v "E-posta ali geslo ni pravilno", zato je bila npr. nepotrjena
   registracija videti kot napacno geslo in se ni dalo ugotoviti, kaj je narobe. */
function prevediNapako(sporocilo: string, jeEn = false): string {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const m = sporocilo.toLowerCase();
  if (m.includes('email not confirmed')) return L('Račun še ni potrjen. Preveri e-pošto (tudi vsiljeno pošto) ali si spodaj pošlji novo potrditveno povezavo.', 'Your account is not confirmed yet. Check your email (including spam) or send yourself a new confirmation link below.');
  if (m.includes('invalid login credentials')) return L('E-pošta ali geslo ni pravilno.', 'Incorrect email or password.');
  if (m.includes('user already registered') || m.includes('already been registered')) return L('Ta e-pošta je že registrirana. Prijavi se ali si ponastavi geslo.', 'This email is already registered. Sign in or reset your password.');
  if (m.includes('password should be') || m.includes('password is too short')) return L('Geslo mora imeti vsaj 8 znakov.', 'The password must be at least 8 characters.');
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('email rate')) return L('Preveč poskusov zapored. Počakaj minuto in poskusi znova.', 'Too many attempts in a row. Wait a minute and try again.');
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return L('Registracija je trenutno izključena.', 'Sign-ups are currently disabled.');
  if (m.includes('redirect') && m.includes('not allowed')) return L('Naslov za preusmeritev ni dovoljen v nastavitvah Supabase (Authentication → URL Configuration).', 'The redirect URL is not allowed in Supabase settings (Authentication → URL Configuration).');
  if (m.includes('provider is not enabled')) return L('Ta način prijave ni vključen v Supabase.', 'This sign-in method is not enabled in Supabase.');
  return sporocilo;
}

export default function AuthForm({ base }: { base: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const passwordInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  /* oko: brez njega ne vidis, ali si zadela presledek ali napacno crko */
  const [gesloVidno, setGesloVidno] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  /* zapomnimo si e-posto zadnjega poskusa, da lahko ponudimo "poslji potrditev znova" */
  const [zadnjaEposta, setZadnjaEposta] = useState('');
  const [nepotrjen, setNepotrjen] = useState(false);
  /* Kam po uspesni prijavi. Middleware ob zaklenjeni strani preusmeri sem z ?next=…,
     zato te mora prijava vrniti TJA (npr. na dolgorocno), ne vedno na pregled. */
  const [cilj, setCilj] = useState(`${base}/kalkulator/pregled`);
  /* Uporabnicina izbira (Nastavitve → Kam po prijavi). Beremo jo v ucinku, ker
     localStorage na strezniku ne obstaja in bi zacetno stanje razslo hidracijo. */
  useEffect(() => { setCilj(potVstopneStrani(base)); }, [base]);

  /* Napaka iz /auth/callback (Google, potrditev, ponastavitev) pride kot ?napaka=…
     Beremo iz window.location, ne iz useSearchParams — tako stran ne potrebuje Suspense. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    /* Samo relativne poti (// bi bil zunanji naslov) — brez tega bi bil to odprt redirect. */
    const next = params.get('next');
    /* ?next= (middleware ob zaklenjeni strani) je mocnejsi od nastavitve —
       uporabnica se je hotela vrniti tja, kamor je sla. */
    if (next && next.startsWith('/') && !next.startsWith('//')) setCilj(next);

    /* ?nov=1 (ali ?mode=signup) z landinga -> odpri takoj "Nov račun" tab, ne Prijava. */
    if (params.get('nov') === '1' || params.get('mode') === 'signup') setMode('signup');
    const ref = params.get('ref')?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
    if (ref) document.cookie = `flow_ref=${ref}; path=/; max-age=2592000; samesite=lax`;

    const napaka = params.get('napaka');
    if (napaka) {
      setMessage({ type: 'error', text: prevediNapako(napaka, jeEn) });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [base]);

  /* Cilj shranimo v kratkozivi piskotek, NE v ?next= v naslovu. Supabase preverja
     preusmeritveni naslov proti seznamu dovoljenih; poizvedbeni del (?next=…) se z
     natancnim vpisom ne ujema, zato je Supabase tiho preusmeril na nadomestni naslov
     (koda je pristala na "/" in seja se ni ustvarila). Cist naslov brez poizvedbe se
     ujema z vpisom "…/auth/callback" in deluje tudi brez nadomestnih znakov. */
  /* Po uspesni prijavi: EN sam prehod (polno nalaganje cilja). Prej je bilo
     router.push(cilj) + router.refresh() — stran se je izrisala, refresh pa jo je
     takoj znova zgradil, kar je uporabnik videl kot utrip (prikaz -> izgine ->
     prikaz). Polno nalaganje strezniku takoj prinese svez piskotek seje. */
  function vstopi() {
    window.location.assign(cilj);
  }

  function preusmeriNaCallback(next: string) {
    document.cookie = `flow_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    return `${window.location.origin}/auth/callback`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setNepotrjen(false);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const supabase = createClient();
    setZadnjaEposta(email);

    /* ── Pozabljeno geslo: poslji povezavo za ponastavitev ── */
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: preusmeriNaCallback(`${base}/kalkulator/geslo`),
      });
      setLoading(false);
      if (error) {
        setMessage({ type: 'error', text: prevediNapako(error.message, jeEn) });
        return;
      }
      setMessage({ type: 'success', text: L('Če ta e-pošta obstaja, smo poslali povezavo za ponastavitev gesla. Preveri tudi vsiljeno pošto.', 'If this email exists, we have sent a password reset link. Check your spam folder too.') });
      return;
    }

    /* ── Nov račun ── */
    if (mode === 'signup') {
      const fullName = String(form.get('fullName') || '').trim();
      const companyName = String(form.get('companyName') || '').trim();
      const referralCode = new URLSearchParams(window.location.search).get('ref')?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32) || undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: preusmeriNaCallback(cilj),
          data: { full_name: fullName, company_name: companyName, referral_code: referralCode },
        },
      });

      setLoading(false);
      if (error) {
        setMessage({ type: 'error', text: prevediNapako(error.message, jeEn) });
        return;
      }
      /* Ce je seja takoj na voljo, je potrditev izklopljena -> gremo naravnost naprej. */
      if (data.session) {
        vstopi();
        return;
      }
      setNepotrjen(true);
      setMessage({ type: 'success', text: L('Račun je ustvarjen. Preveri e-pošto in potrdi registracijo, nato se lahko prijaviš.', 'Your account has been created. Check your email and confirm your registration, then you can sign in.') });
      return;
    }

    /* ── Prijava ── */
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) setNepotrjen(true);
      setMessage({ type: 'error', text: prevediNapako(error.message, jeEn) });
      return;
    }

    vstopi();
  }

  async function posljiPotrditevZnova() {
    if (!zadnjaEposta) return;
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: zadnjaEposta,
      options: { emailRedirectTo: preusmeriNaCallback(cilj) },
    });
    setLoading(false);
    setMessage(
      error
        ? { type: 'error', text: prevediNapako(error.message, jeEn) }
        : { type: 'success', text: L('Poslali smo novo potrditveno povezavo na ', 'We sent a new confirmation link to ') + zadnjaEposta + '.' },
    );
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage(null);
    setNepotrjen(false);
  }

  async function signInWithGoogle() {
    setLoading(true);
    setMessage(null);
    /* Ce Supabase kljuci manjkajo (npr. niso nastavljeni na Vercelu), createClient()
       VRZE napako. Brez tega ovoja setLoading(false) ni nikoli stekel in je gumb
       obvisel na "Trenutek …" brez pojasnila. */
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: preusmeriNaCallback(cilj) },
      });
      if (error) {
        setLoading(false);
        setMessage({ type: 'error', text: prevediNapako(error.message, jeEn) });
      }
      /* ob uspehu brskalnik odide na Google — loading namenoma pustimo vklopljen */
    } catch (e) {
      setLoading(false);
      setMessage({
        type: 'error',
        text: L('Prijava trenutno ni na voljo: povezava s strežnikom ni nastavljena. ', 'Sign-in is currently unavailable: the server connection is not configured. ') + (e instanceof Error ? e.message : ''),
      });
    }
  }

  function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const values = crypto.getRandomValues(new Uint32Array(18));
    const password = Array.from(values, value => alphabet[value % alphabet.length]).join('');
    if (passwordInput.current) {
      passwordInput.current.value = password;
      passwordInput.current.type = 'text';
      passwordInput.current.focus();
    }
    setMessage({ type: 'success', text: L('Varno geslo je ustvarjeno. Shrani ga v upravljalnik gesel.', 'A secure password has been generated. Save it in your password manager.') });
  }

  const naslovi: Record<Mode, { kicker: string; h1: string; pod: string }> = {
    signin: { kicker: L('DOBRODOŠLA NAZAJ', 'WELCOME BACK'), h1: L('Tvoje poslovanje te čaka.', 'Your business is waiting.'), pod: L('Prijavi se v svoj poslovni pregled.', 'Sign in to your business overview.') },
    signup: { kicker: L('ZAČNI SVOJ FLOW', 'START YOUR FLOW'), h1: L('Vse za posel. Na enem mestu.', 'Everything for your business. In one place.'), pod: L('Kalkulator ostane brezplačen. Poslovna orodja so vezana na tvoj račun.', 'The calculator stays free. Business tools are tied to your account.') },
    reset: { kicker: L('POZABLJENO GESLO', 'FORGOT PASSWORD'), h1: L('Ponastavimo tvoje geslo.', 'Let’s reset your password.'), pod: L('Vpiši e-pošto računa in poslali ti bomo povezavo za novo geslo.', 'Enter your account email and we’ll send you a link to set a new password.') },
  };
  const t = naslovi[mode];

  return (
    <div className={styles.authPanel}>
      <div className={styles.modeSwitch} aria-label={L('Izberi prijavo ali registracijo', 'Choose sign in or sign up')}>
        <button type="button" className={mode === 'signin' ? styles.active : ''} onClick={() => changeMode('signin')}>{L('Prijava', 'Sign in')}</button>
        <button type="button" className={mode === 'signup' ? styles.active : ''} onClick={() => changeMode('signup')}>{L('Nov račun', 'New account')}</button>
      </div>

      <div className={styles.formHeading}>
        <p>{t.kicker}</p>
        <h1>{t.h1}</h1>
        <span>{t.pod}</span>
      </div>

      {/* Kaj pomeni testiranje — pove se PRED registracijo. Brez tega clovek ne
          ve, v kaj se spusca, in klik izostane (Tina + ChatGPT, 26. 8. 2026). */}
      {mode === 'signup' && (
        <p className={styles.betaNota}>
          <b>{L('Flow je v zaprti beti.', 'Flow is in closed beta.')}</b>{' '}
          {L(
            'Dostop je med testiranjem brezplačen, izdelek pa še ni dokončan — kaj se lahko zatakne. V zameno te prosimo za kratko sporočilo, kaj ti je delalo težave. Nehaš lahko kadarkoli, podatke pa lahko kadarkoli izvoziš ali izbrišeš.',
            'Access is free while we are testing, and the product is not finished yet — things can still break. In return we ask for a short note on what got in your way. You can stop at any time, and export or delete your data whenever you want.',
          )}
        </p>
      )}

      {mode !== 'reset' && (
        <>
          <button className={styles.googleButton} type="button" onClick={signInWithGoogle} disabled={loading}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.74 2.98-4.31 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.93A6 6 0 0 1 6.09 12c0-.67.11-1.33.32-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.36 2.62C7.2 7.7 9.4 5.94 12 5.94Z"/></svg>
            {L('Nadaljuj z Google', 'Continue with Google')}
          </button>

          <div className={styles.divider}><span>{L('ali z e-pošto', 'or with email')}</span></div>
        </>
      )}

      <form onSubmit={submit} className={styles.form}>
        {mode === 'signup' && (
          <div className={styles.twoColumns}>
            <label>{L('Ime in priimek', 'Full name')}<input className={styles.authInput} name="fullName" autoComplete="name" required /></label>
            <label>{L('Ime podjetja', 'Company name')}<input className={styles.authInput} name="companyName" autoComplete="organization" required /></label>
          </div>
        )}
        <label>{L('E-pošta', 'Email')}<input className={styles.authInput} name="email" type="email" autoComplete="email" inputMode="email" required /></label>
        {mode !== 'reset' && (
          <label>{L('Geslo', 'Password')}<span className={styles.passwordField} data-signup={mode === 'signup' || undefined}>
            <input className={styles.authInput} ref={passwordInput} name="password"
              type={gesloVidno ? 'text' : 'password'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={8} required />
            <button type="button" className={styles.okoGesla} onClick={() => setGesloVidno(v => !v)}
              aria-label={gesloVidno ? L('Skrij geslo', 'Hide password') : L('Pokaži geslo', 'Show password')} title={gesloVidno ? L('Skrij geslo', 'Hide password') : L('Pokaži geslo', 'Show password')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.6" />
                {!gesloVidno && <path d="m4 20 16-16" />}
              </svg>
            </button>
            {mode === 'signup' && <button type="button" onClick={generatePassword}>{L('Ustvari varno geslo', 'Generate a secure password')}</button>}
          </span>
          {mode === 'signup' && <small className={styles.gesloNamig}>
            {L('Vsaj 8 znakov. Najbolj varno je nekaj besed skupaj — ', 'At least 8 characters. A few words together is safest — ')}<b>{L('modra-pekarna-sonce-42', 'blue-bakery-sun-42')}</b>{L(' je bolj varno in laže zapomnljivo kot ', ' is safer and easier to remember than ')}<b>Xk9!q2</b>.
          </small>}
        </label>
        )}

        {message && <p role="status" className={message.type === 'error' ? styles.error : styles.success}>{message.text}</p>}

        {nepotrjen && (
          <button type="button" className={styles.textLink} onClick={posljiPotrditevZnova} disabled={loading}>
            {L('Pošlji potrditveno povezavo znova', 'Send the confirmation link again')}
          </button>
        )}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? L('Trenutek …', 'One moment …') : mode === 'signin' ? L('Prijavi se', 'Sign in') : mode === 'signup' ? L('Ustvari račun', 'Create account') : L('Pošlji povezavo', 'Send link')}
        </button>

        {mode === 'signin' && (
          <button type="button" className={styles.textLink} onClick={() => changeMode('reset')}>
            {L('Ste pozabili geslo?', 'Forgot your password?')}
          </button>
        )}
        {mode === 'reset' && (
          <button type="button" className={styles.textLink} onClick={() => changeMode('signin')}>
            {L('← Nazaj na prijavo', '← Back to sign in')}
          </button>
        )}
      </form>

      <p className={styles.freeNote}><strong>{L('Brez prijave?', 'No account?')}</strong> {L('Še vedno lahko uporabiš brezplačni kalkulator.', 'You can still use the free calculator.')}</p>
      <a className={styles.calculatorLink} href={`${base}/kalkulator`}>{L('Odpri kalkulator', 'Open the calculator')}</a>
    </div>
  );
}
