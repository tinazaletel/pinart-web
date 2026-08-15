import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { localePath } from '@/i18n/routing';
import NazajLink from '@/components/NazajLink';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return locale === 'en'
    ? {
        title: 'Pinart Flow: Terms of Use',
        description: 'Terms of Use for Pinart Flow and its free pricing calculator for creatives.',
        robots: { index: false },
      }
    : {
        title: 'Pinart Flow: pogoji uporabe',
        description: 'Pogoji uporabe in varstvo podatkov za platformo Pinart Flow ter brezplačni kalkulator cen za kreativce.',
        robots: { index: false },
      };
}

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

  const en = locale === 'en';

  const S: React.CSSProperties = { marginTop: '2.6rem' };
  const H: React.CSSProperties = { fontSize: '.78rem', fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: '.7rem' };
  const P: React.CSSProperties = { fontSize: '.95rem', lineHeight: 1.75, color: 'rgba(17,17,17,.8)', margin: '0 0 .8rem' };
  const OSNUTEK: React.CSSProperties = { ...P, padding: '.8rem 1rem', border: '1px solid rgba(178,84,118,.4)', borderRadius: '.75rem', fontWeight: 600 };

  return (
    <main style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'clamp(2.25rem, 6vw, 5rem) 1.4rem 4rem', color: 'var(--ink)', fontWeight: 300 }}>
        {/* Brez tega je stran slepa ulica: iz profila ali onboardinga se je
            dalo priti sem, nazaj pa samo z gumbom brskalnika. */}
        <NazajLink />
        <p style={{ marginTop: '1.4rem', fontSize: '.72rem', fontWeight: 600, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(17,17,17,.72)' }}>
          Pinart Flow
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif), Didot, serif', fontWeight: 500, fontSize: 'clamp(2.2rem, 7vw, 3.6rem)', lineHeight: 1, letterSpacing: '-.01em', margin: '.6rem 0 1rem' }}>
          {en ? 'Terms of Use' : 'Pogoji uporabe'}
        </h1>
        {en && <p style={OSNUTEK}>DRAFT — pending legal review.</p>}
        <p style={P}>
          {en ? (
            <>
              Pinart Flow is a platform of <strong>Pinart d.o.o.</strong>, Mladinska ulica 63,
              1000 Ljubljana, Slovenia (the &quot;provider&quot;), designed for creatives to calculate fair
              prices, prepare proposals, contracts and invoices, and manage clients and projects. The free
              pricing calculator is part of the platform and works without signing in as well. By using the
              platform or its tools you agree to these terms.
            </>
          ) : (
            <>
              Pinart Flow je platforma družbe <strong>Pinart d.o.o.</strong>, Mladinska ulica 63,
              1000 Ljubljana (v nadaljevanju: ponudnik), namenjena kreativcem za izračun poštenih
              cen, pripravo ponudb, pogodb in računov ter vodenje strank in projektov. Brezplačni
              kalkulator cen je del platforme in deluje tudi brez prijave. Z uporabo platforme ali
              orodij se strinjaš s temi pogoji.
            </>
          )}
        </p>

        <section style={S}>
          <h2 style={H}>{en ? 'Definitions' : 'Pojmi'}</h2>
          <p style={P}>
            {en ? (
              <>
                In these terms: <strong>the provider</strong> (or &quot;we&quot;) means Pinart d.o.o.;
                <strong> the platform</strong> (or &quot;Pinart Flow&quot;) means the Pinart Flow application
                together with its free pricing calculator and tools; <strong>you</strong> (or &quot;the user&quot;)
                means the person using the platform; <strong>Pupa</strong> means our AI assistant (artificial
                intelligence) integrated in the platform; <strong>AI output</strong> means content generated
                by Pupa; <strong>the vault</strong> means the Authorship vault feature; a
                <strong> subprocessor</strong> means a third party that processes data on the provider&apos;s
                instructions.
              </>
            ) : (
              <>
                V teh pogojih: <strong>ponudnik</strong> (ali »mi«) pomeni Pinart d.o.o.;
                <strong> platforma</strong> (ali »Pinart Flow«) pomeni aplikacijo Pinart Flow skupaj z
                brezplačnim kalkulatorjem cen in orodji; <strong>ti</strong> (ali »uporabnik«) pomeni
                osebo, ki uporablja platformo; <strong>Pupa</strong> pomeni našo AI pomočnico (umetno
                inteligenco), vgrajeno v platformo; <strong>izhod AI</strong> pomeni vsebino, ki jo ustvari
                Pupa; <strong>sef</strong> pomeni funkcijo Sef avtorstva; <strong>podobdelovalec</strong>
                pomeni tretjo osebo, ki obdeluje podatke po navodilih ponudnika.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '1. Informative nature of the calculations' : '1. Informativna narava izračunov'}</h2>
          <p style={P}>
            {en ? (
              <>
                All calculations, prices, ranges and proposal texts are purely informative and
                for orientation only. <strong>We do not guarantee that the tool calculates the right
                price for your case.</strong> The calculations do not constitute pricing, tax,
                accounting or legal advice. You decide on the prices in your proposals yourself
                and are solely responsible for them.
              </>
            ) : (
              <>
                Vsi izračuni, cene, razponi in besedila ponudb so zgolj informativni in
                orientacijski. <strong>Ne jamčimo, da orodje izračuna pravo ceno za tvoj
                primer.</strong> Izračuni ne predstavljajo cenovnega, davčnega,
                računovodskega ali pravnega svetovanja. Za cene v svojih ponudbah se
                odločaš sam in zanje odgovarjaš izključno sam.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '1a. Where the recommended prices come from' : '1a. Od kod priporočene cene'}</h2>
          <p style={P}>
            {en ? (
              <>
                The default prices and multipliers are the expert estimate of the tool&apos;s author based on
                her experience and publicly available sources. <strong>For now they are not based on
                measured market data</strong>; the anonymous statistics (section 5) are only now building
                that database. You can and should adjust all amounts to your own circumstances.
              </>
            ) : (
              <>
                Privzete cene in množitelji so strokovna ocena avtorice orodja na podlagi
                njenih izkušenj in javno dostopnih virov. <strong>Zaenkrat ne temeljijo na
                izmerjenih tržnih podatkih</strong>; anonimna statistika (točka 5) tako
                bazo šele gradi. Vse zneske lahko in naj prilagodiš svojim razmeram.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '2. Taxes' : '2. Davki'}</h2>
          <p style={P}>
            {en ? (
              <>
                VAT displays (including the reference to Article 94 of the Slovenian VAT Act (ZDDV-1)) are
                general and may not match your tax situation. Before issuing proposals and invoices,
                check your obligations with your accountant or the tax authority (FURS).
              </>
            ) : (
              <>
                Prikazi DDV (vključno s sklicem na 94. člen ZDDV-1) so splošni in morda ne
                ustrezajo tvoji davčni situaciji. Pred izstavitvijo ponudb in računov
                preveri svoje obveznosti pri računovodji ali FURS.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '2a. Subscription and payment' : '2a. Naročnina in plačilo'}</h2>
          <p style={P}>
            {en ? (
              <>
                The fair-price calculator is and remains free. Access to paid plans
                (Premium, Pro) is subject to a subscription at the prices published on the page at
                the time of purchase. The subscription is billed in advance for the selected period
                (monthly or yearly) and renews automatically until you cancel it.
              </>
            ) : (
              <>
                Kalkulator poštenih cen je in ostane brezplačen. Za dostop do plačljivih paketov
                (Premium, Pro) velja naročnina po cenah, objavljenih na strani ob nakupu.
                Naročnina se obračunava vnaprej za izbrano obdobje (mesečno ali letno) in se
                samodejno podaljšuje, dokler je ne odpoveš.
              </>
            )}
          </p>
          <p style={P}>
            {en ? (
              <>
                Payments are processed by an <strong>external authorised payment provider (Merchant of Record)</strong>,
                which issues the invoice in its own name and calculates and settles any VAT according to your
                country. For this purpose the payment provider is an independent controller of the payment data;
                the provider (Pinart d.o.o.) does not receive or store the full payment card number.
              </>
            ) : (
              <>
                Plačila obdeluje <strong>zunanji pooblaščeni ponudnik plačil (Merchant of Record)</strong>,
                ki v svojem imenu izda račun ter obračuna in poravna morebitni DDV glede na tvojo
                državo. Ponudnik plačil je za ta namen samostojni upravljavec plačilnih podatkov;
                ponudnik (Pinart d.o.o.) ne prejme in ne hrani celotne številke plačilne kartice.
              </>
            )}
          </p>
          <p style={P}>
            {en ? (
              <>
                <strong>We may change subscription prices at any time, including increases.</strong> We announce
                any change in advance; it takes effect from the next billing period. A period already paid
                for remains at the price at the time of purchase. You may cancel the subscription at any time
                and it remains valid until the end of the paid period; a proportional refund for a period already
                started is not guaranteed, unless required by mandatory law.
              </>
            ) : (
              <>
                <strong>Cene naročnine lahko kadarkoli spremenimo, tudi zvišamo.</strong> Spremembo
                objavimo vnaprej; začne veljati ob naslednjem obračunskem obdobju. Že plačano obdobje
                ostane po ceni ob nakupu. Naročnino lahko kadarkoli odpoveš in velja do konca
                plačanega obdobja; sorazmerno vračilo za že začeto obdobje ni zagotovljeno, razen
                če to zahteva prisilni predpis.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '2b. Refunds' : '2b. Vračila'}</h2>
          <p style={P}>
            {en ? (
              <>
                Subscriptions are billed in advance for the selected period and are, as a rule,
                non-refundable for a period already started, except where mandatory law provides
                otherwise. If you are a consumer in the EU, a statutory 14-day withdrawal right may apply;
                for digital services that begin at your request, this right ends once performance has begun
                with your consent. If a payment was clearly charged in error, contact us at tina@pinart.si.
              </>
            ) : (
              <>
                Naročnina se obračuna vnaprej za izbrano obdobje in za že začeto obdobje praviloma ni
                vračljiva, razen če prisilni predpis določa drugače. Če si potrošnik v EU, lahko velja
                zakonska 14-dnevna pravica do odstopa; pri digitalnih storitvah, ki se začnejo na tvojo
                zahtevo, ta pravica preneha, ko se izvajanje s tvojim soglasjem začne. Če je bilo plačilo
                očitno obračunano pomotoma, nas kontaktiraj na tina@pinart.si.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '3. No warranties' : '3. Brez jamstev'}</h2>
          <p style={P}>
            {en ? (
              <>
                The tool is provided &quot;as is&quot;. The provider does not warrant the accuracy,
                completeness or suitability of the calculations for a particular purpose and is not liable for
                any damage arising from the use of the tool or from reliance on
                its results.
              </>
            ) : (
              <>
                Orodje je na voljo »takšno, kot je«. Ponudnik ne jamči za točnost,
                popolnost ali primernost izračunov za določen namen in ne odgovarja za
                morebitno škodo, ki bi nastala z uporabo orodja ali zanašanjem na
                njegove rezultate.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '3a. Beta / early access' : '3a. Beta / zgodnji dostop'}</h2>
          <p style={P}>
            {en ? (
              <>
                During the closed beta (early access), the platform is offered &quot;as is&quot; and is
                under active development. Features may change, be added or removed, and beta data may
                occasionally be reset or migrated. We recommend keeping your own backup of important
                documents. Beta access may be limited or ended at any time.
              </>
            ) : (
              <>
                V času zaprte bete (zgodnji dostop) je platforma na voljo »takšna, kot je« in v
                aktivnem razvoju. Funkcije se lahko spremenijo, dodajo ali odstranijo, beta podatki
                pa se lahko občasno ponastavijo ali migrirajo. Priporočamo, da pomembne dokumente
                hraniš v lastni varnostni kopiji. Dostop do bete lahko kadarkoli omejimo ali ukinemo.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '3b. Availability and third-party services' : '3b. Razpoložljivost in storitve tretjih'}</h2>
          <p style={P}>
            {en ? (
              <>
                The platform depends on third-party services (e.g. hosting and database at Vercel and
                Supabase, email at Resend, and the AI assistant Pupa via Anthropic). The provider does not
                guarantee uninterrupted, timely, secure or error-free operation — occasional errors in
                display, layout or functionality may occur — and may carry out maintenance or experience
                outages, including of Pupa or another feature; such features may be temporarily or permanently
                unavailable. To the maximum extent permitted by law, the provider is not liable
                for downtime, interruptions or any resulting loss (see also sections 9 and 9c). We recommend
                keeping your own backup of important data.
              </>
            ) : (
              <>
                Platforma je odvisna od storitev tretjih (npr. gostovanje in baza pri Vercel in Supabase,
                e-pošta pri Resend ter AI asistentka Pupa prek Anthropic). Ponudnik ne jamči neprekinjenega,
                pravočasnega, varnega ali brezhibnega delovanja — občasne napake v prikazu, postavitvi ali
                delovanju so mogoče — ter lahko izvaja vzdrževanje ali doživi izpade, tudi Pupe ali druge
                funkcije; take funkcije so lahko začasno ali trajno nedostopne.
                V največjem obsegu, ki ga dopušča pravo, ponudnik ne odgovarja za izpade, prekinitve ali
                morebitno posledično škodo (glejte tudi točki 9 in 9c). Priporočamo, da pomembne podatke
                hraniš v lastni varnostni kopiji.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '4. User account and access' : '4. Uporabniški račun in dostop'}</h2>
          <p style={P}>
            {en ? (
              <>
                To save documents and access the platform you create an account (e.g. by signing in
                via Google). To sign you in we receive your email and name from the selected sign-in
                provider. You are responsible for activity on your account and for protecting access. During
                the closed beta, access is available by invitation; the provider may change, restrict or
                discontinue access, plans or individual features at any time.
              </>
            ) : (
              <>
                Za shranjevanje dokumentov in dostop do platforme ustvariš račun (npr. s prijavo
                prek Googla). Za prijavo prejmemo tvoj e-naslov in ime iz izbranega ponudnika
                prijave. Odgovarjaš za dejavnost na svojem računu in za varovanje dostopa. V času
                zaprte bete je dostop mogoč na podlagi povabila; ponudnik lahko dostop, pakete ali
                posamezne funkcije kadarkoli spremeni, omeji ali ukine.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '4a. Where your data is stored' : '4a. Kje se hranijo tvoji podatki'}</h2>
          <p style={P}>
            {en ? (
              <>
                <strong>Without signing in</strong> (e.g. the free calculator) your settings, prices
                and drafts are stored solely locally in your browser (localStorage) and are not
                sent to the provider; you delete them by clearing your browser data.
              </>
            ) : (
              <>
                <strong>Brez prijave</strong> (npr. brezplačni kalkulator) se tvoje nastavitve, cene
                in osnutki shranjujejo izključno lokalno v tvojem brskalniku (localStorage) in se ne
                pošiljajo ponudniku; izbrišeš jih z brisanjem podatkov brskalnika.
              </>
            )}
          </p>
          <p style={P}>
            {en ? (
              <>
                <strong>When you are signed in</strong>, your business data (proposals, contracts,
                invoices, clients, projects, expenses, tasks and the like) is stored in the provider&apos;s
                cloud database (Supabase, servers in the EU). The data is tied to your account and private —
                access is restricted by database-level rules. The provider does not sell it and does not
                disclose it to third parties, except to subprocessors necessary for operating the service (section 8a), or where
                required by law. You may request deletion of your account or data at any time at tina@pinart.si.
              </>
            ) : (
              <>
                <strong>Ko si prijavljen</strong>, se tvoji poslovni podatki (ponudbe, pogodbe,
                računi, stranke, projekti, stroški, naloge in podobno) shranjujejo v oblačni bazi
                ponudnika (Supabase, strežniki v EU). Podatki so vezani na tvoj račun in zasebni —
                dostop je omejen s pravili na ravni baze. Ponudnik jih ne prodaja in ne razkriva
                tretjim, razen podobdelovalcem, potrebnim za delovanje storitve (točka 8a), ali kadar
                to zahteva zakon. Izbris računa ali podatkov lahko kadarkoli zahtevaš na tina@pinart.si.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '4b. Communications' : '4b. Komunikacije'}</h2>
          <p style={P}>
            {en ? (
              <>
                If you use the communication features (project chat, project mail), the content of the
                messages is stored in the provider&apos;s cloud database so that it is accessible to you and to the
                people you share the project with. Outgoing email is sent via an external email provider (Resend).
                You are responsible for the content of your messages.
              </>
            ) : (
              <>
                Če uporabljaš funkcije komunikacije (projektni klepet, projektna pošta), se vsebina
                sporočil shranjuje v oblačni bazi ponudnika, da je dostopna tebi in osebam, s katerimi
                deliš projekt. Odhodna e-pošta se pošilja prek zunanjega ponudnika e-pošte (Resend).
                Za vsebino svojih sporočil odgovarjaš sam.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '4c. Authorship vault' : '4c. Sef avtorstva'}</h2>
          <p style={OSNUTEK}>{en ? 'DRAFT — must be legally reviewed and approved by a lawyer.' : 'OSNUTEK — pravno mora potrditi odvetnik.'}</p>
          <p style={P}>
            {en ? (
              <>
                The Authorship vault computes a cryptographic fingerprint (SHA-256) of your file and records it, together
                with the date and work details, as evidence of the existence and priority of the work. The fingerprint is a
                unique &quot;fingerprint&quot; of the file; the content cannot be reconstructed from it. For an
                independent timestamp we may use the OpenTimestamps service, which writes to a public chain (Bitcoin)
                <strong> only the fingerprint, never the file</strong>. If you opt for the cloud vault
                (paid), the original file is stored in the provider&apos;s private cloud storage (EU).
              </>
            ) : (
              <>
                Sef avtorstva izračuna kriptografski odtis (SHA-256) tvoje datoteke in ga skupaj z
                datumom ter podatki o delu zabeleži kot dokaz o obstoju in prioriteti dela. Odtis je
                enolični »prstni odtis« datoteke; iz njega ni mogoče rekonstruirati vsebine. Za
                neodvisen časovni žig lahko uporabimo storitev OpenTimestamps, ki v javno verigo (Bitcoin)
                zapiše <strong>samo odtis, nikoli datoteke</strong>. Če se odločiš za oblačni trezor
                (plačljivo), se izvirna datoteka shrani v zasebno oblačno shrambo ponudnika (EU).
              </>
            )}
          </p>
          <p style={P}>
            {en ? (
              <>
                <strong>An honest limit:</strong> the vault proves that a certain file existed on
                a certain day (existence and priority), <strong>but not absolute authorship</strong> or
                the visual originality of a style. It does not replace formal rights registration (e.g. with the competent
                office), but complements it. The provider does not warrant the legal validity of the evidence in an individual dispute.
              </>
            ) : (
              <>
                <strong>Iskrena meja:</strong> Sef dokazuje, da je določena datoteka obstajala na
                določen dan (obstoj in prioriteta), <strong>ne pa absolutnega avtorstva</strong> ali
                vizualne izvirnosti sloga. Ne nadomešča uradne registracije pravic (npr. pri pristojnem
                uradu), ampak jo dopolnjuje. Ponudnik ne jamči pravne veljave dokaza v posameznem sporu.
              </>
            )}
          </p>
          <p style={{ ...P, fontWeight: 600 }}>
            {en ? (
              <>
                <strong>Keep the original yourself.</strong> The vault is a backup and evidence, not
                the only copy. Always keep the original file on your device. The cloud vault reduces the
                risk of loss, but no system is flawless: the provider does not guarantee uninterrupted
                operation, availability or permanent retention and <strong>is not liable for the loss,
                damage or unavailability of uploaded files</strong> (see also section 9). We recommend
                that you additionally keep important works in your own backup.
              </>
            ) : (
              <>
                <strong>Original obdrži pri sebi.</strong> Sef je varnostna kopija in dokazilo, ne
                edini izvod. Vedno ohrani izvirno datoteko na svoji napravi. Oblačni trezor zmanjša
                tveganje izgube, a noben sistem ni brez napak: ponudnik ne jamči neprekinjenega
                delovanja, razpoložljivosti ali trajne hrambe in <strong>ne odgovarja za izgubo,
                poškodbo ali nedostopnost naloženih datotek</strong> (glejte tudi točko 9). Priporočamo,
                da pomembna dela dodatno hraniš na lastni varnostni kopiji.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '4d. Acceptable use' : '4d. Sprejemljiva raba'}</h2>
          <p style={P}>
            {en ? (
              <>
                You agree to use the platform lawfully and fairly. You must not: (a) break the law or
                infringe the rights of others; (b) introduce malware, viruses or malicious code, or in
                any way damage, disrupt or compromise the platform, its code, security, availability or
                content; (c) attempt to access other users&apos; data or bypass access controls; (d) copy,
                reproduce, scrape or reuse any of the platform&apos;s content — text, visual design or code —
                or otherwise infringe the copyright and other intellectual-property rights of the provider
                or third parties; (e) resell, sublicense or reverse-engineer the platform; (f) send spam or
                unlawful, misleading or abusive content through the communication features. We may restrict
                or suspend an account that breaches these rules and pursue any damage caused.
              </>
            ) : (
              <>
                Zavezuješ se, da boš platformo uporabljal zakonito in pošteno. Ne smeš: (a) kršiti
                zakonov ali pravic drugih; (b) vnašati zlonamerne programske opreme, virusov ali
                škodljive kode ali na kakršenkoli način poškodovati, motiti ali ogroziti platforme,
                njene kode, varnosti, razpoložljivosti ali vsebine; (c) poskušati dostopati do podatkov
                drugih uporabnikov ali obiti nadzora dostopa; (d) kopirati, razmnoževati, strojno
                pobirati ali ponovno uporabljati katere koli vsebine platforme — besedila, vizualne
                zasnove ali kode — ali kako drugače kršiti avtorskih in drugih pravic intelektualne
                lastnine ponudnika ali tretjih; (e) preprodajati, podeljevati podlicenc ali obratno
                inženiriti platforme; (f) prek funkcij komunikacije pošiljati neželenih, nezakonitih,
                zavajajočih ali žaljivih vsebin. Račun, ki krši ta pravila, lahko omejimo ali začasno
                onemogočimo in uveljavljamo morebitno povzročeno škodo.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '4e. Eligibility and age' : '4e. Upravičenost in starost'}</h2>
          <p style={P}>
            {en ? (
              <>
                The platform is intended for business use by adults (persons 18 or older) with the legal
                capacity to enter into a contract. By using it you confirm that you meet these conditions.
                The platform is not intended for children.
              </>
            ) : (
              <>
                Platforma je namenjena poslovni uporabi polnoletnih oseb (18 let ali več) s poslovno
                sposobnostjo za sklenitev pogodbe. Z uporabo potrjuješ, da izpolnjuješ te pogoje.
                Platforma ni namenjena otrokom.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '5. Anonymous pricing statistics' : '5. Anonimna statistika cen'}</h2>
          <p style={P}>
            {en ? (
              <>
                On the first display of a calculation in a session, the tool anonymously records exactly the following:
                the selected services, experience level, your market, the client&apos;s market, the type of use
                (brand or project), the calculated production and copyright amount, and the
                currency. The record does not contain a name, email, IP address or other personal
                data and cannot be linked to you. The data is stored in the
                provider&apos;s database and used solely for aggregate pricing statistics on the market
                for creatives. Once the database is large enough, the aggregate data (e.g. median prices by
                service and experience) will be available to the tool&apos;s users — so every calculation contributes
                to a view of the market that creatives do not have today.
              </>
            ) : (
              <>
                Ob prvem prikazu izračuna v seji orodje anonimno zabeleži natanko tole:
                izbrane storitve, raven izkušenj, tvoj trg, trg naročnika, vrsto rabe
                (znamka ali projekt), izračunan znesek izvedbe in avtorskih pravic ter
                valuto. Zapis ne vsebuje imena, e-naslova, IP-naslova ali drugih osebnih
                podatkov in ga ni mogoče povezati s teboj. Podatki se shranijo v
                ponudnikovo bazo in se uporabijo izključno za skupno statistiko cen na trgu
                za kreativce. Ko bo baza dovolj velika, bodo zbirni podatki (npr. mediane cen po
                storitvah in izkušnjah) na voljo uporabnikom orodja — vsak izračun torej prispeva
                k pregledu trga, ki ga kreativci danes nimajo.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '6. Name and email on download or profile' : '6. Ime in e-naslov ob prenosu ali profilu'}</h2>
          <p style={P}>
            {en ? (
              <>
                If you enter your name and email when downloading a proposal or saving a profile,
                the provider stores them for the purpose of informing you about the tool and its services
                (legal basis: consent). You may withdraw consent at any time by a
                message to tina@pinart.si; more in the <a href={localePath(locale, `/zasebnost`)} style={{ color: 'var(--ink)' }}>privacy policy</a>.
              </>
            ) : (
              <>
                Če pri prenosu ponudbe ali shranjevanju profila vpišeš ime in e-naslov,
                ju ponudnik hrani za namen obveščanja o orodju in svojih storitvah
                (pravna podlaga: privolitev). Privolitev lahko kadarkoli prekličeš s
                sporočilom na tina@pinart.si; več v <a href={localePath(locale, `/zasebnost`)} style={{ color: 'var(--ink)' }}>politiki zasebnosti</a>.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '7. Artificial intelligence (Pupa) and data security' : '7. Umetna inteligenca (Pupa) in varnost podatkov'}</h2>
          <p style={OSNUTEK}>{en ? 'DRAFT — must be legally reviewed and approved by a lawyer.' : 'OSNUTEK — pravno mora potrditi odvetnik.'}</p>
          <p style={P}>
            {en ? (
              <>
                Pupa is our optional AI assistant (artificial intelligence) that runs server-side via
                the Anthropic Claude API, so the API key is not exposed in the browser. Anthropic receives only the content
                you enter into Pupa, and the minimal context of the open tool or proposal
                needed for a response; nothing else. Anthropic has no access to the Pinart
                Flow database — it sees only the text of the individual request and cannot read or export the database.
              </>
            ) : (
              <>
                Pupa je naša izbirna AI pomočnica (umetna inteligenca), ki deluje strežniško prek
                Anthropic Claude API, zato API ključ ni izpostavljen v brskalniku. Anthropic prejme samo vsebino,
                ki jo vneseš v Pupo, in minimalen kontekst odprtega orodja ali ponudbe,
                potreben za odgovor; nič drugega. Anthropic nima dostopa do baze Pinart
                Flow — vidi le besedilo posamezne zahteve in baze ne more brati ali izvoziti.
              </>
            )}
          </p>
          <p style={P}>
            {en ? (
              <>
                <strong>Do not enter confidential data, trade secrets or your clients&apos; personal
                data into Pupa.</strong> If you do not use Pupa, no data is
                sent to Anthropic or any other external
                AI provider. The Pinart Flow tools work without AI, and prices are calculated with formulas
                and rules locally or on the Pinart Flow backend.
              </>
            ) : (
              <>
                <strong>V Pupo ne vnašaj zaupnih podatkov, poslovnih skrivnosti ali osebnih
                podatkov svojih strank.</strong> Če Pupe ne uporabljaš, se podatki ne
                pošiljajo družbi Anthropic ali kateremu koli drugemu zunanjemu ponudniku
                AI. Orodja Pinart Flow delujejo brez AI, cene pa se izračunajo s formulami
                in pravili lokalno oziroma na zaledju Pinart Flow.
              </>
            )}
          </p>
          <p style={P}>
            {en ? (
              <>
                Anthropic is intended to act as a subprocessor. Under its current terms,
                commercial API inputs and outputs are by default not used for training
                models, and retention follows its current terms. Any transfer to the United States
                must be governed by a DPA with Anthropic and appropriate Standard
                Contractual Clauses (SCCs). A lawyer must determine the legal basis (consent or legitimate
                interest) before publication. The list of subprocessors is
                available on request at tina@pinart.si.
              </>
            ) : (
              <>
                Anthropic je predviden kot podobdelovalec. Po njegovih aktualnih pogojih
                se vhodi in izhodi komercialnega API privzeto ne uporabljajo za učenje
                modelov, hramba pa sledi njegovim aktualnim pogojem. Morebitni prenos v ZDA
                mora biti urejen z DPA z družbo Anthropic in ustreznimi standardnimi
                pogodbenimi klavzulami (SCC). Pravno podlago (privolitev ali zakoniti
                interes) mora pred objavo določiti odvetnik. Seznam podobdelovalcev je na
                voljo na zahtevo na tina@pinart.si.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '8. Intellectual property' : '8. Intelektualna lastnina'}</h2>
          <p style={P}>
            {en ? (
              <>
                The tool, its design and content are the property of the provider. The texts of proposals,
                contracts and invoices that you create with the tool may be freely used for
                your business. The copyright in works you upload to the vault or
                create yourself remains yours.
              </>
            ) : (
              <>
                Orodje, njegova zasnova in vsebine so last ponudnika. Besedila ponudb,
                pogodb in računov, ki jih ustvariš z orodjem, lahko prosto uporabljaš za
                svoje poslovanje. Avtorske pravice na delih, ki jih naložiš v Sef ali
                ustvariš sam, ostanejo tvoje.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '8a. Subprocessors' : '8a. Podobdelovalci'}</h2>
          <p style={P}>
            {en ? (
              <>
                To operate the platform we use trusted subprocessors that process the data
                strictly on our instructions:
              </>
            ) : (
              <>
                Za delovanje platforme uporabljamo zaupanja vredne podobdelovalce, ki podatke
                obdelujejo izključno po naših navodilih:
              </>
            )}
          </p>
          <p style={{ ...P, color: 'rgba(17,17,17,.72)' }}>
            {en ? (
              <>
                — <strong>Supabase</strong> — cloud database and storage (servers in the EU)<br />
                — <strong>Vercel</strong> — hosting and delivery of the web application<br />
                — <strong>Resend</strong> — sending email<br />
                — <strong>Google</strong> — sign-in with a Google account (OAuth)<br />
                — <strong>Anthropic</strong> — the AI assistant Pupa (only when used)<br />
                — <strong>OpenTimestamps / Bitcoin</strong> — independent timestamp for the vault (receives only the fingerprint)<br />
                — an authorised payment provider (Merchant of Record) — subscription payment processing
              </>
            ) : (
              <>
                — <strong>Supabase</strong> — oblačna baza in shramba (strežniki v EU)<br />
                — <strong>Vercel</strong> — gostovanje in dostava spletne aplikacije<br />
                — <strong>Resend</strong> — pošiljanje e-pošte<br />
                — <strong>Google</strong> — prijava z Google računom (OAuth)<br />
                — <strong>Anthropic</strong> — AI asistentka Pupa (samo ob uporabi)<br />
                — <strong>OpenTimestamps / Bitcoin</strong> — neodvisni časovni žig sefa (prejme samo odtis)<br />
                — pooblaščeni ponudnik plačil (Merchant of Record) — obdelava plačil naročnine
              </>
            )}
          </p>
          <p style={P}>
            {en ? (
              <>The current list is available on request at tina@pinart.si.</>
            ) : (
              <>Aktualni seznam je na voljo na zahtevo na tina@pinart.si.</>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '8b. Your clients’ data (data processing)' : '8b. Podatki tvojih strank (obdelava)'}</h2>
          <p style={P}>
            {en ? (
              <>
                If, as a business user, you store your own clients&apos; or third parties&apos; personal data
                in the platform (e.g. in clients, projects or communications), you act as the controller of
                that data and the provider acts as your processor, processing it only to provide the service
                and on your instructions. For such processing a data processing agreement (DPA) is available
                on request at tina@pinart.si. You are responsible for having a lawful basis to enter that data
                and for informing the individuals concerned.
              </>
            ) : (
              <>
                Če kot poslovni uporabnik v platformo shraniš osebne podatke svojih strank ali tretjih
                (npr. v stranke, projekte ali komunikacije), si upravljavec teh podatkov, ponudnik pa je
                tvoj obdelovalec, ki jih obdeluje le za zagotavljanje storitve in po tvojih navodilih. Za
                tako obdelavo je na zahtevo na tina@pinart.si na voljo pogodba o obdelavi podatkov (DPA).
                Sam odgovarjaš, da imaš zakonito podlago za vnos teh podatkov in da o tem obvestiš svoje
                posameznike.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '9. Limitation of liability' : '9. Omejitev odgovornosti'}</h2>
          <p style={P}>
            {en ? (
              <>
                The provider is liable only for damage caused intentionally or through gross negligence.
                To the maximum extent permitted by law, the provider is not liable for indirect,
                consequential or non-material damage (e.g. lost profit, loss of data or
                business). The provider&apos;s total liability in connection with a paid service is limited to
                the amount you paid for it in the last 12 months. Nothing in these terms excludes
                liability that cannot be excluded under mandatory law (e.g. for personal
                injury or consumer rights).
              </>
            ) : (
              <>
                Ponudnik odgovarja le za škodo, povzročeno naklepno ali iz hude malomarnosti.
                V največjem obsegu, ki ga dopušča pravo, ponudnik ne odgovarja za posredno,
                posledično ali nepremoženjsko škodo (npr. izgubljen dobiček, izguba podatkov ali
                posla). Skupna odgovornost ponudnika v zvezi s plačljivo storitvijo je omejena na
                znesek, ki si ga zanjo plačal v zadnjih 12 mesecih. Nič v teh pogojih ne izključuje
                odgovornosti, ki je po prisilnih predpisih ni mogoče izključiti (npr. za telesne
                poškodbe ali pravice potrošnikov).
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '9a. Decisions based on the tool and AI' : '9a. Odločitve na podlagi orodja in AI'}</h2>
          <p style={OSNUTEK}>{en ? 'DRAFT — must be legally reviewed and approved by a lawyer.' : 'OSNUTEK — pravno mora potrditi odvetnik.'}</p>
          <p style={P}>
            {en ? (
              <>
                You use the platform and its AI tools (Pupa) at your own business risk. Calculations,
                suggestions and AI outputs are informative and are not professional, legal, financial,
                accounting or business advice. To the maximum extent permitted by law, the provider is not
                liable for any business loss, lost profit or other consequences of decisions you make based
                on the platform or its AI tools — including any AI output. Verify important decisions with a
                suitable professional.
              </>
            ) : (
              <>
                Platformo in njena AI orodja (Pupa) uporabljaš na lastno poslovno odgovornost. Izračuni,
                predlogi in izhodi AI so informativni in niso strokovni, pravni, finančni, računovodski ali
                poslovni nasvet. V največjem obsegu, ki ga dopušča pravo, ponudnik ne odgovarja za poslovno
                škodo, izgubljeni dobiček ali druge posledice odločitev, ki jih sprejmeš na podlagi platforme
                ali njenih AI orodij — vključno s katerimkoli izhodom AI. Pomembne odločitve preveri pri
                ustreznem strokovnjaku.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '9b. Indemnification' : '9b. Odškodninska zaščita'}</h2>
          <p style={P}>
            {en ? (
              <>
                You will indemnify the provider against third-party claims and any damage arising from your
                unlawful use of the platform, your breach of these terms, or the content you upload, send or
                publish through the platform.
              </>
            ) : (
              <>
                Ponudnika boš zavaroval pred zahtevki tretjih in vso škodo, ki izhaja iz tvoje nezakonite
                uporabe platforme, tvoje kršitve teh pogojev ali vsebine, ki jo prek platforme naložiš,
                pošlješ ali objaviš.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '9c. Force majeure' : '9c. Višja sila'}</h2>
          <p style={P}>
            {en ? (
              <>
                The provider is not liable for delay or failure in performance caused by circumstances beyond
                its reasonable control (e.g. outages of hosting, internet or third-party providers,
                cyber-attacks, natural events, strikes or acts of authorities).
              </>
            ) : (
              <>
                Ponudnik ne odgovarja za zamudo ali neizpolnitev zaradi okoliščin izven njegovega razumnega
                nadzora (npr. izpadi gostovanja, interneta ali tretjih ponudnikov, kibernetski napadi, naravni
                dogodki, stavke ali dejanja oblasti).
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '10. Cancellation and termination' : '10. Odpoved in prenehanje'}</h2>
          <p style={P}>
            {en ? (
              <>
                You may stop using the service at any time and delete your account. The provider may temporarily restrict or
                terminate access or the account in the event of a breach of these terms, abuse or a legal requirement;
                where reasonably possible, it will notify you in advance. On termination, the right
                to use the service ends; you may export your data before deletion. The provisions on liability,
                intellectual property and dispute resolution survive termination.
              </>
            ) : (
              <>
                Uporabo lahko kadarkoli prenehaš in svoj račun izbrišeš. Ponudnik lahko dostop ali
                račun začasno omeji ali ukine ob kršitvi teh pogojev, zlorabi ali zakonski zahtevi;
                kadar je to razumno mogoče, te o tem predhodno obvesti. Ob prenehanju preneha pravica
                do uporabe storitve; svoje podatke lahko pred izbrisom izvoziš. Določbe o odgovornosti,
                intelektualni lastnini in reševanju sporov veljajo tudi po prenehanju.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '10a. Assignment' : '10a. Prenos pogodbe'}</h2>
          <p style={P}>
            {en ? (
              <>
                The provider may transfer these terms and the operation of the service to another company
                (e.g. in a status change or acquisition), while preserving your rights under these terms; we
                will notify you of any such transfer. You may not transfer your account to another person
                without our consent.
              </>
            ) : (
              <>
                Ponudnik lahko te pogoje in izvajanje storitve prenese na drugo družbo (npr. ob statusni
                spremembi ali prevzemu), pri čemer ohrani tvoje pravice po teh pogojih; o takem prenosu te
                obvestimo. Svojega računa ne smeš prenesti na drugo osebo brez našega soglasja.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '10b. Service discontinuation and data export' : '10b. Prenehanje storitve in izvoz podatkov'}</h2>
          <p style={P}>
            {en ? (
              <>
                If the provider decides to discontinue the platform entirely, we will notify you in advance
                (as a rule at least 30 days) by email and in the app. During that period you may export all
                your data (proposals, contracts, invoices, clients, projects and the like); after it, the
                data is deleted in accordance with the privacy policy. Data export is available at any time,
                not only on discontinuation.
              </>
            ) : (
              <>
                Če se ponudnik odloči platformo v celoti ukiniti, te o tem obvestimo vnaprej (praviloma vsaj
                30 dni) po e-pošti in v aplikaciji. V tem obdobju lahko izvoziš vse svoje podatke (ponudbe,
                pogodbe, račune, stranke, projekte in podobno); po izteku se podatki izbrišejo skladno s
                politiko zasebnosti. Izvoz podatkov je na voljo kadarkoli, ne le ob ukinitvi.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '11. Governing law and jurisdiction' : '11. Veljavno pravo in pristojnost'}</h2>
          <p style={P}>
            {en ? (
              <>
                These terms and the use of the service are governed by the law of the Republic of Slovenia, without its rules on
                conflict of laws. Disputes fall under the jurisdiction of the competent court in Ljubljana, unless
                mandatory regulations (e.g. consumer protection) provide otherwise. We first try to resolve any disputes
                amicably; as a consumer you may also turn to the EU online dispute resolution
                platform (ec.europa.eu/consumers/odr).
              </>
            ) : (
              <>
                Za te pogoje in uporabo storitve velja pravo Republike Slovenije, brez pravil o
                koliziji zakonov. Za spore je pristojno stvarno pristojno sodišče v Ljubljani, razen
                če prisilni predpisi (npr. varstvo potrošnikov) določajo drugače. Morebitne spore
                skušamo najprej rešiti sporazumno; kot potrošnik se lahko obrneš tudi na platformo EU
                za spletno reševanje sporov (ec.europa.eu/consumers/odr).
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '11a. Notices' : '11a. Obveščanje'}</h2>
          <p style={P}>
            {en ? (
              <>
                We send notices related to your account and these terms to the email tied to your account or
                as an in-app message; keeping that address current is your responsibility. You can reach the
                provider at tina@pinart.si.
              </>
            ) : (
              <>
                Obvestila v zvezi s tvojim računom in temi pogoji pošiljamo na e-naslov, vezan na tvoj račun,
                ali kot sporočilo v aplikaciji; za ažurnost tega naslova odgovarjaš sam. Ponudnika dosežeš na
                tina@pinart.si.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '11b. Severability' : '11b. Delna neveljavnost'}</h2>
          <p style={P}>
            {en ? (
              <>
                If any provision of these terms is found invalid or unenforceable, the remaining provisions
                stay in full force, and the invalid provision is replaced by a valid one that comes closest to
                its intended purpose.
              </>
            ) : (
              <>
                Če se katera določba teh pogojev izkaže za neveljavno ali neizvršljivo, ostanejo preostale
                določbe v celoti veljavne, neveljavna določba pa se nadomesti z veljavno, ki je najbliže
                njenemu namenu.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '11c. Entire agreement and waiver' : '11c. Celovit dogovor in odpoved uveljavljanja'}</h2>
          <p style={P}>
            {en ? (
              <>
                These terms, together with the privacy policy, constitute the entire agreement between you and
                the provider regarding use of the platform. If the provider does not enforce a right on a given
                occasion, it does not waive that right.
              </>
            ) : (
              <>
                Ti pogoji skupaj s politiko zasebnosti predstavljajo celoten dogovor med teboj in ponudnikom
                glede uporabe platforme. Če ponudnik ob določeni priložnosti neke pravice ne uveljavi, se ji s
                tem ne odpove.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '12. Language' : '12. Jezik'}</h2>
          <p style={P}>
            {en ? (
              <>
                These terms are originally in Slovenian. Any translations are provided for convenience only; in the event
                of a discrepancy, the Slovenian version prevails.
              </>
            ) : (
              <>
                Ti pogoji so izvorno v slovenščini. Morebitni prevodi so zgolj v pomoč; v primeru
                razhajanja prevlada slovenska različica.
              </>
            )}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '13. Changes' : '13. Spremembe'}</h2>
          <p style={P}>
            {en ? (
              <>
                The provider may change, restrict or discontinue the tool and these terms at any time.
                The version of the terms published on this page applies. We will notify you of material changes
                in advance.
              </>
            ) : (
              <>
                Ponudnik lahko orodje in te pogoje kadarkoli spremeni, omeji ali ukine.
                Velja različica pogojev, objavljena na tej strani. O bistvenih spremembah te
                obvestimo vnaprej.
              </>
            )}
          </p>
          <p style={{ ...P, color: 'rgba(17,17,17,.6)', fontSize: '.85rem' }}>
            {en ? 'Last updated: 15 Aug 2026 · Contact: tina@pinart.si' : 'Zadnja sprememba: 15. 8. 2026 · Kontakt: tina@pinart.si'}
          </p>
        </section>

        <p style={{ marginTop: '3rem' }}>
          <a href={localePath(locale, `/kalkulator`)} style={{ color: 'var(--ink)', fontSize: '.88rem' }}>{en ? '← Back to the calculator' : '← Nazaj na kalkulator'}</a>
        </p>
      </div>
    </main>
  );
}
