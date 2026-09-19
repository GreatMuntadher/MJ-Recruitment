const SPREADSHEET_ID = '1ovMm_MitkhZdsmvZZEntKXNlpDxEl0GYZJDl5Uvrnek';
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'print') return renderCandidatePrint_(e.parameter.token);
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('ماسة الجود | استمارة بيانات مرشح').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function include_(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function book_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

