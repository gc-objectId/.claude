const { Client } = require('./api');
const [tenant, procs, ...allergies] = process.argv.slice(2);
(async () => {
  const c = new Client(tenant);
  await c.login('admin', 'admin');
  let r = await c.post('/api/admin/patients/', { prmnPrefix: 'ab2801', firstName: 'Path', lastName: 'Walk' });
  const { pmrn, uuid } = JSON.parse(r.body);
  r = await c.post('/api/admin/patients/' + uuid + '/operations/create', {
    startTime: new Date(Date.now() + 3600e3).toISOString(),
    procedureTypes: procs.split(',').map(id => ({ id: id, qualifier: null }))
  });
  if (r.status !== 200) { console.log('op FAILED', r.status, r.body.slice(0,300)); return; }
  const caseId = JSON.parse(r.body).caseId;
  for (const a of allergies) {
    const [type, identifier, reaction] = a.split('/');
    const q = '?caseId=' + caseId + '&type=' + type + '&identifier=' + encodeURIComponent(identifier)
            + '&reaction=' + encodeURIComponent(reaction || 'ANAPHYLAXIS');
    const ar = await c.post('/api/admin/patients/' + encodeURIComponent(pmrn) + '/allergies' + q);
    console.log('allergy', a, ar.status, ar.status === 200 ? '' : ar.body.slice(0, 200));
  }
  console.log('CASE ' + tenant + ' ' + pmrn + ' ' + caseId);
})();
