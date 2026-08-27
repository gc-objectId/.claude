const c = require('./cli');
const fs = require('fs');
const ids = JSON.parse(fs.readFileSync('ids.json'));
const T = {'X-Tenant-Id':'demo-demo'};
(async()=>{
  await c.login('admin','admin');
  await c.csrf();
  const now = Date.now();
  let r = await c.req('POST','/api/app-launch', {patientId: ids.pmrn, caseId: ids.caseId}, T);
  console.log('app-launch', r.status, r.body.slice(0,200));
  await c.csrf();
  r = await c.req('POST', `/api/admin/bolus/patient/${ids.pmrn}/${ids.caseId}`,
      {medicationId:'m-vecuronium', administrationDate: new Date(now-30*60*1000).toISOString(), doseAmount:'5', doseUnits:'mg', route:'INTRAVENOUS', concentrationOptionIndex:0}, T);
  console.log('bolus', r.status, r.body.slice(0,300));
  await c.csrf();
  r = await c.req('POST', `/api/admin/observations/patient/${ids.pmrn}/case/${ids.caseId}`,
      {type:'TOF', value:'2', units:null, date: new Date(now-60*1000).toISOString()}, T);
  console.log('obs', r.status, r.body.slice(0,300));
})();
