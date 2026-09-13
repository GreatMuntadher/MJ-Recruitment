function parseConfig_(rows) {
  const headers = rows[0];
  const needed = ['Field_Name_AR','Data_Type','Requirement','Section','Options','Active','Sort_Order','Field_Key','Conditional_Field','Conditional_Value','Repeatable_Group','Group_Max_Items'];
  needed.forEach(h => { if (!headers.includes(h)) throw Error('Missing config header: '+h); });
  const seen = new Set();
  const fields = rows.slice(1).filter(r=>r.some(v=>String(v).trim())).map((r,i)=>{
    const o = {}; headers.forEach((h,j)=>o[h]=String(r[j] == null ? '' : r[j]).trim());
    const key=o.Field_Key;
    if (!/^[a-z][a-z0-9_]*$/.test(key) || seen.has(key) || ['constructor','prototype','__proto__'].includes(key)) throw Error('Invalid/duplicate key: '+key);
    seen.add(key);
    const active=['نعم','yes','true','1'].includes(o.Active.toLowerCase());
    if (!['نعم','لا','yes','no','true','false','1','0'].includes(o.Active.toLowerCase())) throw Error('Invalid Active: '+key);
    const type=o.Data_Type;
    if (active && !['text','textarea','number','email','phone','date','select','radio','yes_no','checkbox','section_title','multi_select'].includes(type)) throw Error('Unsupported active type: '+type);
    if (!o.Section || !o.Sort_Order || !Number.isFinite(Number(o.Sort_Order))) throw Error('Invalid section/order: '+key);
    if (!['إجباري','اجباري','اختياري','required','optional'].includes(o.Requirement.toLowerCase())) throw Error('Invalid requirement: '+key);
    const options=o.Options.split('|').map(s=>s.trim()).filter(Boolean);
    if(active && ['select','radio','yes_no','multi_select'].includes(type) && !options.length) throw Error('Missing options: '+key);
    const max=Number(o.Group_Max_Items || 5);
    if(o.Repeatable_Group && (o.Repeatable_Group!=='experience' || !Number.isInteger(max) || max<1 || max>5)) throw Error('Invalid repeatable group: '+key);
    return {key,label:o.Field_Name_AR,type,required:['إجباري','اجباري','required'].includes(o.Requirement.toLowerCase()),section:o.Section,options,active,order:Number(o.Sort_Order),placeholder:o.Placeholder||'',help:o.Help_Text||'',condition:o.Conditional_Field?{key:o.Conditional_Field,value:o.Conditional_Value}:null,group:o.Repeatable_Group||'',max,index:i};
  });
  const byKey=Object.fromEntries(fields.map(f=>[f.key,f]));
  fields.forEach(f=>{
    const chain=new Set([f.key]); let p=f;
    while(p.condition) {
      const parent=byKey[p.condition.key];
      if(!parent || chain.has(parent.key) || (parent.group && parent.group!==f.group)) throw Error('Invalid condition: '+f.key);
      chain.add(parent.key);p=parent;
    }
  });
  fields.sort((a,b)=>a.order-b.order || a.index-b.index);
  const active=fields.filter(f=>f.active);
  const sections=[...new Set(active.map(f=>f.section))];
  const repeatableGroups={};
  active.filter(f=>f.group).forEach(f=>{
    if(repeatableGroups[f.group] && (repeatableGroups[f.group].max!==f.max || repeatableGroups[f.group].section!==f.section)) throw Error('Inconsistent group configuration');
    repeatableGroups[f.group]={max:f.max,section:f.section};
  });
  return {fields:active,sections,repeatableGroups};
}
function readConfig_() {
  const s=book_().getSheetByName('Form_Config');
  const rows=s.getRange(1,1,s.getLastRow(),s.getLastColumn()).getDisplayValues();
  const config=parseConfig_(rows);
  config.version='V1.1-'+hash_(canonical_(config)).slice(0,12);
  return config;
}
function getFormConfig() {
  try { return {ok:true,config:readConfig_()}; }
  catch(e) { log_('ERROR','CONFIG_INVALID'); return {ok:false,message:'تعذر تحميل النموذج. يرجى التواصل مع مسؤول التوظيف.'}; }
}
