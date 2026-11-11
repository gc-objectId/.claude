const { req, login } = require('./client');
const fs = require('fs');
const T = 'demo-demo';
const label = process.argv[2] || 'case';
(async () => {
  const l = await login('admin', 'admin', T); console.log('login', l.status);
  const dob = new Date(); dob.setFullYear(dob.getFullYear() - 40);
  const p = await req('POST', '/api/admin/patients/', { tenant: T, body: { prmnPrefix: 'la3012', firstName: 'Lipo', lastName: label, dob: dob.toISOString().slice(0, 10), height: '175 cm', weight: '70 kg' } });
  console.log('createPatient', p.status, p.body.slice(0, 300));
  const pat = JSON.parse(p.body);
  const op = await req('POST', `/api/admin/patients/${pat.uuid}/operations/create`, { tenant: T, body: { startTime: new Date(Date.now() - 30 * 60000).toISOString(), procedureTypes: [{ id: 'p-hernia-repair' }] } });
  console.log('createOperation', op.status, op.body.slice(0, 300));
  const o = JSON.parse(op.body);
  const pmrn = pat.pmrn || pat.patientId || pat.prmn; const caseId = o.caseId || o.id;
  const launch = await req('POST', '/api/app-launch', { tenant: T, body: { patientId: pmrn, caseId, forceLaunch: true } });
  console.log('app-launch', launch.status, launch.body.slice(0, 200));
  fs.writeFileSync(`${__dirname}/case-${label}.json`, JSON.stringify({ pmrn, caseId, uuid: pat.uuid }));
  console.log(JSON.stringify({ pmrn, caseId }));
})();
