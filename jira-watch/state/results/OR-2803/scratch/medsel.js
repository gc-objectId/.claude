const c = require('./client'); const T={'X-Tenant-Id':'mayo-mayo'};
const [label, pmrn, caseId, medId] = process.argv.slice(2);
(async()=>{
  await c.login('loopuser','LoopValidate1!'); await c.req('GET','/api/csrf',undefined,T);
  const r = await c.req('POST', `/api/cds/medication-selection/${pmrn}/${caseId}`,
    {medicationIdentifier: medId}, Object.assign({'X-XSRF-TOKEN':c.xsrf()},T));
  if(r.status!==200){console.log(label,medId,'status',r.status,r.body.slice(0,400));return;}
  const d = JSON.parse(r.body);
  const alerts = (d.alerts||d.medicationAlerts||[]).map(a=>({rule:a.ruleId||a.ruleIdentifier, prompt:(a.prompt||a.message||'').slice(0,180)}));
  console.log(label, medId, 'keys=', Object.keys(d).join(','));
  console.log('  alerts=', JSON.stringify(alerts));
})();
