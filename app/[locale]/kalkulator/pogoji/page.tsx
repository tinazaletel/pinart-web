import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Pinart kalkulator: pogoji uporabe',
  description: 'Pogoji uporabe in varstvo podatkov za brezplačni Pinart kalkulator cen za kreativce.',
  robots: { index: false },
};

/* Pogoji uporabe kalkulatorja — standardni osnutek; pred resno javno
   kampanjo naj ga pregleda pravnik. Vsebinsko pokriva: informativnost
   izracunov, odgovornost, DDV pridrzek, zasebnost (leadi + anonimne
   cene + localStorage), avtorstvo orodja in spremembe storitve. */
export default async function KalkulatorPogojiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const S: React.CSSProperties = { marginTop: '2.6rem' };
  const H: React.CSSProperties = { fontSize: '.78rem', fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: '.7rem' };
  const P: React.CSSProperties = { fontSize: '.95rem', lineHeight: 1.75, color: 'rgba(17,17,17,.8)', margin: '0 0 .8rem' };

  return (
    <main style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '8rem 1.4rem 6rem', color: 'var(--ink)', fontWeight: 300 }}>
        <p style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(17,17,17,.72)' }}>
          Pinart kalkulator
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif), Didot, serif', fontWeight: 500, fontSize: 'clamp(2.2rem, 7vw, 3.6rem)', lineHeight: 1, letterSpacing: '-.01em', margin: '.6rem 0 1rem' }}>
          Pogoji uporabe
        </h1>
        <p style={P}>
          Pinart kalkulator je brezplačno orodje studia Pinart (v nadaljevanju: ponudnik),
          namenjeno kreativcem za informativni izračun cen njihovih storitev.
          Z uporabo orodja se strinjaš s temi pogoji.
        </p>

        <section style={S}>
          <h2 style={H}>1. Informativna narava izračunov</h2>
          <p style={P}>
            Vsi izračuni, cene, razponi in besedila ponudb so zgolj informativni in
            orientacijski. <strong>Ne jamčimo, da orodje izračuna pravo ceno za tvoj
            primer.</strong> Izračuni ne predstavljajo cenovnega, davčnega,
            računovodskega ali pravnega svetovanja. Za cene v svojih ponudbah se
            odločaš sam in zanje odgovarjaš izključno sam.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>1a. Od kod priporočene cene</h2>
          <p style={P}>
            Privzete cene in množitelji so strokovna ocena avtorice orodja na podlagi
            njenih izkušenj in javno dostopnih virov. <strong>Zaenkrat ne temeljijo na
            izmerjenih tržnih podatkih</strong>; anonimna statistika (točka 5) tako
            bazo šele gradi. Vse zneske lahko in naj prilagodiš svojim razmeram.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>2. Davki</h2>
          <p style={P}>
            Prikazi DDV (vključno s sklicem na 94. člen ZDDV-1) so splošni in morda ne
            ustrezajo tvoji davčni situaciji. Pred izstavitvijo ponudb in računov
            preveri svoje obveznosti pri računovodji ali FURS.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>3. Brez jamstev</h2>
          <p style={P}>
            Orodje je na voljo »takšno, kot je«. Ponudnik ne jamči za točnost,
            popolnost ali primernost izračunov za določen namen in ne odgovarja za
            morebitno škodo, ki bi nastala z uporabo orodja ali zanašanjem na
            njegove rezultate.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>4. Tvoji podatki v brskalniku</h2>
          <p style={P}>
            Nastavitve orodja (tvoje cene, postavke, podatki za glavo ponudbe, profili)
            se shranjujejo izključno lokalno v tvojem brskalniku (localStorage) in se
            ne pošiljajo ponudniku. Izbrišeš jih z brisanjem podatkov brskalnika.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>5. Anonimna statistika cen</h2>
          <p style={P}>
            Ob prvem prikazu izračuna v seji orodje anonimno zabeleži natanko tole:
            izbrane storitve, raven izkušenj, tvoj trg, trg naročnika, vrsto rabe
            (znamka ali projekt), izračunan znesek izvedbe in avtorskih pravic ter
            valuto. Zapis ne vsebuje imena, e-naslova, IP-naslova ali drugih osebnih
            podatkov in ga ni mogoče povezati s teboj. Podatki se shranijo v
            ponudnikovo preglednico (Google Sheets) in se uporabijo izključno za
            skupno statistiko cen na trgu za kreativce.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>6. Ime in e-naslov ob prenosu ali profilu</h2>
          <p style={P}>
            Če pri prenosu ponudbe ali shranjevanju profila vpišeš ime in e-naslov,
            ju ponudnik hrani za namen obveščanja o orodju in svojih storitvah
            (pravna podlaga: privolitev). Privolitev lahko kadarkoli prekličeš s
            sporočilom na tina@pinart.si; več v <a href={`/${locale}/zasebnost`} style={{ color: 'var(--ink)' }}>politiki zasebnosti</a>.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>7. Intelektualna lastnina</h2>
          <p style={P}>
            Orodje, njegova zasnova in vsebine so last ponudnika. Besedila ponudb,
            ki jih ustvariš z orodjem, lahko prosto uporabljaš za svoje poslovanje.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>8. Spremembe</h2>
          <p style={P}>
            Ponudnik lahko orodje in te pogoje kadarkoli spremeni, omeji ali ukine.
            Velja različica pogojev, objavljena na tej strani.
          </p>
          <p style={{ ...P, color: 'rgba(17,17,17,.6)', fontSize: '.85rem' }}>
            Zadnja sprememba: 7. 7. 2026 · Kontakt: tina@pinart.si
          </p>
        </section>

        <p style={{ marginTop: '3rem' }}>
          <a href={`/${locale}/kalkulator`} style={{ color: 'var(--ink)', fontSize: '.88rem' }}>← Nazaj na kalkulator</a>
        </p>
      </div>
    </main>
  );
}
