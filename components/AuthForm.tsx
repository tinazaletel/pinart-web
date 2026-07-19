'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/[locale]/kalkulator/prijava/prijava.module.css';

type Mode = 'signin' | 'signup';

export default function AuthForm({ base }: { base: string }) {
  const router = useRouter();
  const passwordInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const supabase = createClient();

    if (mode === 'signup') {
      const fullName = String(form.get('fullName') || '').trim();
      const companyName = String(form.get('companyName') || '').trim();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`${base}/kalkulator/pregled`)}`,
          data: { full_name: fullName, company_name: companyName },
        },
      });

      setLoading(false);
      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }
      setMessage({ type: 'success', text: 'Preveri e-pošto in potrdi registracijo. Nato se lahko prijaviš.' });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: 'E-pošta ali geslo ni pravilno.' });
      return;
    }

    router.push(`${base}/kalkulator/pregled`);
    router.refresh();
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage(null);
  }

  async function signInWithGoogle() {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`${base}/kalkulator/pregled`)}`,
      },
    });
    if (error) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Google prijava še ni vključena v Supabase.' });
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

  return (
    <div className={styles.authPanel}>
      <div className={styles.modeSwitch} aria-label="Izberi prijavo ali registracijo">
        <button type="button" className={mode === 'signin' ? styles.active : ''} onClick={() => changeMode('signin')}>Prijava</button>
        <button type="button" className={mode === 'signup' ? styles.active : ''} onClick={() => changeMode('signup')}>Nov račun</button>
      </div>

      <div className={styles.formHeading}>
        <p>{mode === 'signin' ? 'DOBRODOŠLA NAZAJ' : 'ZAČNI SVOJ FLOW'}</p>
        <h1>{mode === 'signin' ? 'Tvoje poslovanje te čaka.' : 'Vse za posel. Na enem mestu.'}</h1>
        <span>{mode === 'signin' ? 'Prijavi se v svoj poslovni pregled.' : 'Kalkulator ostane brezplačen. Poslovna orodja so vezana na tvoj račun.'}</span>
      </div>

      <button className={styles.googleButton} type="button" onClick={signInWithGoogle} disabled={loading}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.74 2.98-4.31 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.93A6 6 0 0 1 6.09 12c0-.67.11-1.33.32-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.36 2.62C7.2 7.7 9.4 5.94 12 5.94Z"/></svg>
        Nadaljuj z Google
      </button>

      <div className={styles.divider}><span>ali z e-pošto</span></div>

      <form onSubmit={submit} className={styles.form}>
        {mode === 'signup' && (
          <div className={styles.twoColumns}>
            <label>Ime in priimek<input className={styles.authInput} name="fullName" autoComplete="name" required /></label>
            <label>Ime podjetja<input className={styles.authInput} name="companyName" autoComplete="organization" required /></label>
          </div>
        )}
        <label>E-pošta<input className={styles.authInput} name="email" type="email" autoComplete="email" inputMode="email" required /></label>
        <label>Geslo<span className={styles.passwordField}><input className={styles.authInput} ref={passwordInput} name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required />{mode === 'signup' && <button type="button" onClick={generatePassword}>Ustvari varno geslo</button>}</span></label>

        {message && <p role="status" className={message.type === 'error' ? styles.error : styles.success}>{message.text}</p>}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? 'Trenutek …' : mode === 'signin' ? 'Prijavi se' : 'Ustvari račun'}
        </button>
      </form>

      <p className={styles.freeNote}><strong>Brez prijave?</strong> Še vedno lahko uporabiš brezplačni kalkulator.</p>
      <a className={styles.calculatorLink} href={`${base}/kalkulator`}>Odpri kalkulator</a>
    </div>
  );
}
