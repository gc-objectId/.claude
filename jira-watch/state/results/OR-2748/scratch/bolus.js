const {req,login}=require('./client');
const fs=require('fs');
const T='demo-demo';
const c=JSON.parse(fs.readFileSync('case.json'));
const dose=process.argv[2]||'10';
(async()=>{
  await login('admin','admin',T);
  const r = await req('POST',`/api/admin/bolus/patient/${encodeURIComponent(c.pmrn)}/${c.caseId}`,{tenant:T,body:{
    medicationId:'m-lidocaine-epinephrine-2-10',
    administrationDate:new Date(Date.now()-20*60000).toISOString(),
    doseAmount:dose, doseUnits:'mg', route:'NERVE_BLOCK', concentrationOptionIndex:0}});
  console.log('bolus', r.status, r.body.slice(0,300));
})();
