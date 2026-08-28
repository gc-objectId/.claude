const c = require('./client.js');
const fs = require('fs');
const T = 'demo-demo';
(async () => {
  const step = process.argv[2];
  if (step === 'stage') {
    await c.login('admin','admin');
    let r = await c.post('/api/admin/patients/', { prmnPrefix: 'or2782demo', firstName: 'OR2782', lastName: 'DEMO', dob: '1970-04-27', gender: 'MALE' }, T);
    const { pmrn, uuid } = JSON.parse(r.body);
    r = await c.post(`/api/admin/patients/${uuid}/operations/create`, { startTime: new Date().toISOString(), procedureTypes: [] }, T);
    const op = JSON.parse(r.body);
    fs.writeFileSync('demo-case.json', JSON.stringify({ pmrn, uuid, caseId: op.caseId }));
    console.log('staged', pmrn, uuid, 'caseId=', op.caseId, 'primaryPractitioner=', JSON.stringify(op.primaryPractitioner));
  } else {
    const { pmrn, caseId } = JSON.parse(fs.readFileSync('demo-case.json','utf8'));
    const [u,p] = step === 'launch-admin' ? ['admin','admin'] : ['loopuser','LoopValidate1!'];
    await c.login(u,p);
    const r = await c.post('/api/app-launch', { patientId: pmrn, caseId }, T);
    console.log('launch as', u, r.status, r.body.slice(0,200));
  }
})();
