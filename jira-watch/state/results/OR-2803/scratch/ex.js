const c = require('./client'); const T={'X-Tenant-Id':'mayo-mayo'};
const [pmrn, caseId] = process.argv.slice(2);
(async()=>{
  await c.login('admin','admin'); await c.req('GET','/api/csrf',undefined,T);
  const r = await c.req('GET', `/api/admin/patients/${pmrn}/operations/${caseId}/antibiotic-candidates`, undefined, T);
  if (r.status!==200){console.log(r.status,r.body.slice(0,600));return;}
  const d = JSON.parse(r.body);
  console.log('outcome:',d.outcome,'acuity:',d.caseAcuity);
  console.log('recommended:', JSON.stringify(d.recommended.map(x=>({step:x.stepNumber,drugs:x.medicationCandidates.map(m=>m.medicationCategory)}))));
  for (const p of d.procedures){
    console.log(`procedure=${p.procedure.procedureId} ratedRisk=${p.procedureRisk}`);
    for(const pw of p.pathways) console.log(`  pos=${pw.position} risk=${pw.risk} appliesToCase=${pw.appliesToCase} statuses=${JSON.stringify(pw.steps.map(s=>s.options.map(o=>o.status)))} "${pw.notation}"`);
  }
})();
