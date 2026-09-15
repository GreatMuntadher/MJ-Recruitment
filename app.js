'use strict';
let config,step=0,values={},groups={},busy=false,pending=null;
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const money=v=>v===''||v==null?'—':Number(v).toLocaleString('en-US')+' IQD';
const display=(f,v)=>f.key==='expected_salary'?money(v):v===true?'نعم':v===false?'لا':Array.isArray(v)?v.join('، '):v||'—';
function showMessage(text){$('message').textContent=text||'';}
function visible(f,item,chain=[]){if(!f.condition)return true;if(chain.includes(f.key))return false;const p=config.fields.find(x=>x.key===f.condition.key);return !!p&&visible(p,item,chain.concat(f.key))&&String((p.group?(item||{}):values)[p.key]??'')===f.condition.value;}
function field(f,target,path){
 const wrap=el('div',undefined,'field'+(['textarea','checkbox','section_title'].includes(f.type)?' wide':''));wrap.dataset.path=path;wrap.dataset.key=f.key;
 if(f.type==='section_title'){wrap.append(el('h3',f.label));return wrap;}
 const label=el('label',f.label+(f.required?' *':''));label.htmlFor=path;wrap.append(label);
 const update=v=>{target[f.key]=v;refreshVisibility();};let input;
 if(['radio','yes_no'].includes(f.type)){
  input=el('div',undefined,'choices');input.setAttribute('role','radiogroup');input.setAttribute('aria-label',f.label);
  f.options.forEach((v,i)=>{const l=el('label');const n=el('input');n.type='radio';n.name=path;n.id=path+'-'+i;n.value=v;n.checked=target[f.key]===v;n.onchange=()=>update(v);l.append(n,document.createTextNode(v));input.append(l);});
 }else{
  input=el(f.type==='textarea'?'textarea':['select','multi_select'].includes(f.type)?'select':'input');input.id=path;input.name=path;
  if(['select','multi_select'].includes(f.type)){if(f.type==='multi_select')input.multiple=true;else{const o=el('option','اختر…');o.value='';input.append(o);}f.options.forEach(v=>{const o=el('option',v);o.value=v;if(f.type==='multi_select')o.selected=(target[f.key]||[]).includes(v);input.append(o);});}
  else if(f.type!=='textarea')input.type=({phone:'tel',checkbox:'checkbox',date:'date',number:'number',email:'email'})[f.type]||'text';
  if(f.type==='checkbox')input.checked=target[f.key]===true;else if(f.type!=='multi_select')input.value=target[f.key]??'';
  if(f.type==='number')input.step=f.key==='expected_salary'?'1000':'any';if(f.key==='expected_salary'){input.min='1';input.placeholder=f.placeholder||'750000';input.inputMode='numeric';}else input.placeholder=f.placeholder;input.oninput=()=>update(f.type==='checkbox'?input.checked:f.type==='multi_select'?Array.from(input.selectedOptions).map(o=>o.value):input.value);
 }
 input.setAttribute('aria-required',String(f.required));input.setAttribute('aria-describedby',path+'-error');if(f.key==='expected_salary'){const moneyWrap=el('div',undefined,'money-input');moneyWrap.append(input,el('span','IQD','money-suffix'));wrap.append(moneyWrap);}else wrap.append(input);if(f.help)wrap.append(el('div',f.help,'help'));const err=el('div','','error');err.id=path+'-error';wrap.append(err);return wrap;
}
function refreshVisibility(){document.querySelectorAll('.field').forEach(w=>{const f=config.fields.find(x=>x.key===w.dataset.key);const bits=w.dataset.path.split('.');const item=f.group?groups[f.group][Number(bits[1])]:null;w.hidden=!visible(f,item);});}
function render(){
 const review=step===config.sections.length;const section=config.sections[step];$('title').textContent=review?'مراجعة وإرسال':section;$('progress').textContent='الخطوة '+(step+1)+' من '+(config.sections.length+1);$('bar').max=config.sections.length+1;$('bar').value=step+1;$('back').hidden=step===0;$('next').textContent=review?'إرسال البيانات':'التالي';$('fields').replaceChildren();showMessage('');
 if(review){renderReview();}else{
  const rendered=new Set();config.fields.filter(f=>f.section===section).forEach(f=>{
   if(!f.group){$('fields').append(field(f,values,f.key));return;}if(rendered.has(f.group))return;rendered.add(f.group);
   const g=f.group;const items=groups[g]||[];
   if(!items.length)$('fields').append(el('p','لا توجد خبرات مضافة. يمكنك المتابعة أو إضافة خبرة.','wide'));
   items.forEach((item,i)=>{const box=el('div',undefined,'experience');box.append(el('h3','الخبرة '+(i+1),'wide'));config.fields.filter(x=>x.group===g).forEach(x=>box.append(field(x,item,g+'.'+i+'.'+x.key)));const del=el('button','حذف هذه الخبرة','secondary wide');del.type='button';del.onclick=()=>{items.splice(i,1);render();};box.append(del);$('fields').append(box);});
   const add=el('button','+ إضافة خبرة أخرى','secondary wide');add.type='button';add.disabled=items.length>=config.repeatableGroups[g].max;add.onclick=()=>{items.push({});groups[g]=items;render();};$('fields').append(add);
  });refreshVisibility();
 }$('title').focus();
}
function renderReview(){config.sections.forEach((s,i)=>{const box=el('div',undefined,'review-section');box.append(el('h3',s));const edit=el('button','تعديل','secondary');edit.type='button';edit.onclick=()=>{if(pending){showMessage('يرجى إعادة الإرسال أولاً لتأكيد نتيجة المحاولة السابقة.');return;}step=i;render();};box.append(edit);const row=(f,v,prefix)=>{const r=el('div',undefined,'review-row');r.append(el('span',(prefix||'')+f.label),el('b',display(f,v)));box.append(r);};config.fields.filter(f=>f.section===s&&f.type!=='section_title').forEach(f=>{if(f.group)(groups[f.group]||[]).forEach((item,j)=>{if(visible(f,item))row(f,item[f.key],'الخبرة '+(j+1)+' · ');});else if(visible(f))row(f,values[f.key]);});$('fields').append(box);});}
function clientError(f,v){const empty=v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length);if(f.required&&(empty||(f.type==='checkbox'&&v!==true)||(typeof v==='string'&&!v.trim())))return 'هذا الحقل مطلوب';if(empty)return '';if(typeof v==='string'&&(v.length>5000||/[<>]/.test(v)))return 'قيمة غير صالحة';if(f.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))return 'أدخل بريدًا إلكترونيًا صحيحًا';if(f.type==='phone'&&!/^\+?[0-9][0-9 ()-]{6,19}$/.test(v))return 'أدخل رقم هاتف صحيحًا';if(f.key==='expected_salary'&&!/^[1-9]\d*$/.test(String(v)))return 'أدخل الراتب رقمًا موجبًا فقط';if(f.type==='number'&&!/^-?\d+(\.\d+)?$/.test(v))return 'أدخل رقمًا صحيحًا';if(f.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))return 'أدخل تاريخًا صحيحًا';return '';}
function checkStep(){let ok=true;document.querySelectorAll('.field:not([hidden])').forEach(w=>{const f=config.fields.find(x=>x.key===w.dataset.key);if(f.type==='section_title')return;const bits=w.dataset.path.split('.');const source=f.group?groups[f.group][Number(bits[1])]:values;let err=clientError(f,source[f.key]);if(f.key==='experience_end_date'&&source.experience_start_date&&source[f.key]<source.experience_start_date)err='تاريخ الانتهاء يسبق المباشرة';$(w.dataset.path+'-error').textContent=err;if(err)ok=false;});if(!ok){showMessage('يرجى إكمال الحقول الموضّحة قبل المتابعة.');document.querySelector('.error:not(:empty)')?.parentElement.querySelector('input,select,textarea')?.focus();}return ok;}
function requestPayload(){const clean={};const gs={};config.fields.filter(f=>!f.group&&f.type!=='section_title'&&visible(f)).forEach(f=>{if(values[f.key]!==undefined)clean[f.key]=values[f.key];});Object.keys(config.repeatableGroups).forEach(g=>gs[g]=(groups[g]||[]).map(item=>{const out={};config.fields.filter(f=>f.group===g&&f.type!=='section_title'&&visible(f,item)).forEach(f=>{if(item[f.key]!==undefined)out[f.key]=item[f.key];});return out;}));return {token:crypto.randomUUID(),version:config.version,values:clean,groups:gs};}
function setBusy(v){busy=v;document.querySelectorAll('button, #form input, #form select, #form textarea').forEach(b=>b.disabled=v);$('form').setAttribute('aria-busy',String(v));$('next').textContent=v?'جاري إرسال طلبك...':'إرسال البيانات';}
function renderSuccess(candidateId){
 const box=el('section',undefined,'success');box.tabIndex=-1;box.setAttribute('role','status');box.setAttribute('aria-live','polite');
 const mark=el('div',undefined,'success-mark');mark.setAttribute('aria-hidden','true');mark.innerHTML='<svg viewBox="0 0 64 64" focusable="false"><circle class="success-ring" cx="32" cy="32" r="27"></circle><path class="success-check" d="M19 33.5l8.2 8L45.5 23"></path></svg>';
 const title=el('h2','تم استلام بياناتك بنجاح','success-title');
 const message=el('p','شكرًا لاهتمامك بالانضمام إلى فريق ماسة الجود.\nنتمنى لك التوفيق دائمًا، ويسعدنا ويشرفنا اهتمامك بالانضمام إلينا.','success-message');
 const label=el('div','رقم الطلب','success-label');const id=el('strong',candidateId,'success-id');const note=el('p','يرجى الاحتفاظ برقم الطلب للرجوع إليه عند الحاجة.','success-note');
 box.append(mark,title,message,label,id,note);document.querySelector('.card').replaceChildren(box);document.title='تم استلام طلبك | ماسة الجود';requestAnimationFrame(()=>box.focus());
}
function responseContract(result){
 if(result&&result.ok===true&&/^MJ-C-\d{6}$/.test(String(result.candidateId||'')))return {ok:true,candidateId:String(result.candidateId),status:String(result.status||'accepted')};
 return {ok:false,error:String(result&&(result.error||result.message)||'تعذر الإرسال. أعد المحاولة بعد قليل.'),retryable:!!(result&&result.retryable)};
}
const AppsScriptProvider={
 submit(payload){return new Promise(resolve=>{
 const endpoint=window.BACKEND_CONFIG&&window.BACKEND_CONFIG.providers&&window.BACKEND_CONFIG.providers.apps_script&&window.BACKEND_CONFIG.providers.apps_script.endpoint;
 if(!endpoint){resolve({ok:false,error:'إعداد الاتصال غير مكتمل.',retryable:false});return;}
 const frameName='masat-submit-'+Date.now();
 const iframe=document.createElement('iframe');
 const form=document.createElement('form');
 const input=document.createElement('textarea');
 let done=false;
 const cleanup=()=>{window.removeEventListener('message',receive);form.remove();iframe.remove();};
 const finish=result=>{if(done)return;done=true;cleanup();resolve(responseContract(result));};
 function receive(event){
  if(!event.data||event.data.source!=='masat-candidate-form')return;
  finish(event.data.result);
 }
 window.addEventListener('message',receive);
 iframe.name=frameName;iframe.hidden=true;
 form.method='post';form.action=endpoint;form.target=frameName;form.acceptCharset='UTF-8';form.hidden=true;
 input.name='payload';input.value=JSON.stringify(payload);
 form.append(input);document.body.append(iframe,form);form.submit();
 window.setTimeout(()=>finish({ok:false,error:'تأخر الاتصال بالخادم. أعد الإرسال من هذه الصفحة لتأكيد الطلب دون تكراره.',retryable:true}),45000);
 });}
};
const CloudflareProvider={
 async submit(payload){
  const endpoint=window.BACKEND_CONFIG.providers.cloudflare.endpoint;
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok)return {ok:false,error:result.error||'تعذر الإرسال.',retryable:result.retryable!==false};
  return result;
 }
};
const BackendProviders={apps_script:AppsScriptProvider,cloudflare:CloudflareProvider};
function submitCandidateRequest(payload){
 const mode=window.BACKEND_CONFIG&&window.BACKEND_CONFIG.mode;
 const provider=BackendProviders[mode];
 if(!provider)return Promise.resolve({ok:false,error:'مزود الإرسال غير مفعّل.',retryable:false});
 return provider.submit(payload).then(responseContract).catch(()=>({ok:false,error:'تعذر الإرسال. أعد المحاولة بعد قليل.',retryable:true}));
}
async function send(){
 if(busy)return;
 pending=pending||requestPayload();
 setBusy(true);
 const result=await submitCandidateRequest(pending);
 setBusy(false);
 if(result.ok){renderSuccess(result.candidateId);values={};groups={};pending=null;return;}
 showMessage(result.error);
 // Keep the token for every retry, including rejected requests.
}
$('back').onclick=()=>{if(pending){showMessage('يرجى إعادة الإرسال أولاً لتأكيد نتيجة المحاولة السابقة.');return;}step--;render();};$('form').onsubmit=e=>{e.preventDefault();if(!config||busy)return;if(step===config.sections.length)send();else if(checkStep()){step++;render();}};
$('next').disabled=true;
(function initStaticForm(){
 if(!window.FORM_CONFIG){showMessage('تعذر تحميل إعدادات النموذج. تأكد من وجود ملف config.js بجانب الصفحة.');return;}
 config=window.FORM_CONFIG;
 Object.keys(config.repeatableGroups).forEach(g=>groups[g]=[]);
 $('next').disabled=false;
 render();
}());

