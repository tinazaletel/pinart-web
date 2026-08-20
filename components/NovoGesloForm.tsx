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
  /* Nadzorovani polji: da lahko sproti pokazemo, ali se gesli UJEMATA (zelena obroba)
     in da "oko" prikaze vsebino — pri dolgih geslih je to nujno. */
  const [geslo1, setGeslo1] = useState('');
  const [geslo2, setGeslo2] = useState('');
  const [vidno, setVidno] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSeja(data.session ? 'da' : 'ne'));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const novo = geslo1;
    const ponovi = geslo2;

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

  /* Ujemanje: zelena obroba se prizge SAMO, ko sta obe gesli dovolj dolgi in enaki. */
  const ujemata = geslo1.length >= 8 && geslo1 === geslo2;
  const neujemanje = geslo2.length > 0 && !ujemata;
  const obrobaOk = { borderColor: '#1a7f4b', boxShadow: '0 0 0 2px rgba(26,127,75,.18)' } as const;
  const obrobaNapaka = { borderColor: '#c9756b' } as const;

  function ustvariGeslo() {
    const abeceda = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const values = crypto.getRandomValues(new Uint32Array(18));
    const novo = Array.from(values, v => abeceda[v % abeceda.length]).join('');
    setGeslo1(novo);
    setVidno(true);
    geslo.current?.focus();
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
              <input className={styles.authInput} ref={geslo} name="password" type={vidno ? 'text' : 'password'}
                autoComplete="new-password" minLength={8} required
                value={geslo1} onChange={e => setGeslo1(e.target.value)}
                style={ujemata ? obrobaOk : undefined} />
              <button type="button" onClick={ustvariGeslo}>Ustvari varno geslo</button>
            </span>
          </label>
          <label>Ponovi novo geslo
            <span className={styles.passwordField}>
              <input className={styles.authInput} name="password2" type={vidno ? 'text' : 'password'}
                autoComplete="new-password" minLength={8} required
                value={geslo2} onChange={e => setGeslo2(e.target.value)}
                style={ujemata ? obrobaOk : (neujemanje ? obrobaNapaka : undefined)} />
              <button type="button" onClick={() => setVidno(v => !v)} aria-pressed={vidno}
                aria-label={vidno ? 'Skrij gesli' : 'Pokaži gesli'} title={vidno ? 'Skrij gesli' : 'Pokaži gesli'}>
                {vidno ? 'Skrij' : 'Pokaži'}
              </button>
            </span>
          </label>
          <p aria-live="polite" style={{ margin: '-.35rem 0 0', fontSize: '.82rem', color: ujemata ? '#2F5D50' : (neujemanje ? '#a4342a' : '#6b655d') }}>
            {ujemata ? '✓ Gesli se ujemata' : (neujemanje ? 'Gesli se še ne ujemata' : 'Vsaj 8 znakov. Gesli se morata ujemati.')}
          </p>

          {message && <p role="status" className={message.type === 'error' ? styles.error : styles.success}>{message.text}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Shranjujem …' : 'Shrani novo geslo'}
          </button>
        </form>
      )}
    </div>
  );
}
