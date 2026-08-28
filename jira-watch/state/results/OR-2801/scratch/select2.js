const { Client } = require('./api');
const [tenant, pmrn, caseId, medId] = process.argv.slice(2);
(async () => {
  const c = new Client(tenant);
  await c.login('loopuser', 'LoopValidate1!');
  const r = await c.post('/api/cds/medication-selection/' + encodeURIComponent(pmrn) + '/' + caseId,
    { medicationIdentifier: medId, timeZone: 'America/Chicago' });
  console.log(r.status);
  console.log(r.body);
})();
