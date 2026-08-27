const c = require('./cli');
const T = {'X-Tenant-Id':'demo-demo'};
const fs=require('fs');
(async()=>{
  const weight = process.argv[2], out = process.argv[3], dob = process.argv[4]||'1985-01-01';
  await c.login('admin','admin'); await c.csrf();
  const now = Date.now();
  const startTime = new Date(now - 60*60*1000).toISOString();
  let r = await c.req('POST','/api/admin/patients/', {prmnPrefix:'or2805', firstName:'Neg', lastName:'Case', dob, height:'150 cm', weight}, T);
  const p = JSON.parse(r.body);
  r = await c.req('POST', `/api/admin/patients/${p.uuid}/operations/create`, {startTime, procedureTypes:[{id:'p-appendectomy', qualifier:null}]}, T);
  const op = JSON.parse(r.body);
  console.log('pediatricStatus', op.pediatricStatus, 'pmrn', p.pmrn, 'case', op.caseId);
  fs.writeFileSync(out, JSON.stringify({pmrn:p.pmrn, uuid:p.uuid, caseId:op.caseId}));
  await c.req('POST','/api/app-launch', {patientId: p.pmrn, caseId: op.caseId}, T);
  await c.csrf();
  r = await c.req('POST', `/api/admin/bolus/patient/${p.pmrn}/${op.caseId}`,
      {medicationId:'m-vecuronium', administrationDate: new Date(now-30*60*1000).toISOString(), doseAmount:'5', doseUnits:'mg', route:'INTRAVENOUS', concentrationOptionIndex:0}, T);
  console.log('bolus', r.status, r.body.slice(0,100));
  await c.csrf();
  r = await c.req('POST', `/api/admin/observations/patient/${p.pmrn}/case/${op.caseId}`,
      {type:'TOF', value:'2', units:null, date: new Date(now-60*1000).toISOString()}, T);
  console.log('obs', r.status);
})();
