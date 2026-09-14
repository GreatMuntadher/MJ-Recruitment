const EXPERIENCE_COLUMNS={experience_company:'Company',experience_job_title:'Job_Title',experience_tasks:'Tasks',experience_start_date:'Start_Date',experience_end_date:'End_Date',experience_leave_reason:'Leave_Reason',experience_last_salary:'Last_Salary',experience_reference:'Reference_Contact',experience_may_contact:'May_Contact_Reference'};
function table_(name) {
  const sheet=book_().getSheetByName(name);
  if(!sheet)throw Error('Missing table');
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
  if(headers.some(h=>!h)||new Set(headers).size!==headers.length)throw Error('Invalid table headers');
  return {sheet,headers};
}
function cell_(v) { return {userEnteredValue:typeof v==='boolean'?{boolValue:v}:typeof v==='number'?{numberValue:v}:{stringValue:Array.isArray(v)?JSON.stringify(v):String(v==null?'':v)}}; }
function appendRequest_(table,rows) {
  return {appendCells:{sheetId:table.sheet.getSheetId(),rows:rows.map(row=>({values:table.headers.map(h=>cell_(row[h]))})),fields:'userEnteredValue'}};
}
function expandHeaders_(table,keys,requests) {
  const added=[...new Set(keys)].filter(k=>!table.headers.includes(k));
  if(!added.length)return;
  const start=table.headers.length;
  if(start+added.length>table.sheet.getMaxColumns())requests.push({appendDimension:{sheetId:table.sheet.getSheetId(),dimension:'COLUMNS',length:start+added.length-table.sheet.getMaxColumns()}});
  requests.push({updateCells:{start:{sheetId:table.sheet.getSheetId(),rowIndex:0,columnIndex:start},rows:[{values:added.map(cell_)}],fields:'userEnteredValue'}});
  table.headers=table.headers.concat(added);
}
function nextId_(table) {
  const p=PropertiesService.getScriptProperties();
  let n=Number(p.getProperty('candidate_sequence')||0);
  if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid sequence');
  if(table.sheet.getLastRow()>1) table.sheet.getRange(2,table.headers.indexOf('Candidate_ID')+1,table.sheet.getLastRow()-1,1).getDisplayValues().forEach(r=>{const m=/^MJ-C-(\d+)$/.exec(r[0]);if(m)n=Math.max(n,Number(m[1]));});
  n++;p.setProperty('candidate_sequence',String(n));
  return 'MJ-C-'+String(n).padStart(6,'0');
}
function findSubmission_(table,token,hash) {
  const col=table.headers.indexOf('Submission_Token');
  if(col<0||table.sheet.getLastRow()<2)return null;
  const found=table.sheet.getRange(2,col+1,table.sheet.getLastRow()-1,1).createTextFinder(token).matchEntireCell(true).useRegularExpression(false).findNext();
  if(!found)return null;
  // Read the ID through the same Sheets API used for the atomic write. A
  // SpreadsheetApp range can remain stale for a few moments after batchUpdate.
  const values=Sheets.Spreadsheets.Values.get(SPREADSHEET_ID,"'Candidates'!A"+found.getRow()+':A'+found.getRow()).values||[];
  const candidateId=values[0]&&String(values[0][0]||'');
  if(!/^MJ-C-\d{6}$/.test(candidateId))throw Error('Idempotency record is incomplete');
  // The token is the idempotency key. Once committed, any retry carrying it
  // must resolve to the original candidate even if a client re-serializes a
  // value differently after a lost response. The stored hash remains an audit
  // signal, but must never cause a second record or hide a successful commit.
  return {ok:true,candidateId:candidateId,duplicate:true};
}
function submitCandidate(payload) {
  let lock;let id='';
  try {
    if(!payload||typeof payload.token!=='string'||!/^[a-f0-9-]{36}$/.test(payload.token)||JSON.stringify(payload).length>100000)return {ok:false,message:'بيانات الطلب غير صالحة'};
    lock=LockService.getScriptLock();
    if(!lock.tryLock(25000))return {ok:false,retryable:true,message:'النظام مشغول. أعد المحاولة بعد قليل.'};
    const candidates=table_('Candidates');
    const hash=hash_(canonical_({version:payload.version,values:payload.values,groups:payload.groups}));
    const previous=findSubmission_(candidates,payload.token,hash);if(previous)return previous;
    const config=readConfig_();
    if(payload.version!==config.version)return {ok:false,code:'CONFIG_CHANGED',message:'تم تحديث النموذج. أعد تحميل الصفحة وراجع الحقول الجديدة.'};
    const valid=validate_(config,payload);
    if(!valid.ok)return {ok:false,errors:valid.errors,message:'يرجى مراجعة الحقول المطلوبة أو غير الصحيحة.'};
    const experiences=table_('Candidate_Experiences');const logs=table_('System_Log');const requests=[];
    expandHeaders_(candidates,config.fields.filter(f=>!f.group&&f.type!=='section_title').map(f=>f.key).concat(['Submission_Token','Submission_Hash']),requests);
    expandHeaders_(experiences,config.fields.filter(f=>f.group&&f.type!=='section_title').map(f=>EXPERIENCE_COLUMNS[f.key]||f.key),requests);
    id=nextId_(candidates);const now=new Date();const tz='Asia/Baghdad';
    const row=Object.assign({},valid.values,{Candidate_ID:id,Submission_Timestamp:Utilities.formatDate(now,tz,"yyyy-MM-dd'T'HH:mm:ssXXX"),Submission_Date:Utilities.formatDate(now,tz,'yyyy-MM-dd'),Submission_Time:Utilities.formatDate(now,tz,'HH:mm:ss'),Form_Version:config.version,Status:'جديد',Submission_Token:payload.token,Submission_Hash:hash});
    requests.push(appendRequest_(candidates,[row]));
    const exp=(valid.groups.experience||[]).map((item,i)=>{
      const r={Experience_ID:id+'-E'+String(i+1).padStart(2,'0'),Candidate_ID:id,Experience_Order:i+1};
      Object.keys(item).forEach(k=>r[EXPERIENCE_COLUMNS[k]||k]=item[k]);return r;
    });
    if(exp.length)requests.push(appendRequest_(experiences,exp));
    requests.push(appendRequest_(logs,[{Timestamp:row.Submission_Timestamp,Function:'submitCandidate',Level:'INFO',Message:'SUBMITTED',Candidate_ID:id}]));
    // Sheets validates the complete batch before applying it: candidate, experiences,
    // idempotency record and log either commit together or do not commit.
    Sheets.Spreadsheets.batchUpdate({requests},SPREADSHEET_ID);
    return {ok:true,candidateId:id};
  } catch(e) { console.error(String(e));log_('ERROR','SUBMISSION_FAILED',id);return {ok:false,retryable:true,message:'تعذر تأكيد الحفظ. أعد المحاولة بنفس الصفحة؛ لن يتكرر طلبك.'}; }
  finally {if(lock&&lock.hasLock())lock.releaseLock();}
}
