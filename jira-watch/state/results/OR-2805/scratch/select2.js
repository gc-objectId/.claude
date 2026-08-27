const c = require('./cli'); const fs=require('fs');
const ids = JSON.parse(fs.readFileSync(process.argv[2]));
const T = {'X-Tenant-Id':'demo-demo'};
(async()=>{
  await c.login('loopuser','LoopValidate1!'); await c.csrf();
  let r = await c.req('POST', `/api/cds/medication-selection/${ids.pmrn}/${ids.caseId}`,
      {medicationIdentifier:'m-sugammadex', timeZone:'America/New_York', isReselection:false}, T);
  console.log('status', r.status);
  fs.writeFileSync(process.argv[3], r.body);
})();
