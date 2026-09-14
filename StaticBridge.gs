function doPost(e) {
  const result = submitStaticCandidate_(e);
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>top.postMessage({source:"masat-candidate-form",result:'+JSON.stringify(result).replace(/</g,'\u003c')+'},"*");<\/script>');
}

function submitStaticCandidate_(e) {
  try {
    const text = (e && e.parameter && e.parameter.payload) || '';
    const payload = JSON.parse(text);
    payload.version = readConfig_().version;
    return submitCandidate(payload);
  } catch (error) {
    console.error(String(error));
    return {ok:false,retryable:true,message:'تعذر قراءة بيانات الطلب. أعد المحاولة بعد قليل.'};
  }
}
