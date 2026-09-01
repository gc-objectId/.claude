const {req,login,xsrf} = require('./http');
async function launch(tenant, patientId, caseId) {
  await req('POST','/api/generate-app-launch-key','', {'X-XSRF-TOKEN': xsrf(), 'X-Tenant-Id':tenant});
  const t0 = Date.now();
  const r = await req('POST','/api/app-launch', {patientId, caseId, encounterId:'2000976997'}, {'X-XSRF-TOKEN': xsrf(), 'X-Tenant-Id':tenant});
  return {status: r.status, secs: ((Date.now()-t0)/1000).toFixed(1), body: r.body};
}
module.exports = { launch, login, req, xsrf };
