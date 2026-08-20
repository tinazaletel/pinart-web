/* PONUDNIKI AI — skupen vir za obrazec v Nastavitvah (»Moj AI«) IN za zbrana
   navodila v Pomoči. Dva seznama bi se prej ali slej razšla; ta je en sam.

   Navodila so pisana za nekoga, ki API ključa še ni videl, in vsebujejo
   opozorilo, ki povzroči največ zmede: naročnina na ChatGPT Plus ali Claude Pro
   NE pokriva API-ja — ta se plačuje ločeno po porabi. */

export const AI_PONUDNIKI = [
  { id: 'openai', ime: 'OpenAI (ChatGPT)', model: 'gpt-4.1-mini',
    kjeSl: 'platform.openai.com → API keys', kjeEn: 'platform.openai.com → API keys',
    url: 'https://platform.openai.com/api-keys',
    korakiSl: [
      'Odpri platform.openai.com in se prijavi z računom, ki ga že uporabljaš za ChatGPT.',
      'NAJPREJ nastavi plačilo: levo spodaj »Add credits« → »Go to Billing«. Brez dobroimetja ključ nastane, a vsak klic zavrne. Naročnina na ChatGPT Plus tu NE velja — API se plačuje ločeno po porabi.',
      'V levem stolpcu odpri »API Keys«.',
      'Klikni »Create new secret key«, poimenuj ga npr. »Pinart Flow« in potrdi.',
      'Kopiraj ključ. Videti je približno takole: sk-proj-••••••••••••. Pokaže se SAMO enkrat.',
      'Vrni se sem: Nastavitve → AI → Moj AI, prilepi ključ in klikni »Shrani povezavo«, nato »Preveri povezavo«.'],
    korakiEn: [
      'Open platform.openai.com and sign in with the account you use for ChatGPT.',
      'FIRST set up payment: bottom left “Add credits” → “Go to Billing”. Without credit the key exists but every call is refused. A ChatGPT Plus subscription does NOT cover the API — it is billed separately per use.',
      'In the left sidebar open “API Keys”.',
      'Click “Create new secret key”, name it e.g. “Pinart Flow” and confirm.',
      'Copy the key. It looks roughly like: sk-proj-••••••••••••. It is shown ONLY once.',
      'Come back here: Settings → AI → My AI, paste the key and click “Save connection”, then “Test connection”.'] },
  { id: 'anthropic', ime: 'Anthropic (Claude)', model: 'claude-sonnet-4-20250514',
    kjeSl: 'console.anthropic.com → API keys', kjeEn: 'console.anthropic.com → API keys',
    url: 'https://console.anthropic.com/settings/keys',
    korakiSl: [
      'Odpri console.anthropic.com in se prijavi.',
      'NAJPREJ nastavi plačilo: »Plans & Billing« → dodaj dobroimetje. Naročnina na Claude Pro tu NE velja.',
      'V levem meniju odpri »API keys«.',
      'Klikni »Create Key«, poimenuj ga npr. »Pinart Flow« in potrdi.',
      'Kopiraj ključ (začne se s sk-ant-). Pokaže se SAMO enkrat.',
      'Vrni se sem: Nastavitve → AI → Moj AI, prilepi ključ, »Shrani povezavo« in »Preveri povezavo«.'],
    korakiEn: [
      'Open console.anthropic.com and sign in.',
      'FIRST set up payment: “Plans & Billing” → add credit. A Claude Pro subscription does NOT cover the API.',
      'In the left menu open “API keys”.',
      'Click “Create Key”, name it e.g. “Pinart Flow” and confirm.',
      'Copy the key (starts with sk-ant-). It is shown ONLY once.',
      'Come back here: Settings → AI → My AI, paste the key, “Save connection” and “Test connection”.'] },
  { id: 'google', ime: 'Google (Gemini)', model: 'gemini-2.5-flash',
    kjeSl: 'aistudio.google.com → API key', kjeEn: 'aistudio.google.com → API key',
    url: 'https://aistudio.google.com/app/apikey',
    korakiSl: [
      'Odpri aistudio.google.com in se prijavi z Google računom.',
      'Klikni »Get API key« oziroma »Create API key«.',
      'Izberi projekt (ali pusti privzetega) in potrdi.',
      'Kopiraj ključ.',
      'Gemini ima brezplačno raven z omejitvami. Za redno rabo vklopi obračun v Google Cloud.',
      'Vrni se sem: Nastavitve → AI → Moj AI, prilepi ključ, »Shrani povezavo« in »Preveri povezavo«.'],
    korakiEn: [
      'Open aistudio.google.com and sign in with your Google account.',
      'Click “Get API key” or “Create API key”.',
      'Pick a project (or keep the default) and confirm.',
      'Copy the key.',
      'Gemini has a free tier with limits. For regular use enable billing in Google Cloud.',
      'Come back here: Settings → AI → My AI, paste the key, “Save connection” and “Test connection”.'] },
  { id: 'mistral', ime: 'Mistral', model: 'mistral-small-latest',
    kjeSl: 'console.mistral.ai → API keys', kjeEn: 'console.mistral.ai → API keys',
    url: 'https://console.mistral.ai/api-keys',
    korakiSl: [
      'Odpri console.mistral.ai in se prijavi.',
      'Nastavi plačilo v razdelku za obračun (brez tega klici ne stečejo).',
      'Odpri »API keys« in klikni »Create new key«.',
      'Poimenuj ključ in ga kopiraj. Pokaže se SAMO enkrat.',
      'Vrni se sem: Nastavitve → AI → Moj AI, prilepi ključ, »Shrani povezavo« in »Preveri povezavo«.'],
    korakiEn: [
      'Open console.mistral.ai and sign in.',
      'Set up billing (calls will not run without it).',
      'Open “API keys” and click “Create new key”.',
      'Name the key and copy it. It is shown ONLY once.',
      'Come back here: Settings → AI → My AI, paste the key, “Save connection” and “Test connection”.'] },
  { id: 'openai-compatible', ime: 'Drug ponudnik (OpenAI-združljiv)', model: '',
    kjeSl: 'pri svojem ponudniku', kjeEn: 'from your provider',
    url: '',
    korakiSl: ['To izberi, če tvoj ponudnik ponuja »OpenAI-združljiv« API (npr. Groq, Together, OpenRouter, lasten strežnik).',
               'V njegovih nastavitvah ustvari API ključ in ga kopiraj.',
               'Poišči še »Base URL« oziroma naslov API-ja — vpisati ga moraš v polje spodaj.',
               'Vpiši tudi ime modela; brez njega ponudnik ne ve, kaj naj požene.'],
    korakiEn: ['Choose this if your provider offers an “OpenAI-compatible” API (e.g. Groq, Together, OpenRouter, your own server).',
               'Create an API key in their settings and copy it.',
               'Find the “Base URL” — you must enter it in the field below.',
               'Enter the model name too; without it the provider does not know what to run.'] },
] as const;

export type AiPonudnik = (typeof AI_PONUDNIKI)[number];
