const { req, login } = require('./client');
const fs = require('fs');
const T = 'demo-demo';
const [label, ruleIdentifier, which] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(`${__dirname}/case-${label}.json`));
(async () => {
  await login('admin', 'admin', T);
  const r = await req('GET', `/api/admin/rule/evaluations/${which || 'fired'}?caseId=${encodeURIComponent(c.caseId)}&ruleIdentifier=${ruleIdentifier}`, { tenant: T });
  console.log(r.status); console.log(r.body.slice(0, 6000));
})();
