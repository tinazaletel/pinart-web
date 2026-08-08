import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { localePath } from '@/i18n/routing';
import NazajLink from '@/components/NazajLink';

export const metadata: Metadata = {
  title: 'Pinart Flow: pogoji uporabe',
  description: 'Pogoji uporabe in varstvo podatkov za platformo Pinart Flow ter brezplačni kalkulator cen za kreativce.',
  robots: { index: false },
};

/* Pogoji uporabe Pinart Flow — standardni osnutek; pred resno javno
   kampanjo naj ga pregleda pravnik. Vsebinsko pokriva: informativnost
   izracunov, odgovornost, DDV pridrzek, narocnino in placilo, uporabniski
   racun, oblacno shranjevanje (Supabase), komunikacije (Resend), Sef
   avtorstva, zasebnost, podobdelovalce, avtorstvo orodja in spremembe. */
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
  const OSNUTEK: React.CSSProperties = { ...P, padding: '.8rem 1rem', border: '1px solid rgba(178,84,118,.4)', borderRadius: '.75rem', fontWeight: 600 };

  return (
    <main style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '8rem 1.4rem 6rem', color: 'var(--ink)', fontWeight: 300 }}>
        {/* Brez tega je stran slepa ulica: iz profila ali onboardinga se je
            dalo priti sem, nazaj pa samo z gumbom brskalnika. */}
        <NazajLink />
        <p style={{ marginTop: '1.4rem', fontSize: '.72rem', fontWeight: 600, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(17,17,17,.72)' }}>
          Pinart Flow
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif), Didot, serif', fontWeight: 500, fontSize: 'clamp(2.2rem, 7vw, 3.6rem)', lineHeight: 1, letterSpacing: '-.01em', margin: '.6rem 0 1rem' }}>
          Pogoji uporabe
        </h1>
        <p style={P}>
          Pinart Flow je platforma družbe <strong>Pinart d.o.o.</strong>, Mladinska ulica 63,
          1000 Ljubljana (v nadaljevanju: ponudnik), namenjena kreativcem za izračun poštenih
          cen, pripravo ponudb, pogodb in računov ter vodenje strank in projektov. Brezplačni
          kalkulator cen je del platforme in deluje tudi brez prijave. Z uporabo platforme ali
          orodij se strinjaš s temi pogoji.
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
          <h2 style={H}>2a. Naročnina in plačilo</h2>
          <p style={P}>
            Kalkulator poštenih cen je in ostane brezplačen. Za dostop do plačljivih paketov
            (Premium, Pro) velja naročnina po cenah, objavljenih na strani ob nakupu.
            Naročnina se obračunava vnaprej za izbrano obdobje (mesečno ali letno) in se
            samodejno podaljšuje, dokler je ne odpoveš.
          </p>
          <p style={P}>
            Plačila obdeluje <strong>zunanji pooblaščeni ponudnik plačil (Merchant of Record)</strong>,
            ki v svojem imenu izda račun ter obračuna in poravna morebitni DDV glede na tvojo
            državo. Ponudnik plačil je za ta namen samostojni upravljavec plačilnih podatkov;
            ponudnik (Pinart d.o.o.) ne prejme in ne hrani celotne številke plačilne kartice.
          </p>
          <p style={P}>
            <strong>Cene naročnine lahko kadarkoli spremenimo, tudi zvišamo.</strong> Spremembo
            objavimo vnaprej; začne veljati ob naslednjem obračunskem obdobju. Že plačano obdobje
            ostane po ceni ob nakupu. Naročnino lahko kadarkoli odpoveš in velja do konca
            plačanega obdobja; sorazmerno vračilo za že začeto obdobje ni zagotovljeno, razen
            če to zahteva prisilni predpis.
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
          <h2 style={H}>4. Uporabniški račun in dostop</h2>
          <p style={P}>
            Za shranjevanje dokumentov in dostop do platforme ustvariš račun (npr. s prijavo
            prek Googla). Za prijavo prejmemo tvoj e-naslov in ime iz izbranega ponudnika
            prijave. Odgovarjaš za dejavnost na svojem računu in za varovanje dostopa. V času
            zaprte bete je dostop mogoč na podlagi povabila; ponudnik lahko dostop, pakete ali
            posamezne funkcije kadarkoli spremeni, omeji ali ukine.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>4a. Kje se hranijo tvoji podatki</h2>
          <p style={P}>
            <strong>Brez prijave</strong> (npr. brezplačni kalkulator) se tvoje nastavitve, cene
            in osnutki shranjujejo izključno lokalno v tvojem brskalniku (localStorage) in se ne
            pošiljajo ponudniku; izbrišeš jih z brisanjem podatkov brskalnika.
          </p>
          <p style={P}>
            <strong>Ko si prijavljen</strong>, se tvoji poslovni podatki (ponudbe, pogodbe,
            računi, stranke, projekti, stroški, naloge in podobno) shranjujejo v oblačni bazi
            ponudnika (Supabase, strežniki v EU). Podatki so vezani na tvoj račun in zasebni —
            dostop je omejen s pravili na ravni baze. Ponudnik jih ne prodaja in ne razkriva
            tretjim, razen podobdelovalcem, potrebnim za delovanje storitve (točka 8a), ali kadar
            to zahteva zakon. Izbris računa ali podatkov lahko kadarkoli zahtevaš na tina@pinart.si.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>4b. Komunikacije</h2>
          <p style={P}>
            Če uporabljaš funkcije komunikacije (projektni klepet, projektna pošta), se vsebina
            sporočil shranjuje v oblačni bazi ponudnika, da je dostopna tebi in osebam, s katerimi
            deliš projekt. Odhodna e-pošta se pošilja prek zunanjega ponudnika e-pošte (Resend).
            Za vsebino svojih sporočil odgovarjaš sam.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>4c. Sef avtorstva</h2>
          <p style={OSNUTEK}>OSNUTEK — pravno mora potrditi odvetnik.</p>
          <p style={P}>
            Sef avtorstva izračuna kriptografski odtis (SHA-256) tvoje datoteke in ga skupaj z
            datumom ter podatki o delu zabeleži kot dokaz o obstoju in prioriteti dela. Odtis je
            enolični »prstni odtis« datoteke; iz njega ni mogoče rekonstruirati vsebine. Za
            neodvisen časovni žig lahko uporabimo storitev OpenTimestamps, ki v javno verigo (Bitcoin)
            zapiše <strong>samo odtis, nikoli datoteke</strong>. Če se odločiš za oblačni trezor
            (plačljivo), se izvirna datoteka shrani v zasebno oblačno shrambo ponudnika (EU).
          </p>
          <p style={P}>
            <strong>Iskrena meja:</strong> Sef dokazuje, da je določena datoteka obstajala na
            določen dan (obstoj in prioriteta), <strong>ne pa absolutnega avtorstva</strong> ali
            vizualne izvirnosti sloga. Ne nadomešča uradne registracije pravic (npr. pri pristojnem
            uradu), ampak jo dopolnjuje. Ponudnik ne jamči pravne veljave dokaza v posameznem sporu.
          </p>
          <p style={{ ...P, fontWeight: 600 }}>
            <strong>Original obdrži pri sebi.</strong> Sef je varnostna kopija in dokazilo, ne
            edini izvod. Vedno ohrani izvirno datoteko na svoji napravi. Oblačni trezor zmanjša
            tveganje izgube, a noben sistem ni brez napak: ponudnik ne jamči neprekinjenega
            delovanja, razpoložljivosti ali trajne hrambe in <strong>ne odgovarja za izgubo,
            poškodbo ali nedostopnost naloženih datotek</strong> (glejte tudi točko 9). Priporočamo,
            da pomembna dela dodatno hraniš na lastni varnostni kopiji.
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
            ponudnikovo bazo in se uporabijo izključno za skupno statistiko cen na trgu
            za kreativce. Ko bo baza dovolj velika, bodo zbirni podatki (npr. mediane cen po
            storitvah in izkušnjah) na voljo uporabnikom orodja — vsak izračun torej prispeva
            k pregledu trga, ki ga kreativci danes nimajo.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>6. Ime in e-naslov ob prenosu ali profilu</h2>
          <p style={P}>
            Če pri prenosu ponudbe ali shranjevanju profila vpišeš ime in e-naslov,
            ju ponudnik hrani za namen obveščanja o orodju in svojih storitvah
            (pravna podlaga: privolitev). Privolitev lahko kadarkoli prekličeš s
            sporočilom na tina@pinart.si; več v <a href={localePath(locale, `/zasebnost`)} style={{ color: 'var(--ink)' }}>politiki zasebnosti</a>.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>7. Umetna inteligenca (Pupa) in varnost podatkov</h2>
          <p style={OSNUTEK}>OSNUTEK — pravno mora potrditi odvetnik.</p>
          <p style={P}>
            Pupa je izbirna pomočnica, ki deluje strežniško prek Anthropic Claude API,
            zato API ključ ni izpostavljen v brskalniku. Anthropic prejme samo vsebino,
            ki jo vneseš v Pupo, in minimalen kontekst odprtega orodja ali ponudbe,
            potreben za odgovor; nič drugega. Anthropic nima dostopa do baze Pinart
            Flow — vidi le besedilo posamezne zahteve in baze ne more brati ali izvoziti.
          </p>
          <p style={P}>
            <strong>V Pupo ne vnašaj zaupnih podatkov, poslovnih skrivnosti ali osebnih
            podatkov svojih strank.</strong> Če Pupe ne uporabljaš, se podatki ne
            pošiljajo družbi Anthropic ali kateremu koli drugemu zunanjemu ponudniku
            AI. Orodja Pinart Flow delujejo brez AI, cene pa se izračunajo s formulami
            in pravili lokalno oziroma na zaledju Pinart Flow.
          </p>
          <p style={P}>
            Anthropic je predviden kot podobdelovalec. Po njegovih aktualnih pogojih
            se vhodi in izhodi komercialnega API privzeto ne uporabljajo za učenje
            modelov, hramba pa sledi njegovim aktualnim pogojem. Morebitni prenos v ZDA
            mora biti urejen z DPA z družbo Anthropic in ustreznimi standardnimi
            pogodbenimi klavzulami (SCC). Pravno podlago (privolitev ali zakoniti
            interes) mora pred objavo določiti odvetnik. Seznam podobdelovalcev je na
            voljo na zahtevo na tina@pinart.si.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>8. Intelektualna lastnina</h2>
          <p style={P}>
            Orodje, njegova zasnova in vsebine so last ponudnika. Besedila ponudb,
            pogodb in računov, ki jih ustvariš z orodjem, lahko prosto uporabljaš za
            svoje poslovanje. Avtorske pravice na delih, ki jih naložiš v Sef ali
            ustvariš sam, ostanejo tvoje.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>8a. Podobdelovalci</h2>
          <p style={P}>
            Za delovanje platforme uporabljamo zaupanja vredne podobdelovalce, ki podatke
            obdelujejo izključno po naših navodilih:
          </p>
          <p style={{ ...P, color: 'rgba(17,17,17,.72)' }}>
            — <strong>Supabase</strong> — oblačna baza in shramba (strežniki v EU)<br />
            — <strong>Vercel</strong> — gostovanje in dostava spletne aplikacije<br />
            — <strong>Resend</strong> — pošiljanje e-pošte<br />
            — <strong>Google</strong> — prijava z Google računom (OAuth)<br />
            — <strong>Anthropic</strong> — AI asistentka Pupa (samo ob uporabi)<br />
            — <strong>OpenTimestamps / Bitcoin</strong> — neodvisni časovni žig sefa (prejme samo odtis)<br />
            — pooblaščeni ponudnik plačil (Merchant of Record) — obdelava plačil naročnine
          </p>
          <p style={P}>
            Aktualni seznam je na voljo na zahtevo na tina@pinart.si.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>9. Omejitev odgovornosti</h2>
          <p style={P}>
            Ponudnik odgovarja le za škodo, povzročeno naklepno ali iz hude malomarnosti.
            V največjem obsegu, ki ga dopušča pravo, ponudnik ne odgovarja za posredno,
            posledično ali nepremoženjsko škodo (npr. izgubljen dobiček, izguba podatkov ali
            posla). Skupna odgovornost ponudnika v zvezi s plačljivo storitvijo je omejena na
            znesek, ki si ga zanjo plačal v zadnjih 12 mesecih. Nič v teh pogojih ne izključuje
            odgovornosti, ki je po prisilnih predpisih ni mogoče izključiti (npr. za telesne
            poškodbe ali pravice potrošnikov).
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>10. Odpoved in prenehanje</h2>
          <p style={P}>
            Uporabo lahko kadarkoli prenehaš in svoj račun izbrišeš. Ponudnik lahko dostop ali
            račun začasno omeji ali ukine ob kršitvi teh pogojev, zlorabi ali zakonski zahtevi;
            kadar je to razumno mogoče, te o tem predhodno obvesti. Ob prenehanju preneha pravica
            do uporabe storitve; svoje podatke lahko pred izbrisom izvoziš. Določbe o odgovornosti,
            intelektualni lastnini in reševanju sporov veljajo tudi po prenehanju.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>11. Veljavno pravo in pristojnost</h2>
          <p style={P}>
            Za te pogoje in uporabo storitve velja pravo Republike Slovenije, brez pravil o
            koliziji zakonov. Za spore je pristojno stvarno pristojno sodišče v Ljubljani, razen
            če prisilni predpisi (npr. varstvo potrošnikov) določajo drugače. Morebitne spore
            skušamo najprej rešiti sporazumno; kot potrošnik se lahko obrneš tudi na platformo EU
            za spletno reševanje sporov (ec.europa.eu/consumers/odr).
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>12. Jezik</h2>
          <p style={P}>
            Ti pogoji so izvorno v slovenščini. Morebitni prevodi so zgolj v pomoč; v primeru
            razhajanja prevlada slovenska različica.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>13. Spremembe</h2>
          <p style={P}>
            Ponudnik lahko orodje in te pogoje kadarkoli spremeni, omeji ali ukine.
            Velja različica pogojev, objavljena na tej strani. O bistvenih spremembah te
            obvestimo vnaprej.
          </p>
          <p style={{ ...P, color: 'rgba(17,17,17,.6)', fontSize: '.85rem' }}>
            Zadnja sprememba: 7. 8. 2026 · Kontakt: tina@pinart.si
          </p>
        </section>

        <p style={{ marginTop: '3rem' }}>
          <a href={localePath(locale, `/kalkulator`)} style={{ color: 'var(--ink)', fontSize: '.88rem' }}>← Nazaj na kalkulator</a>
        </p>
      </div>
    </main>
  );
}
