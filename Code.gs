const SPREADSHEET_ID = '1ovMm_MitkhZdsmvZZEntKXNlpDxEl0GYZJDl5Uvrnek';
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'hr') return renderHRDashboard_();
  if (e && e.parameter && e.parameter.action === 'print') return renderCandidatePrint_(e.parameter.token);
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('ماسة الجود | استمارة بيانات مرشح').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function include_(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function book_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function hash_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(b => ('0'+((b+256)%256).toString(16)).slice(-2)).join(''); }
function canonical_(x) {
  if (Array.isArray(x)) return '['+x.map(canonical_).join(',')+']';
  if (x && typeof x === 'object') return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical_(x[k])).join(',')+'}';
  return JSON.stringify(x);
}
function log_(level, message, id) {
  try { book_().getSheetByName('System_Log').appendRow([new Date(), 'submitCandidate', level, message, id || '']); }
  catch (e) { console.error('System_Log unavailable'); }
}
