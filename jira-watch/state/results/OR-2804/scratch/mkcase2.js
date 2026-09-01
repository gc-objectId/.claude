const {req, auth} = require('./lib.js');
(async()=>{
  const H = await auth();
  let r = await req('POST','/api/admin/patients/',{prmnPrefix:'or2804b', firstName:'Uns', lastName:'Coped', weight:'70 kg', height:'170 cm'}, H);
  const p = JSON.parse(r.body);
  r = await req('POST','/api/admin/patients/' + p.uuid + '/operations/create', {startTime: new Date(Date.now()+3600e3).toISOString(), procedureTypes:[{id:'p-mastectomy', qualifier:null}]}, H);
  const op = JSON.parse(r.body);
  console.log('case', p.pmrn, op.caseId, 'acuity', op.acuity);
  r = await req('GET','/api/admin/patients/'+encodeURIComponent(p.pmrn)+'/operations/'+op.caseId+'/antibiotic-candidates', null, H);
  const d = JSON.parse(r.body);
  console.log('outcome:', d.outcome, 'caseAcuity:', d.caseAcuity);
  for (const pr of d.procedures) for (const pw of pr.pathways)
    console.log('  pos='+pw.position, 'acuities='+JSON.stringify(pw.acuities), 'appliesToCase='+pw.appliesToCase, '|', pw.notation);
})();
