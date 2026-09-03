'use client';

/* TOPLOTNE KARTE IN POSNETKI SEJ — Microsoft Clarity in PostHog.
 *
 * Oba sta v kodi NAMENOMA (Tina, 31. 8. 2026: izbrala je PostHog):
 * teče tisti, ki ima nastavljen ključ. Clarity ostane v kodi kot rezerva —
 * če bi kdaj hotela primerjavo, je dovolj dodati NEXT_PUBLIC_CLARITY_ID.
 *
 * DVE PRAVILI, KI NISTA TEHNIČNI:
 *
 * 1. Šele po SOGLASJU. Isti vzorec kot GoogleAnalytics: brez privolitve se ne
 *    naloži nič. Posnetek seje brez soglasja v EU ni sporen le formalno — je
 *    snemanje človeka, ki tega ni odobril.
 *
 * 2. NIKOLI v aplikaciji. Pod /kalkulator uporabnik tipka imena, naslove in
 *    davčne številke SVOJIH strank; posnetek tega bi pomenil, da te podatke
 *    pošiljamo tretjemu. Zato tam ne teče, tudi če je ključ nastavljen — in to
 *    velja tudi za brezplačni kalkulator, kjer obiskovalec prav tako vpisuje
 *    podatke svoje stranke.
 *
 * 3. NIKOLI na zasebnih povezavah in vprašalnikih (Tina, 3. 9. 2026, ko je v
 *    posnetkih PostHoga našla katalog svoje stranke). Pri /p/ in /v/ je žeton
 *    v naslovu SAM ključ — če naslov konča v analitiki, je zasebna povezava
 *    zasebna samo še po imenu, posnetek pa vsebuje dokument stranke. Na
 *    /vprasalnik ljudje vpisujejo svoje prave cene ob izrecni obljubi, da jih
 *    ne delimo naprej; posnetek te obljube ne bi držal.
 *
 * Vpisovanje je pri obeh dodatno maskirano, ker se pravilo 2 lahko kdaj po
 * nesreči obide, poteza uporabnika pa je nepovratna.
 */

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const CLARITY = process.env.NEXT_PUBLIC_CLARITY_ID ?? '';
const PH_KLJUC = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
/* EU oblak: podatki ostanejo v Evropi, kar se ujema z ostalimi obdelovalci. */
const PH_GOSTITELJ = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

export default function Sledenje() {
  const pot = usePathname() || '';
  const [soglasje, setSoglasje] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('pinart_cookie_consent') === 'accepted') setSoglasje(true);
    } catch { /* zasebni način */ }
    const naSoglasje = (e: Event) => {
      if ((e as CustomEvent).detail === 'accepted') setSoglasje(true);
    };
    window.addEventListener('pinart-cookie-consent', naSoglasje);
    return () => window.removeEventListener('pinart-cookie-consent', naSoglasje);
  }, []);

  /* Izvzeto — glej pravili 2 in 3 zgoraj. */
  const vOrodju = /(^|\/)kalkulator(\/|$)/.test(pot);
  const jeZasebno = /(^|\/)(p|v)\//.test(pot) || /(^|\/)vprasalnik(\/|$)/.test(pot);
  if (!soglasje || vOrodju || jeZasebno) return null;

  return (
    <>
      {CLARITY && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY}");`}
        </Script>
      )}

      {PH_KLJUC && (
        <Script id="posthog" strategy="afterInteractive">
          {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){
            function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);
            t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}
            (p=t.createElement("script")).type="text/javascript",p.async=!0,
            p.src=s.api_host+"/static/array.js",
            (r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);
            var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],
            u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},
            u.people.toString=function(){return u.toString(1)+".people (stub)"},
            o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);
            e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init('${PH_KLJUC}', {
              api_host: '${PH_GOSTITELJ}',
              person_profiles: 'identified_only',
              /* Vsebina polj se v posnetku ne vidi. */
              session_recording: { maskAllInputs: true, maskTextSelector: '[data-zasebno]' },
              capture_pageview: true,
              persistence: 'localStorage+cookie'
            });`}
        </Script>
      )}
    </>
  );
}
