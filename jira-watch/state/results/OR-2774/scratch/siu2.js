const { Client } = require('./client');
const fs = require('fs');
const base = fs.readFileSync('/Users/ryanducharme/dev/worktrees/OR-2774-objectoptimisticlockingfailureexception-batch-update-returned/mayo-client-integration/src/test/resources/hl7/rormc-siu-s14-before.hl7','utf8');
const pmrn = process.argv[2], caseId = process.argv[3], n = parseInt(process.argv[4]||'4',10);
(async () => {
  const clients = [];
  for (let i=0;i<n;i++){const c=new Client('mayo-mayo'); await c.login('admin','admin'); clients.push(c);}
  const res = await Promise.all(clients.map((c,i)=>{
    const raw = base.replace(/11201809/g,pmrn).replace(/\|183820\|/,`|${caseId}|`).replace(/\|260676\|/,`|${caseId}${i}|`).replace(/\r?\n/g,'\r');
    return c.post('/api/admin/hl7-inbound-messages/send',{rawMessage:raw}).then(r=>({i,status:r.status}));
  }));
  res.forEach(r=>console.log(JSON.stringify(r)));
})();
