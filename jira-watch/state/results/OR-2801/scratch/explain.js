const { Client } = require('./api');
const [tenant, pmrn, caseId] = process.argv.slice(2);
(async () => {
  const c = new Client(tenant);
  await c.login('admin', 'admin');
  const r = await c.get('/api/admin/patients/' + encodeURIComponent(pmrn) + '/operations/' + caseId + '/antibiotic-candidates');
  if (r.status !== 200) { console.log('HTTP', r.status, r.body.slice(0, 500)); return; }
  const d = JSON.parse(r.body);
  console.log('outcome        :', d.outcome);
  console.log('caseAcuity     :', d.caseAcuity);
  console.log('preferred      :', JSON.stringify((d.recommended || []).map(o => (o.medicationCandidates || []).map(m => m.medicationCategory).sort())));
  console.log('contraindicated:', JSON.stringify(d.contraindicated));
  for (const p of d.procedures || []) {
    console.log('procedure', p.procedure.procedureId, 'ratedRisk=' + p.ratedRisk);
    for (const pw of p.pathways || []) {
      console.log('  pathway', pw.position, 'risk=' + pw.risk, 'acuities=' + JSON.stringify(pw.acuities),
        'appliesToCase=' + pw.appliesToCase, 'noProphylaxis=' + pw.noProphylaxis, '|', pw.notation);
      for (const s of pw.steps || []) {
        for (const o of s.options || []) {
          console.log('    step', s.stepNumber, JSON.stringify(o.medicationCategories), '->', o.status);
        }
      }
    }
  }
})();
