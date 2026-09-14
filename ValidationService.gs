function visible_(field, values, item, fields, chain) {
  if (!field.active) return false;
  if (!field.condition) return true;
  chain=chain||[];
  if(chain.includes(field.key)) return false;
  const parent=fields.find(f=>f.key===field.condition.key);
  if(!parent || !visible_(parent,values,item,fields,chain.concat(field.key))) return false;
  const v=parent.group ? (item||{})[parent.key] : values[parent.key];
  return String(v==null?'':v)===field.condition.value;
}
function valueError_(f,v) {
  const empty=v===undefined || v===null || v==='' || (Array.isArray(v)&&!v.length);
  if(f.required && (empty || (f.type==='checkbox' && v!==true))) return 'هذا الحقل مطلوب';
  if(empty) return '';
  if(f.type==='checkbox') return typeof v==='boolean'?'':'قيمة غير صالحة';
  if(f.type==='multi_select') return Array.isArray(v)&&v.every(x=>typeof x==='string'&&f.options.includes(x))&&new Set(v).size===v.length?'':'اختر من القائمة';
  if(typeof v!=='string' || v.length>5000 || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) return 'قيمة غير صالحة';
  if(f.required&&!v.trim()) return 'هذا الحقل مطلوب';
  if(['select','radio','yes_no'].includes(f.type) && !f.options.includes(v)) return 'اختر من القائمة';
  if(f.key==='expected_salary' && !/^[1-9]\d*$/.test(v)) return 'أدخل الراتب رقمًا موجبًا فقط';
  if(f.type==='number' && (!/^-?\d+(\.\d+)?$/.test(v) || !Number.isFinite(Number(v)))) return 'أدخل رقمًا صحيحًا';
  if(f.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'أدخل بريدًا إلكترونيًا صحيحًا';
  if(f.type==='phone' && !/^\+?[0-9][0-9 ()-]{6,19}$/.test(v)) return 'أدخل رقم هاتف صحيحًا';
  if(f.type==='date' && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0,10)!==v)) return 'أدخل تاريخًا صحيحًا';
  return '';
}
function validate_(config,payload) {
  const errors={}; const clean={};const groups={};
  const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
  if(!plain(payload)||!plain(payload.values)||!plain(payload.groups)) return {ok:false,errors:{form:'بيانات الطلب غير صالحة'}};
  const values=payload.values;
  if(Object.keys(payload).some(k=>!['token','version','values','groups'].includes(k))) errors.form='بيانات إضافية غير معروفة';
  Object.keys(values).forEach(k=>{if(!config.fields.some(f=>f.key===k&&!f.group&&f.type!=='section_title')) errors[k]='حقل غير معروف أو معطّل';});
  Object.keys(payload.groups).forEach(k=>{if(!config.repeatableGroups[k]) errors[k]='مجموعة غير معروفة';});
  const check=(f,source,target,path,item)=>{
    if(f.type==='section_title'||!visible_(f,values,item,config.fields)) return;
    const v=typeof source[f.key]==='string'?source[f.key].trim():source[f.key];
    const err=valueError_(f,v);if(err)errors[path]=err;
    else if(v!==undefined&&v!==null)target[f.key]=f.key==='expected_salary'?Number(v):v;
  };
  config.fields.filter(f=>!f.group).forEach(f=>check(f,values,clean,f.key));
  Object.keys(config.repeatableGroups).forEach(g=>{
    const items=payload.groups[g]||[];groups[g]=[];
    if(!Array.isArray(items)||items.length>config.repeatableGroups[g].max){errors[g]='الحد الأقصى خمس خبرات';return;}
    const fields=config.fields.filter(f=>f.group===g);
    items.forEach((item,i)=>{
      if(!plain(item)){errors[g+'.'+i]='خبرة غير صالحة';return;}
      Object.keys(item).forEach(k=>{if(!fields.some(f=>f.key===k))errors[g+'.'+i+'.'+k]='حقل غير معروف';});
      const result={};fields.forEach(f=>check(f,item,result,g+'.'+i+'.'+f.key,item));
      if(result.experience_start_date&&result.experience_end_date&&result.experience_end_date<result.experience_start_date)errors[g+'.'+i+'.experience_end_date']='تاريخ الانتهاء يسبق المباشرة';
      groups[g].push(result);
    });
  });
  return {ok:!Object.keys(errors).length,errors,values:clean,groups};
}
