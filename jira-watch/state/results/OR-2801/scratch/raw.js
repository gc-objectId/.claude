const { Client } = require('./api');
const [tenant, pmrn, caseId] = process.argv.slice(2);
(async () => {
  const c = new Client(tenant);
  await c.login('admin', 'admin');
  const r = await c.get('/api/admin/patients/' + encodeURIComponent(pmrn) + '/operations/' + caseId + '/antibiotic-candidates');
  console.log(r.status);
  try { console.log(JSON.stringify(JSON.parse(r.body), null, 1)); } catch(e) { console.log(r.body.slice(0,800)); }
})();
