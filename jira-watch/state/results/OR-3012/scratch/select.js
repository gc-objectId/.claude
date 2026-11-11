const { req, login } = require('./client');
const fs = require('fs');
const T = 'demo-demo';
const [label, medicationId, raw] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(`${__dirname}/case-${label}.json`));
(async () => {
  await login('loopuser', 'LoopValidate1!', T);
  const r = await req('POST', `/api/cds/medication-selection/${encodeURIComponent(c.pmrn)}/${c.caseId}`, { tenant: T, body: { medicationIdentifier: medicationId, timeZone: 'America/New_York' } });
  if (r.status !== 200) { console.log('select', medicationId, r.status, r.body.slice(0, 600)); return; }
  const d = JSON.parse(r.body);
  if (raw) { console.log(JSON.stringify(d, null, 1)); return; }
  const s = d.dosingFormState || {};
  console.log('select', medicationId, 'trackingTabId', s.trackingTabId);
  for (const a of s.alerts || []) console.log('  ALERT', a.ruleIdentifier, '|', a.title, '|', (a.description || '').replace(/\s+/g, ' ').slice(0, 400));
  for (const g of s.guidance || []) console.log('  GUIDANCE', JSON.stringify(g).slice(0, 600));
  fs.writeFileSync(`${__dirname}/tab-${label}.json`, JSON.stringify({ trackingTabId: s.trackingTabId }));
})();
