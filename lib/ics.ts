/* .ics (iCalendar) izvoz posameznega dogodka — za Apple Koledar / iPhone in vse
   druge koledarje, BREZ zunanjih storitev/OAuth. Uporabnik tapne preneseno .ics
   datoteko in dogodek se doda v njen koledar. Vse-dnevni dogodek (VALUE=DATE). */

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const ymd = (datum: string) => datum.replace(/-/g, '').slice(0, 8);

export function icsVsebina(naslov: string, datum: string, opis?: string): string {
  const d = ymd(datum);
  const uid = `${d}-${naslov.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'dogodek'}@pinart.flow`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pinart Flow//SL',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${d}T000000Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `SUMMARY:${esc(naslov)}`,
    opis ? `DESCRIPTION:${esc(opis)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function prenesiIcs(naslov: string, datum: string, opis?: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([icsVsebina(naslov, datum, opis)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${naslov.replace(/[^a-zA-Z0-9-]+/g, '-').slice(0, 40) || 'dogodek'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
