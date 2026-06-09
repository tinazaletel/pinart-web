function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Povprasevanja') || spreadsheet.insertSheet('Povprasevanja');
  const safe = (value) => String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Datum', 'Vrsta', 'Ime', 'Podjetje', 'E-posta', 'Opis', 'Proracun', 'Rok', 'Jezik']);
  }

  sheet.appendRow([
    data.submittedAt,
    data.type,
    data.name,
    data.company || '',
    data.email,
    data.brief,
    data.budget || '',
    data.timing || '',
    data.locale || ''
  ]);

  MailApp.sendEmail({
    to: 'tina@pinart.si',
    subject: 'Novo Pinart povprasevanje: ' + data.type,
    htmlBody:
      '<b>' + safe(data.name) + '</b> (' + safe(data.email) + ')<br><br>' +
      safe(data.brief).replace(/\n/g, '<br>') +
      '<br><br><b>Proracun:</b> ' + safe(data.budget || '-') +
      '<br><b>Rok:</b> ' + safe(data.timing || '-')
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
