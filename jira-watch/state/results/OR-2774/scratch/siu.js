const { Client } = require('./client');
const fs = require('fs');
const base = fs.readFileSync('/Users/ryanducharme/dev/worktrees/OR-2774-objectoptimisticlockingfailureexception-batch-update-returned/mayo-client-integration/src/test/resources/hl7/rormc-siu-s14-before.hl7','utf8');
const pmrn = process.argv[2];
const n = parseInt(process.argv[3] || '4', 10);
(async () => {
  const clients = [];
  for (let i = 0; i < n; i++) { const c = new Client('mayo-mayo'); await c.login('admin','admin'); clients.push(c); }
  const t0 = Date.now();
  const res = await Promise.all(clients.map((c,i) => {
    const raw = base.replace(/11201809/g, pmrn).replace(/\|260676\|/, `|${pmrn}${i}|`).replace(/\r?\n/g,'\r');
    return c.post('/api/admin/hl7-inbound-messages/send',{rawMessage: raw})
      .then(r=>({i, status:r.status, ms:Date.now()-t0, body:r.body.slice(0,160)}));
  }));
  res.forEach(r=>console.log(JSON.stringify(r)));
})();
