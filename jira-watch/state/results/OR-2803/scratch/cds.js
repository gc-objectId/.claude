const c = require('./client'); const T={'X-Tenant-Id':'mayo-mayo'};
const [pmrn, caseId] = process.argv.slice(2);
(async()=>{
  await c.login('loopuser','LoopValidate1!'); await c.req('GET','/api/csrf',undefined,T);
  const r = await c.req('POST', `/api/cds/app-launch/${pmrn}/${caseId}`, {timeZone:'America/Chicago'}, {'X-XSRF-TOKEN':c.xsrf(),...T});
  console.log('status', r.status);
  if(r.status!==200){console.log(r.body.slice(0,800));return;}
  const d = JSON.parse(r.body);
  console.log('keys', Object.keys(d).join(','));
  const s = JSON.stringify(d);
  for (const drug of ['CEFAZOLIN','CEFTRIAXONE','LEVOFLOXACIN','METRONIDAZOLE']) {
    console.log(drug, s.includes(drug));
  }
  require('fs').writeFileSync(`cds-${caseId}.json`, JSON.stringify(d,null,1));
})();
