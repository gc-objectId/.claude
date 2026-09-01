const {req,login,xsrf} = require('./http');
const T='mgb-mgh', P='30001024563', C='23151';
async function launch() {
  await req('POST','/api/generate-app-launch-key','', {'X-XSRF-TOKEN': xsrf(), 'X-Tenant-Id':T});
  const r = await req('POST','/api/app-launch', {patientId:P, caseId:C, encounterId:'2000976997'}, {'X-XSRF-TOKEN': xsrf(), 'X-Tenant-Id':T});
  return r;
}
async function select(medId) {
  const r = await req('POST', `/api/cds/medication-selection/${P}/${C}`, {medicationIdentifier: medId, timeZone: 'America/New_York'}, {'X-XSRF-TOKEN': xsrf(), 'X-Tenant-Id':T});
  return r;
}
module.exports = { launch, select, login, req, xsrf };
