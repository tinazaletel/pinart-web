import { NextRequest, NextResponse } from 'next/server';

/* Strežniški render ponudbe v PRAVI PDF (vektorski, oster) — prenese se kot
   datoteka (ne tisk). Lokalno uporabi nameščeni Chrome, na Vercelu @sparticuz/chromium. */

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const lokalniChrome = (): string => {
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'win32') return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  return '/usr/bin/google-chrome';
};

export async function POST(req: NextRequest) {
  let browser: import('puppeteer-core').Browser | undefined;
  try {
    const { html, coverHtml, ime, footer, margin, bg, cssPages, hideFirstFooter } = (await req.json()) as { html?: string; coverHtml?: string; ime?: string; footer?: string; margin?: { top?: string; right?: string; bottom?: string; left?: string }; bg?: string; cssPages?: boolean; hideFirstFooter?: boolean };
    if (!html || typeof html !== 'string' || html.length > 16_000_000) {
      return NextResponse.json({ error: 'Neveljaven html' }, { status: 400 });
    }
    if (coverHtml && (typeof coverHtml !== 'string' || coverHtml.length > 16_000_000)) {
      return NextResponse.json({ error: 'Neveljaven coverHtml' }, { status: 400 });
    }
    const footerLevo = typeof footer === 'string' ? footer.slice(0, 300) : '';
    /* barva ozadja noge (da spodnji rob ni bel) — validiran hex; sicer prosojno */
    const nogaBg = (typeof bg === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(bg)) ? bg : 'transparent';
    /* privzeti robovi; klic lahko poda svoje (npr. full-bleed naslovnica = 0 zgoraj/ob strani) */
    const varenRob = (v: unknown, priv: string) => (typeof v === 'string' && /^\d{1,3}(\.\d)?mm$/.test(v) ? v : priv);
    const robovi = {
      top: varenRob(margin?.top, '20mm'),
      right: varenRob(margin?.right, '16mm'),
      bottom: varenRob(margin?.bottom, '18mm'),
      left: varenRob(margin?.left, '16mm'),
    };

    const puppeteer = await import('puppeteer-core');
    const naServerju = process.env.NODE_ENV === 'production' || !!process.env.VERCEL || !!process.env.AWS_REGION;
    if (naServerju) {
      const chromium = (await import('@sparticuz/chromium')).default;
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      browser = await puppeteer.launch({
        executablePath: lokalniChrome(),
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const footerTemplate = `<div style="width:100%;height:100%;font-size:6pt;color:#9a9088;font-family:Arial,Helvetica,sans-serif;padding:0 15mm 2mm;box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-end;background:${nogaBg};-webkit-print-color-adjust:exact;print-color-adjust:exact;"><span>${footerLevo}</span><span>Stran <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
    /* izris enega HTML v PDF; noga = ali naj se izrise osteviljcena noga (samo telo) */
    const izrisi = async (vsebina: string, noga: boolean): Promise<Uint8Array> => {
      const page = await browser!.newPage();
      await page.setContent(vsebina, { waitUntil: 'networkidle0', timeout: 30_000 });
      /* pocakamo, da se spletni font (Bodoni Moda) nalozi */
      try { await page.evaluate(() => (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready); } catch { /* ignore */ }
      const buf = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: noga,
        ...(noga ? { headerTemplate: '<div></div>', footerTemplate } : {}),
        /* naslovnica = full-bleed brez robov; telo = klicni robovi (ali @page CSS) */
        ...(noga ? (cssPages ? { preferCSSPageSize: true } : { margin: robovi }) : { margin: { top: '0', right: '0', bottom: '0', left: '0' } }),
      });
      await page.close();
      return new Uint8Array(buf);
    };

    let izhod: Uint8Array;
    if (coverHtml) {
      /* LOCEN render: naslovnica BREZ noge (mreza/ozadje do roba) + telo Z nogo, nato zdruzi.
         Tako naslovnica nima Puppeteer noge in ni bele crte/pravokotnika cez mrezo. */
      const [coverPdf, bodyPdf] = await Promise.all([izrisi(coverHtml, false), izrisi(html, true)]);
      await browser.close();
      browser = undefined;
      const { PDFDocument, rgb } = await import('pdf-lib');
      const skupaj = await PDFDocument.create();
      const coverDoc = await PDFDocument.load(coverPdf);
      const bodyDoc = await PDFDocument.load(bodyPdf);
      /* Puppeteerjeva robna pasova (zgoraj margin.top, spodaj pod nogo) printBackground NE obarva
         → ostaneta bela. Prebarvamo ju v barvo ozadja z bez pravokotniki cez CEL zgornji rob in
         cez spodnji ~7mm (bela crtica pod nogo) VSAKE strani telesa. Besedilo noge je pri ~11mm,
         besedilo telesa pod zgornjim robom — zato pravokotnika ne prekrijeta vsebine. */
      if (nogaBg !== 'transparent') {
        const h = nogaBg.slice(1);
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
        const r = parseInt(full.slice(0, 2), 16) / 255, g = parseInt(full.slice(2, 4), 16) / 255, b = parseInt(full.slice(4, 6), 16) / 255;
        const barva = rgb(r, g, b);
        const topPt = (parseFloat(robovi.top) || 0) / 25.4 * 72;
        const botPt = 5 / 25.4 * 72; /* ~5mm — pokrije belo crtico pod nogo, ostane pod besedilom noge */
        for (const p of bodyDoc.getPages()) {
          const { width, height } = p.getSize();
          if (topPt > 0) p.drawRectangle({ x: 0, y: height - topPt, width, height: topPt, color: barva });
          p.drawRectangle({ x: 0, y: 0, width, height: botPt, color: barva });
        }
      }
      for (const del of [coverDoc, bodyDoc]) {
        const strani = await skupaj.copyPages(del, del.getPageIndices());
        strani.forEach(s => skupaj.addPage(s));
      }
      izhod = await skupaj.save();
    } else {
      /* en dokument (npr. racun) — z nogo */
      izhod = await izrisi(html, true);
      await browser.close();
      browser = undefined;
      /* zdruzljivo s starim klicem: pokrij Puppeteer nogo 1. strani z bez pravokotnikom */
      if (hideFirstFooter && nogaBg !== 'transparent') {
        try {
          const { PDFDocument, rgb } = await import('pdf-lib');
          const doc = await PDFDocument.load(izhod);
          const p0 = doc.getPage(0);
          const { width } = p0.getSize();
          const h = nogaBg.slice(1);
          const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
          const r = parseInt(full.slice(0, 2), 16) / 255, g = parseInt(full.slice(2, 4), 16) / 255, b = parseInt(full.slice(4, 6), 16) / 255;
          p0.drawRectangle({ x: 0, y: 0, width, height: 48, color: rgb(r, g, b) });
          izhod = await doc.save();
        } catch { /* ce ne uspe, vrni original */ }
      }
    }

    const varnoIme = (ime || 'ponudba').replace(/[^\w\-. ]+/g, '').trim() || 'ponudba';
    return new NextResponse(izhod as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${varnoIme}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    try { await browser?.close(); } catch { /* ignore */ }
    return NextResponse.json({ error: 'PDF ni uspel', detajl: String(e) }, { status: 500 });
  }
}
