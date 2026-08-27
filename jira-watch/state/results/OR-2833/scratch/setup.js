const {req, login} = require('./client');
const T = {'X-Tenant-Id': 'demo-demo'};

async function main() {
  await login('admin','admin');
  const prefix = process.argv[2] || 'or2833a';
  const startTime = new Date(Date.now() - 30*60*1000).toISOString();
  const p = await req('POST', '/api/admin/patients/', {
    prmnPrefix: prefix, firstName: 'VAL', lastName: prefix.toUpperCase(),
    height: '175 cm', weight: '80 kg', dob: '1975-04-01', gender: 'MALE', genderIdentity: 'MALE'
  }, T);
  console.log('createPatient', p.status, p.body);
  const {pmrn, uuid} = JSON.parse(p.body);
  const o = await req('POST', `/api/admin/patients/${uuid}/operations/create`, {
    startTime, procedureTypes: [{id: 'p-appendectomy'}]
  }, T);
  console.log('createOperation', o.status, o.body.slice(0,300));
  const op = JSON.parse(o.body);
  console.log('RESULT ' + JSON.stringify({pmrn, uuid, caseId: op.caseId, startTime}));
}
main();
