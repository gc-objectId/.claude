const { req, login } = require('./client');
const fs = require('fs');
const T = 'demo-demo';
const [label, medicationIdentifier, ndc, doseAmount, doseUnits, route, minutesAgo, raw] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(`${__dirname}/case-${label}.json`));
(async () => {
  await login('loopuser', 'LoopValidate1!', T);
  const sel = await req('POST', `/api/cds/medication-selection/${encodeURIComponent(c.pmrn)}/${c.caseId}`, { tenant: T, body: { medicationIdentifier, timeZone: 'America/New_York' } });
  const trackingTabId = sel.status === 200 ? JSON.parse(sel.body).dosingFormState.trackingTabId : null;
  const t = new Date(Date.now() - Number(minutesAgo || 0) * 60000);
  const tz = 'America/New_York';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(t).map(p => [p.type, p.value]));
  const body = { medicationIdentifier, ndc, doseAmount: Number(doseAmount), doseUnits, route, concentrations: [], trackingTabId, timeZone: tz,
    adminYear: Number(parts.year), adminMonth: Number(parts.month), adminDay: Number(parts.day), adminHours: Number(parts.hour) % 24, adminMinutes: Number(parts.minute) };
  const r = await req('POST', `/api/cds/medication-dose/${encodeURIComponent(c.pmrn)}/${c.caseId}`, { tenant: T, body });
  if (r.status !== 200) { console.log('dose', medicationIdentifier, r.status, r.body.slice(0, 600)); return; }
  const d = JSON.parse(r.body);
  if (raw) { console.log(JSON.stringify(d, null, 1)); return; }
  console.log('dose', medicationIdentifier, doseAmount, doseUnits, route, 'at', `${parts.hour}:${parts.minute}`, '-> alerts:', (d.alerts || []).length);
  for (const a of d.alerts || []) console.log('  ALERT', a.ruleIdentifier, '|', a.title, '|', (a.description || '').replace(/\s+/g, ' ').slice(0, 400));
})();
