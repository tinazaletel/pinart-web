'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/[locale]/kalkulator/prijava/prijava.module.css';

/* Zadnji korak ponastavitve gesla. Sem te pripelje povezava iz e-poste prek
   /auth/callback, ki kodo zamenja za sejo — zato tu seja ZE mora obstajati.
   Ce je ni (povezava potekla ali direkten obisk), ponudimo novo zahtevo. */
export default function NovoGesloForm({ base }: { base: string }) {
  const router = useRouter();
  const geslo = useRef<HTMLInputElement>(null);
  const [seja, setSeja] = useState<'preverjam' | 'da' | 'ne'>('preverjam');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSeja(data.session ? 'da' : 'ne'));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const novo = String(form.get('password') || '');
    const ponovi = String(form.get('password2') || '');

    if (novo !== ponovi) {
      setMessage({ type: 'error', text: 'Gesli se ne ujemata.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: novo });
    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Geslo je spremenjeno. Preusmerjam …' });
    router.push(`${base}/kalkulator/pregled`);
    router.refresh();
  }

  function ustvariGeslo() {
    const abeceda = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const values = crypto.getRandomValues(new Uint32Array(18));
    const novo = Array.from(values, v => abeceda[v % abeceda.length]).join('');
    if (geslo.current) {
      geslo.current.value = novo;
      geslo.current.type = 'text';
      geslo.current.focus();
    }
    setMessage({ type: 'success', text: 'Varno geslo je ustvarjeno. Shrani ga v upravljalnik gesel in ga prepiši še v drugo polje.' });
  }

  return (
    <div className={styles.authPanel}>
      <div className={styles.formHeading}>
        <p>NOVO GESLO</p>
        <h1>Nastavi novo geslo.</h1>
        <span>{seja === 'da' ? 'Vpiši novo geslo za svoj račun.' : 'Preverjam povezavo …'}</span>
      </div>

      {seja === 'ne' && (
        <>
          <p role="status" className={styles.error}>
            Povezava je potekla ali ni veljavna. Zahtevaj novo povezavo za ponastavitev gesla.
          </p>
          <a className={styles.calculatorLink} href={`${base}/kalkulator/prijava`}>← Nazaj na prijavo</a>
        </>
      )}

      {seja === 'da' && (
        <form onSubmit={submit} className={styles.form}>
          <label>Novo geslo
            <span className={styles.passwordField}>
              <input className={styles.authInput} ref={geslo} name="password" type="password" autoComplete="new-password" minLength={8} required />
              <button type="button" onClick={ustvariGeslo}>Ustvari varno geslo</button>
            </span>
          </label>
          <label>Ponovi novo geslo
            <input className={styles.authInput} name="password2" type="password" autoComplete="new-password" minLength={8} required />
          </label>

          {message && <p role="status" className={message.type === 'error' ? styles.error : styles.success}>{message.text}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Shranjujem …' : 'Shrani novo geslo'}
          </button>
        </form>
      )}
    </div>
  );
}
