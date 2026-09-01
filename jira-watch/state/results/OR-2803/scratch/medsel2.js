const c = require('./client'); const T={'X-Tenant-Id':'mayo-mayo'};
const [label, pmrn, caseId, medId] = process.argv.slice(2);
(async()=>{
  await c.login('loopuser','LoopValidate1!'); await c.req('GET','/api/csrf',undefined,T);
  const r = await c.req('POST', `/api/cds/medication-selection/${pmrn}/${caseId}`,
    {medicationIdentifier: medId}, Object.assign({'X-XSRF-TOKEN':c.xsrf()},T));
  if(r.status!==200){console.log(label,medId,'status',r.status,r.body.slice(0,400));return;}
  const d = JSON.parse(r.body);
  require('fs').writeFileSync(`medsel-${label}-${medId}.json`, JSON.stringify(d,null,1));
  console.log('###', label, medId);
  for (const res of d.results||[]) {
    console.log('  ', res.ruleId||res.ruleIdentifier||res.rule, '->', JSON.stringify(res).slice(0,300));
  }
})();
