const { Client } = require('./api');
const [tenant, pmrn, caseId, medId] = process.argv.slice(2);
(async () => {
  const c = new Client(tenant);
  console.log('login', (await c.login('loopuser', 'LoopValidate1!')).status);
  const r = await c.post('/api/cds/medication-selection/' + encodeURIComponent(pmrn) + '/' + caseId,
    { medicationIdentifier: medId, timeZone: 'America/Chicago' });
  if (r.status !== 200) { console.log('HTTP', r.status, r.body.slice(0, 600)); return; }
  const d = JSON.parse(r.body);
  const results = d.results || d.evaluationResults || [];
  for (const e of results) {
    if (!e.needsAction) continue;
    console.log('ALERT rule=' + (e.ruleId || e.ruleIdentifier), '|', e.prompt && e.prompt.title);
    if (e.prompt) console.log('   desc:', String(e.prompt.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ').trim().slice(0, 400));
  }
  console.log('--- abstained/other rules:', results.filter(e=>!e.needsAction).map(e=>e.ruleId||e.ruleIdentifier).join(','));
})();
