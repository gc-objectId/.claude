const {req, auth} = require('./lib.js');
const c = require('./case.json');
(async()=>{
  const H = await auth();
  const acuity = process.argv[2] === 'null' ? null : process.argv[2];
  let r = await req('PATCH', '/api/admin/patients/' + encodeURIComponent(c.pmrn) + '/operations/' + c.caseId + '/acuity', {acuity}, H);
  console.log('patch', r.status, JSON.parse(r.body).acuity);
  r = await req('GET', '/api/admin/patients/' + encodeURIComponent(c.pmrn) + '/operations/' + c.caseId + '/antibiotic-candidates', null, H);
  const d = JSON.parse(r.body);
  console.log('outcome:', d.outcome, 'caseAcuity:', d.caseAcuity, 'recommended:', JSON.stringify(d.recommended));
  for (const p of d.procedures) for (const pw of p.pathways)
    console.log('  pos=' + pw.position, 'acuities=' + JSON.stringify(pw.acuities), 'appliesToCase=' + pw.appliesToCase, '|', pw.notation);
})();
