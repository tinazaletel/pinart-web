import QRCode from 'qrcode';

/** FURS zahteva QR različice 2 (25 × 25), raven M in prazni rob štirih modulov. */
export function fursQrSvg(vsebina: string): string {
  if (!/^\d{60}$/.test(vsebina)) throw new Error('FURS QR vsebina mora imeti 60 številk.');
  const qr = QRCode.create(vsebina, { version: 2, errorCorrectionLevel: 'M' });
  if (qr.modules.size !== 25) throw new Error('FURS QR nima predpisanih 25 × 25 modulov.');
  const rob = 4;
  const velikost = qr.modules.size + rob * 2;
  const polja: string[] = [];
  for (let y = 0; y < qr.modules.size; y += 1) {
    for (let x = 0; x < qr.modules.size; x += 1) {
      if (qr.modules.get(x, y)) polja.push(`M${x + rob} ${y + rob}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${velikost} ${velikost}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${polja.join('')}" fill="#000"/></svg>`;
}

export function fursQrDataUrl(vsebina: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fursQrSvg(vsebina))}`;
}
