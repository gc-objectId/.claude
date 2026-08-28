const { Client } = require('./api');
const [tenant, pmrn, caseId, ...allergies] = process.argv.slice(2);
(async () => {
  const c = new Client(tenant);
  await c.login('admin', 'admin');
  for (const a of allergies) {
    const [type, identifier, reaction] = a.split('/');
    const q = '?caseId=' + caseId + '&type=' + type + '&identifier=' + encodeURIComponent(identifier)
            + '&reaction=' + encodeURIComponent(reaction || 'ANAPHYLAXIS');
    const r = await c.post('/api/admin/patients/' + encodeURIComponent(pmrn) + '/allergies' + q);
    console.log('allergy', a, r.status, r.status === 200 ? 'ok' : r.body.slice(0, 200));
  }
})();
