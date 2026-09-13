// Run from the Apps Script editor only.
// Uses clearly labelled QA submissions; retains them with Status = اختبار تقني.
function runAcceptanceTests() {
  const report=[];const c=readConfig_();
  const check=(name,fn)=>{try{if(fn()===false)throw Error('Assertion failed');report.push({name,status:'PASS'});}catch(e){report.push({name,status:'FAIL',error:String(e)});}};
  const sample=f=>f.type==='checkbox'?true:f.type==='date'?'2026-01-01':f.type==='number'?'100':f.type==='email'?'qa@example.com':f.type==='phone'?'07700000000':f.options.length?f.options[f.options.length-1]:'اختبار تقني - ليس مرشحاً';
  const make=n=>{const p={token:Utilities.getUuid(),version:c.version,values:{},groups:{experience:[]}};c.fields.filter(f=>!f.group&&f.type!=='section_title').forEach(f=>p.values[f.key]=sample(f));p.values.currently_employed='لا';p.values.knows_masat_employee='لا';for(let i=0;i<n;i++){const item={};c.fields.filter(f=>f.group&&f.type!=='section_title').forEach(f=>item[f.key]=sample(f));p.groups.experience.push(item);}return p;};
  check('Required fields',()=>c.fields.filter(f=>f.required&&!f.group&&!f.condition).every(f=>{const p=make(0);delete p.values[f.key];return !!validate_(c,p).errors[f.key];}));
  check('Conditional logic',()=>{const p=make(0);c.fields.filter(f=>f.condition).forEach(f=>delete p.values[f.key]);if(!validate_(c,p).ok)return false;p.values.currently_employed='نعم';return !!validate_(c,p).errors.current_employer;});
  check('Invalid phone email date number select',()=>[['primary_phone','x'],['email','bad'],['birth_date','2026-02-30'],['graduation_year','NaN'],['excel_level','unknown']].every(([k,v])=>{const p=make(0);p.values[k]=v;return !!validate_(c,p).errors[k];}));
  check('Reject six experiences',()=>!validate_(c,make(6)).ok);
  check('Partial experience',()=>{const p=make(1);delete p.groups.experience[0].experience_company;return !validate_(c,p).ok;});
  const ids=[];
  [0,1,5].forEach(n=>check('Live save '+n+' experiences and double submit',()=>{
    const p=make(n),a=submitCandidate(p),b=submitCandidate(p);
    if(!a.ok||!b.ok||a.candidateId!==b.candidateId||!b.duplicate)throw Error(JSON.stringify({a,b}));
    ids.push(a.candidateId);
    const t=table_('Candidates'),matches=t.sheet.getRange(2,1,t.sheet.getLastRow()-1,1).createTextFinder(a.candidateId).matchEntireCell(true).findAll();
    if(matches.length!==1)return false;
    t.sheet.getRange(matches[0].getRow(),t.headers.indexOf('Status')+1).setValue('اختبار تقني');
    const exp=table_('Candidate_Experiences');
    const count=exp.sheet.getLastRow()>1?exp.sheet.getRange(2,2,exp.sheet.getLastRow()-1,1).createTextFinder(a.candidateId).matchEntireCell(true).findAll().length:0;
    return count===n;
  }));
  const s=book_().getSheetByName('Form_Config');const data=s.getDataRange().getDisplayValues();const row=data.findIndex(r=>r[7]==='other_technical_skills')+1;const original=s.getRange(row,1,1,15).getValues();
  try {
    check('Live disable question',()=>{s.getRange(row,6).setValue('لا');SpreadsheetApp.flush();return !readConfig_().fields.some(f=>f.key==='other_technical_skills');});
    s.getRange(row,6).setValue('نعم');
    check('Live reorder question',()=>{s.getRange(row,7).setValue(1);SpreadsheetApp.flush();return readConfig_().fields[0].key==='other_technical_skills';});
    check('Live optional to required',()=>{s.getRange(row,3).setValue('إجباري');SpreadsheetApp.flush();const p=make(0);delete p.values.other_technical_skills;return !!validate_(readConfig_(),p).errors.other_technical_skills;});
  } finally {s.getRange(row,1,1,15).setValues(original);SpreadsheetApp.flush();}
  const newRow=s.getLastRow()+1;
  try {
    check('Live new question without HTML change',()=>{s.getRange(newRow,1,1,15).setValues([['سؤال اختبار مؤقت','text','اختياري','المهارات','','نعم',575,'qa_new_question','','','','','','لا','']]);SpreadsheetApp.flush();const fresh=readConfig_(),p=make(0);p.values.qa_new_question='إجابة اختبار';return fresh.fields.some(f=>f.key==='qa_new_question')&&validate_(fresh,p).values.qa_new_question==='إجابة اختبار';});
  } finally {s.getRange(newRow,1,1,15).clearContent();SpreadsheetApp.flush();}
  check('Config restored and version preserved',()=>readConfig_().version===c.version);
  const result={report,qaCandidateIds:ids,passed:report.filter(r=>r.status==='PASS').length,total:report.length};
  console.log(JSON.stringify(result));return result;
}
