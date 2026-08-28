const { Client } = require('./api');
const TENANT = process.argv[2] || 'mayo-mayo';
const PROC = process.argv[3] || 'p-oophorectomy-laparoscopic';
(async () => {
  const c = new Client(TENANT);
  console.log('login', (await c.login('admin', 'admin')).status);
  let r = await c.post('/api/admin/patients/', { prmnPrefix: 'ab2801', firstName: 'Path', lastName: 'Walk', weight: '70 kg', height: '170 cm' });
  console.log('createPatient', r.status, r.body.slice(0, 400));
  if (r.status !== 200) return;
  const { pmrn, uuid } = JSON.parse(r.body);
  r = await c.post('/api/admin/patients/' + uuid + '/operations/create', {
    startTime: new Date(Date.now() + 3600e3).toISOString(),
    procedureTypes: PROC.split(',').map(id => ({ id: id, qualifier: null }))
  });
  console.log('createOperation', r.status, r.body.slice(0, 600));
  const op = JSON.parse(r.body);
  console.log('RESULT ' + TENANT + ' PMRN=' + pmrn + ' UUID=' + uuid + ' CASE=' + op.caseId);
})();
