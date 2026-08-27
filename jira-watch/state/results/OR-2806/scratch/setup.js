const {req, login} = require('./client');
const T = {'X-Tenant-Id': 'mayo-mayo'};

async function main() {
  await login();
  const args = process.argv.slice(2);
  const prefix = args[0] || 'or2806a';
  const startTime = new Date(Date.now() - 30*60*1000).toISOString();
  const p = await req('POST', '/api/admin/patients/', {
    prmnPrefix: prefix, firstName: 'LAST', lastName: prefix.toUpperCase(),
    height: '165 cm', weight: '122 kg', dob: '1960-04-01', gender: 'FEMALE', genderIdentity: 'FEMALE'
  }, T);
  console.log('createPatient', p.status, p.body);
  const {pmrn, uuid} = JSON.parse(p.body);
  const o = await req('POST', `/api/admin/patients/${uuid}/operations/create`, {
    startTime, procedureTypes: [{id: 'p-appendectomy'}]
  }, T);
  console.log('createOperation', o.status, o.body.slice(0,400));
  const op = JSON.parse(o.body);
  console.log(JSON.stringify({pmrn, uuid, caseId: op.caseId, startTime}));
}
main();
