const {req, login} = require('./client');
const T = {'X-Tenant-Id': 'demo-demo'};
async function main() {
  const pmrn = process.argv[2];
  const caseId = process.argv[3];
  await login('loopuser','LoopValidate1!');
  const k = await req('POST', '/api/generate-app-launch-key', null, T);
  console.log('key', k.status, k.body.slice(0,60));
  const r = await req('POST', '/api/app-launch', {patientId: pmrn, caseId: caseId}, T);
  console.log('app-launch', r.status, r.body.slice(0,300));
}
main();
