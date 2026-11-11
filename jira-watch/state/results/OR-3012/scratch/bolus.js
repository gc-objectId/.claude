const { req, login } = require('./client');
const fs = require('fs');
const T = 'demo-demo';
const [label, medicationId, doseAmount, doseUnits, route, concIdx, minutesAgo] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(`${__dirname}/case-${label}.json`));
(async () => {
  await login('admin', 'admin', T);
  const administrationDate = new Date(Date.now() - Number(minutesAgo) * 60000).toISOString();
  const r = await req('POST', `/api/admin/bolus/patient/${encodeURIComponent(c.pmrn)}/${c.caseId}`, { tenant: T, body: {
    medicationId, administrationDate, doseAmount, doseUnits, route, concentrationOptionIndex: Number(concIdx) } });
  console.log('bolus', medicationId, doseAmount, doseUnits, route, 'at', administrationDate, '->', r.status, r.body.slice(0, 300));
})();
