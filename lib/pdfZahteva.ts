/* ZAHTEVEK ZA PDF — z rokom.
   ==========================
   Brez roka je `fetch` na /api/ponudba-pdf lahko visel v nedogled: lokalno se
   Chromium ne naloži vedno, zahtevek pa ostane odprt. Posledice, ki jih je
   Tina videla 23. 8. 2026:
     - predogled pogodbe je za vedno obtičal na »Pripravljam predogled …«,
       čeprav je HTML predogled tik pod njim deloval;
     - viseči zahtevki so ostajali odprti in upočasnili ves dev strežnik.

   Rok je zato obvezen. Ko poteče, klicatelj dobi napako in lahko pokaže
   nadomestni HTML predogled — ta je vedno na voljo, ker nastane v brskalniku. */

export const PDF_ROK_MS = 15_000;

export async function pdfZahteva(telo: unknown, rokMs = PDF_ROK_MS): Promise<Response> {
  const prekini = new AbortController();
  const ura = setTimeout(() => prekini.abort(), rokMs);
  try {
    return await fetch('/api/ponudba-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telo),
      signal: prekini.signal,
    });
  } finally {
    clearTimeout(ura);
  }
}
