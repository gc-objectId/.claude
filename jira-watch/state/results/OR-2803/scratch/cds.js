const c = require('./client'); const T={'X-Tenant-Id':'mayo-mayo'};
const [label, pmrn, caseId] = process.argv.slice(2);
(async()=>{
  await c.login('loopuser','LoopValidate1!'); await c.req('GET','/api/csrf',undefined,T);
  const r = await c.req('POST', `/api/cds/app-launch/${pmrn}/${caseId}`, {timeZone:'America/Chicago'}, Object.assign({'X-XSRF-TOKEN':c.xsrf()},T));
  if(r.status!==200){console.log(label,'status',r.status,r.body.slice(0,500));return;}
  const s = r.body;
  require('fs').writeFileSync(`cds-${label}.json`, s);
  const hits = {};
  for (const drug of ['CEFAZOLIN','CEFTRIAXONE','LEVOFLOXACIN','METRONIDAZOLE']) hits[drug] = s.includes(drug);
  console.log(label, caseId, JSON.stringify(hits));
})();
