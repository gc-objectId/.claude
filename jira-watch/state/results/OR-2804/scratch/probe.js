const {req, auth} = require('./lib.js');
const c = require('./case.json');
(async()=>{
  const H = await auth();
  const r = await req('GET', '/api/admin/patients/' + encodeURIComponent(c.pmrn) + '/operations/' + c.caseId + '/antibiotic-candidates', null, H);
  console.log('status', r.status);
  const d = JSON.parse(r.body);
  console.log('outcome:', d.outcome, ' acuity:', JSON.stringify(d.acuity));
  console.log('preferred:', JSON.stringify(d.preferred));
  console.log('contraindicated:', JSON.stringify(d.contraindicated));
  for (const p of d.procedures || []) {
    console.log('procedure', p.procedureType && p.procedureType.procedureId, 'rated risk', p.ratedRisk);
    for (const pw of p.pathways || []) {
      console.log('  pathway pos=' + pw.position, 'risk=' + pw.risk, 'acuities=' + JSON.stringify(pw.acuities), 'applies=' + pw.applies, 'noProph=' + pw.noProphylaxis, '|', pw.notation);
    }
  }
})();
