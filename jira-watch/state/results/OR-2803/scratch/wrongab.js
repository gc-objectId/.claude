const c = require('./client'); const T={'X-Tenant-Id':'mayo-mayo'};
const [label, pmrn, caseId, medId] = process.argv.slice(2);
(async()=>{
  await c.login('loopuser','LoopValidate1!'); await c.req('GET','/api/csrf',undefined,T);
  const r = await c.req('POST', `/api/cds/medication-selection/${pmrn}/${caseId}`,
    {medicationIdentifier: medId}, Object.assign({'X-XSRF-TOKEN':c.xsrf()},T));
  if(r.status!==200){console.log(label,medId,'status',r.status,r.body.slice(0,400));return;}
  const d = JSON.parse(r.body);
  require('fs').writeFileSync(`medsel-${label}-${medId}.json`, JSON.stringify(d,null,1));
  const res = (d.results||[]).find(x=>x.ruleId==='a-known-procedure-wrong-antibiotic');
  console.log(`### ${label} case=${caseId} med=${medId}`);
  if (!res) { console.log('   a-known-procedure-wrong-antibiotic: ABSENT from results'); }
  else {
    const alts = (res.details?.ALTERNATIVE_ANTIBIOTIC_CANDIDATES||[]).map(o=>(o.medicationCandidates||[]).map(m=>m.medicationCategory).join('+'));
    console.log('   fired=', res.fired ?? res.result ?? '(see json)', ' prompt=', JSON.stringify(res.prompt||res.promptText||res.details?.PROMPT||'').slice(0,300));
    console.log('   ALTERNATIVES=', JSON.stringify(alts));
    console.log('   allKeys=', Object.keys(res).join(','));
  }
})();
