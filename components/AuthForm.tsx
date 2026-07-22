'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/[locale]/kalkulator/prijava/prijava.module.css';

type Mode = 'signin' | 'signup' | 'reset';

/* Supabase vraca angleske napake. Prevedemo znane, NEZNANE pa pokazemo dobesedno —
   prej je vse padlo v "E-posta ali geslo ni pravilno", zato je bila npr. nepotrjena
   registracija videti kot napacno geslo in se ni dalo ugotoviti, kaj je narobe. */
function prevediNapako(sporocilo: string): string {
  const m = sporocilo.toLowerCase();
  if (m.includes('email not confirmed')) return 'Račun še ni potrjen. Preveri e-pošto (tudi vsiljeno pošto) ali si spodaj pošlji novo potrditveno povezavo.';
  if (m.includes('invalid login credentials')) return 'E-pošta ali geslo ni pravilno.';
  if (m.includes('user already registered') || m.includes('already been registered')) return 'Ta e-pošta je že registrirana. Prijavi se ali si ponastavi geslo.';
  if (m.includes('password should be') || m.includes('password is too short')) return 'Geslo mora imeti vsaj 8 znakov.';
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('email rate')) return 'Preveč poskusov zapored. Počakaj minuto in poskusi znova.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Registracija je trenutno izključena.';
  if (m.includes('redirect') && m.includes('not allowed')) return 'Naslov za preusmeritev ni dovoljen v nastavitvah Supabase (Authentication → URL Configuration).';
  if (m.includes('provider is not enabled')) return 'Ta način prijave ni vključen v Supabase.';
  return sporocilo;
}

export default function AuthForm({ base }: { base: string }) {
  const router = useRouter();
  const passwordInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  /* zapomnimo si e-posto zadnjega poskusa, da lahko ponudimo "poslji potrditev znova" */
  const [zadnjaEposta, setZadnjaEposta] = useState('');
  const [nepotrjen, setNepotrjen] = useState(false);
  /* Kam po uspesni prijavi. Middleware ob zaklenjeni strani preusmeri sem z ?next=…,
     zato te mora prijava vrniti TJA (npr. na dolgorocno), ne vedno na pregled. */
  const [cilj, setCilj] = useState(`${base}/kalkulator/pregled`);

  /* Napaka iz /auth/callback (Google, potrditev, ponastavitev) pride kot ?napaka=…
     Beremo iz window.location, ne iz useSearchParams — tako stran ne potrebuje Suspense. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    /* Samo relativne poti (// bi bil zunanji naslov) — brez tega bi bil to odprt redirect. */
    const next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) setCilj(next);

    const napaka = params.get('napaka');
    if (napaka) {
      setMessage({ type: 'error', text: prevediNapako(napaka) });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [base]);

  /* Cilj shranimo v kratkozivi piskotek, NE v ?next= v naslovu. Supabase preverja
     preusmeritveni naslov proti seznamu dovoljenih; poizvedbeni del (?next=…) se z
     natancnim vpisom ne ujema, zato je Supabase tiho preusmeril na nadomestni naslov
     (koda je pristala na "/" in seja se ni ustvarila). Cist naslov brez poizvedbe se
     ujema z vpisom "…/auth/callback" in deluje tudi brez nadomestnih znakov. */
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
        setMessage({ type: 'error', text: prevediNapako(error.message) });
        return;
      }
      setMessage({ type: 'success', text: 'Če ta e-pošta obstaja, smo poslali povezavo za ponastavitev gesla. Preveri tudi vsiljeno pošto.' });
      return;
    }

    /* ── Nov račun ── */
    if (mode === 'signup') {
      const fullName = String(form.get('fullName') || '').trim();
      const companyName = String(form.get('companyName') || '').trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: preusmeriNaCallback(cilj),
          data: { full_name: fullName, company_name: companyName },
        },
      });

      setLoading(false);
      if (error) {
        setMessage({ type: 'error', text: prevediNapako(error.message) });
        return;
      }
      /* Ce je seja takoj na voljo, je potrditev izklopljena -> gremo naravnost naprej. */
      if (data.session) {
        router.push(cilj);
        router.refresh();
        return;
      }
      setNepotrjen(true);
      setMessage({ type: 'success', text: 'Račun je ustvarjen. Preveri e-pošto in potrdi registracijo, nato se lahko prijaviš.' });
      return;
    }

    /* ── Prijava ── */
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) setNepotrjen(true);
      setMessage({ type: 'error', text: prevediNapako(error.message) });
      return;
    }

    router.push(cilj);
    router.refresh();
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
        ? { type: 'error', text: prevediNapako(error.message) }
        : { type: 'success', text: 'Poslali smo novo potrditveno povezavo na ' + zadnjaEposta + '.' },
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
        setMessage({ type: 'error', text: prevediNapako(error.message) });
      }
      /* ob uspehu brskalnik odide na Google — loading namenoma pustimo vklopljen */
    } catch (e) {
      setLoading(false);
      setMessage({
        type: 'error',
        text: 'Prijava trenutno ni na voljo: povezava s strežnikom ni nastavljena. ' + (e instanceof Error ? e.message : ''),
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
    setMessage({ type: 'success', text: 'Varno geslo je ustvarjeno. Shrani ga v upravljalnik gesel.' });
  }

  const naslovi: Record<Mode, { kicker: string; h1: string; pod: string }> = {
    signin: { kicker: 'DOBRODOŠLA NAZAJ', h1: 'Tvoje poslovanje te čaka.', pod: 'Prijavi se v svoj poslovni pregled.' },
    signup: { kicker: 'ZAČNI SVOJ FLOW', h1: 'Vse za posel. Na enem mestu.', pod: 'Kalkulator ostane brezplačen. Poslovna orodja so vezana na tvoj račun.' },
    reset: { kicker: 'POZABLJENO GESLO', h1: 'Ponastavimo tvoje geslo.', pod: 'Vpiši e-pošto računa in poslali ti bomo povezavo za novo geslo.' },
  };
  const t = naslovi[mode];

  return (
    <div className={styles.authPanel}>
      <div className={styles.modeSwitch} aria-label="Izberi prijavo ali registracijo">
        <button type="button" className={mode === 'signin' ? styles.active : ''} onClick={() => changeMode('signin')}>Prijava</button>
        <button type="button" className={mode === 'signup' ? styles.active : ''} onClick={() => changeMode('signup')}>Nov račun</button>
      </div>

      <div className={styles.formHeading}>
        <p>{t.kicker}</p>
        <h1>{t.h1}</h1>
        <span>{t.pod}</span>
      </div>

      {mode !== 'reset' && (
        <>
          <button className={styles.googleButton} type="button" onClick={signInWithGoogle} disabled={loading}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.74 2.98-4.31 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.93A6 6 0 0 1 6.09 12c0-.67.11-1.33.32-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.36 2.62C7.2 7.7 9.4 5.94 12 5.94Z"/></svg>
            Nadaljuj z Google
          </button>

          <div className={styles.divider}><span>ali z e-pošto</span></div>
        </>
      )}

      <form onSubmit={submit} className={styles.form}>
        {mode === 'signup' && (
          <div className={styles.twoColumns}>
            <label>Ime in priimek<input className={styles.authInput} name="fullName" autoComplete="name" required /></label>
            <label>Ime podjetja<input className={styles.authInput} name="companyName" autoComplete="organization" required /></label>
          </div>
        )}
        <label>E-pošta<input className={styles.authInput} name="email" type="email" autoComplete="email" inputMode="email" required /></label>
        {mode !== 'reset' && (
          <label>Geslo<span className={styles.passwordField}><input className={styles.authInput} ref={passwordInput} name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required />{mode === 'signup' && <button type="button" onClick={generatePassword}>Ustvari varno geslo</button>}</span></label>
        )}

        {message && <p role="status" className={message.type === 'error' ? styles.error : styles.success}>{message.text}</p>}

        {nepotrjen && (
          <button type="button" className={styles.textLink} onClick={posljiPotrditevZnova} disabled={loading}>
            Pošlji potrditveno povezavo znova
          </button>
        )}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? 'Trenutek …' : mode === 'signin' ? 'Prijavi se' : mode === 'signup' ? 'Ustvari račun' : 'Pošlji povezavo'}
        </button>

        {mode === 'signin' && (
          <button type="button" className={styles.textLink} onClick={() => changeMode('reset')}>
            Ste pozabili geslo?
          </button>
        )}
        {mode === 'reset' && (
          <button type="button" className={styles.textLink} onClick={() => changeMode('signin')}>
            ← Nazaj na prijavo
          </button>
        )}
      </form>

      <p className={styles.freeNote}><strong>Brez prijave?</strong> Še vedno lahko uporabiš brezplačni kalkulator.</p>
      <a className={styles.calculatorLink} href={`${base}/kalkulator`}>Odpri kalkulator</a>
    </div>
  );
}
