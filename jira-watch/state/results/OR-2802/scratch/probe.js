const { req, login } = require('./cli');
const T = 'demo-demo';
const cases = require('./cases.json');
(async () => {
  await login('admin', 'admin', T);
  for (const [name, c] of Object.entries(cases)) {
    const r = await req('GET', `/api/admin/patients/${c.pmrn}/operations/${c.caseId}/antibiotic-candidates`, { tenant: T });
    console.log('=====', name, c.caseId, 'HTTP', r.status);
    if (r.status !== 200) { console.log(r.body.slice(0, 500)); continue; }
    const d = JSON.parse(r.body);
    console.log('outcome:', d.outcome, '| caseAcuity:', d.caseAcuity, '| contraindicated:', JSON.stringify(d.contraindicated));
    console.log('recommended:', JSON.stringify(d.recommended?.map(o => o.medicationCandidates?.map(m => m.medicationCategory))));
    for (const p of d.procedures) {
      console.log('  proc', p.procedure.procedureId, 'risk', p.procedureRisk);
      for (const pw of p.pathways) {
        console.log('    pathway pos', pw.position, 'applies', pw.appliesToCase, 'noProph', pw.noProphylaxis, '|', pw.notation);
        for (const s of pw.steps) for (const o of s.options) console.log('      step', s.stepNumber, o.medicationCategories.join('+'), '->', o.status);
      }
    }
  }
})();
