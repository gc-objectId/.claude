const c = require('./cli'); const fs=require('fs');
const T = {'X-Tenant-Id':'demo-demo'};
(async()=>{
  const weight = process.argv[2], out=process.argv[3];
  await c.login('admin','admin'); await c.csrf();
  const now=Date.now();
  let r = await c.req('POST','/api/admin/patients/', {prmnPrefix:'or2805roc', firstName:'Roc', lastName:'Case', dob:'1985-01-01', height:'150 cm', weight}, T);
  const p=JSON.parse(r.body);
  r = await c.req('POST', `/api/admin/patients/${p.uuid}/operations/create`, {startTime:new Date(now-60*60*1000).toISOString(), procedureTypes:[{id:'p-appendectomy',qualifier:null}]}, T);
  const op=JSON.parse(r.body);
  await c.req('POST','/api/app-launch',{patientId:p.pmrn, caseId:op.caseId}, T);
  await c.csrf();
  r = await c.req('POST', `/api/admin/bolus/patient/${p.pmrn}/${op.caseId}`,
    {medicationId:'m-rocuronium', administrationDate:new Date(now-2*60*1000).toISOString(), doseAmount:'60', doseUnits:'mg', route:'INTRAVENOUS', concentrationOptionIndex:0}, T);
  console.log('roc bolus', r.status, r.body.slice(0,80), 'weight', weight, 'pmrn', p.pmrn, 'case', op.caseId);
  fs.writeFileSync(out, JSON.stringify({pmrn:p.pmrn, caseId:op.caseId}));
})();
