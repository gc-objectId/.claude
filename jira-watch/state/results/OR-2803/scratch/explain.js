const c = require('./client');
const T = {'X-Tenant-Id':'mayo-mayo'};
const [pmrn, caseId] = process.argv.slice(2);
(async()=>{
  await c.login('admin','admin');
  await c.req('GET','/api/csrf',undefined,T);
  const r = await c.req('GET', `/api/admin/patients/${pmrn}/operations/${caseId}/antibiotic-candidates`, undefined, T);
  if (r.status !== 200) { console.log(r.status, r.body.slice(0,800)); return; }
  const d = JSON.parse(r.body);
  console.log('outcome:', d.outcome, ' acuity:', d.acuity);
  console.log('preferred:', JSON.stringify(d.preferred));
  for (const p of d.procedures) {
    console.log(`procedure ${p.procedureType?.procedureId || JSON.stringify(p.procedureType).slice(0,80)}  ratedRisk=${p.risk}`);
    for (const pw of p.pathways) {
      console.log(`  pathway pos=${pw.position} risk=${pw.risk} acuities=${JSON.stringify(pw.acuities)} appliesToCase=${pw.appliesToCase} notation="${pw.notation}"`);
      for (const s of pw.steps||[]) for (const o of s.options||[]) console.log(`     step${s.stepNumber} ${JSON.stringify(o)}`);
    }
  }
})();
