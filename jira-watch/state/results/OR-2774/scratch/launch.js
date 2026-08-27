const { Client } = require('./client');

const args = process.argv.slice(2);
const patients = (args[0] || 'patient-1').split(',');
const caseTag = args[1] || 'c1';
const n = parseInt(args[2] || '4', 10);

(async () => {
  const clients = [];
  for (let i = 0; i < n; i++) {
    const c = new Client('demo-demo');
    await c.login('loopuser', 'LoopValidate1!');
    clients.push(c);
  }
  const t0 = Date.now();
  const results = await Promise.all(clients.map((c, i) => {
    const p = patients[i % patients.length];
    const start = Date.now();
    return c.post('/api/app-launch', { patientId: p, caseId: `or2774-${caseTag}-${p}`, mode: 'INTERACTIVE' })
      .then(r => ({ i, p, status: r.status, ms: Date.now() - start, startOffset: start - t0, body: r.body.slice(0, 300) }))
      .catch(e => ({ i, p, status: 'ERR', ms: Date.now() - start, body: e.message }));
  }));
  for (const r of results) console.log(JSON.stringify({i:r.i, patient:r.p, status:r.status, startOffset:r.startOffset, ms:r.ms, snippet: r.status===200 ? 'OK' : r.body}));
  console.log('total wall ms', Date.now() - t0);
})();
