const c = require('./cli');
const fs = require('fs');
const ids = JSON.parse(fs.readFileSync('ids.json'));
const T = {'X-Tenant-Id':'demo-demo'};
(async()=>{
  const u = process.argv[2]||'loopuser', p = process.argv[3]||'LoopValidate1!';
  await c.login(u,p);
  await c.csrf();
  let r = await c.req('POST', `/api/cds/medication-selection/${ids.pmrn}/${ids.caseId}`,
      {medicationIdentifier:'m-sugammadex', timeZone:'America/New_York', isReselection:false}, T);
  console.log('status', r.status);
  fs.writeFileSync('sel-out.json', r.body);
  try {
    const j = JSON.parse(r.body);
    console.log(JSON.stringify(j, null, 1).slice(0, 200));
  } catch(e){ console.log(r.body.slice(0,500)); }
})();
