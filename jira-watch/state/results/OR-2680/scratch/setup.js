const c = require('./client.js');
(async () => {
  await c.login('admin','admin');
  const tok = await c.csrfToken();
  const T = 'demo-demo';
  const hj = {'X-Tenant-Id':T,'Content-Type':'application/json','X-XSRF-TOKEN':tok};
  const p = JSON.parse((await c.req('POST','/api/admin/patients/', JSON.stringify({prmnPrefix:'or2680'}), hj)).body);
  console.log('patient', JSON.stringify(p));
  const op = await c.req('POST',`/api/admin/patients/${p.uuid}/operations/create`, JSON.stringify({
    startTime: new Date(Date.now()+3600000).toISOString(),
    procedureTypes: [{id:'p-appendectomy', qualifier:null}]
  }), hj);
  console.log('operation', op.status, op.body.slice(0,500));
  let caseId = null;
  try { caseId = JSON.parse(op.body).caseId; } catch {}
  console.log('caseId', caseId);
  if (caseId) {
    const obs = await c.req('POST',`/api/admin/observations/patient/${p.pmrn}/case/${caseId}`, JSON.stringify({
      type:'GLUCOSE', value:'137', units:'mg/dL', date: new Date().toISOString()
    }), hj);
    console.log('addObservation', obs.status, obs.body.slice(0,400));
  }
  require('fs').writeFileSync('subject.json', JSON.stringify({pmrn:p.pmrn, uuid:p.uuid, caseId}));
})();
