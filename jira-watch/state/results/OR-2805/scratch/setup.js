const c = require('./cli');
const T = {'X-Tenant-Id':'demo-demo'};
(async()=>{
  await c.login('admin','admin');
  await c.csrf();
  const now = Date.now();
  const startTime = new Date(now - 60*60*1000).toISOString();
  let r = await c.req('POST','/api/admin/patients/', {prmnPrefix:'or2805', firstName:'Small', lastName:'Adult', dob:'1985-01-01', height:'150 cm', weight:'36.9 kg'}, T);
  console.log('createPatient', r.status, r.body);
  if (r.status !== 200) return;
  const p = JSON.parse(r.body);
  r = await c.req('POST', `/api/admin/patients/${p.uuid}/operations/create`, {startTime, procedureTypes:[{id:'p-appendectomy', qualifier:null}]}, T);
  console.log('createOperation', r.status, r.body.slice(0,600));
  const op = JSON.parse(r.body);
  console.log('PMRN', p.pmrn, 'CASE', op.caseId);
  require('fs').writeFileSync('ids.json', JSON.stringify({pmrn:p.pmrn, uuid:p.uuid, caseId:op.caseId, startTime}));
})();
