const {req,login}=require('./client');
const fs=require('fs');
const T='demo-demo';
const c=JSON.parse(fs.readFileSync('case.json'));
const med = process.argv[2] || 'm-chloroprocaine';
(async()=>{
  await login('loopuser','LoopValidate1!',T);
  const r = await req('POST',`/api/cds/medication-selection/${encodeURIComponent(c.pmrn)}/${c.caseId}`,{tenant:T,body:{medicationIdentifier:med,timeZone:'America/New_York',isReselection:false}});
  console.log('status', r.status);
  console.log(r.body.slice(0,6000));
})();
