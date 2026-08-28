const { req, login } = require('./cli');
const T='demo-demo';
(async()=>{
  await login('admin','admin',T);
  const p = JSON.parse((await req('POST','/api/admin/patients/',{tenant:T,body:{prmnPrefix:'cov-allergy'}})).body);
  const op = JSON.parse((await req('POST',`/api/admin/patients/${p.uuid}/operations/create`,{tenant:T,body:{startTime:new Date(Date.now()+3600e3).toISOString(),procedureTypes:[{id:'p-colorectal',qualifier:null},{id:'p-arthroscopy-knee',qualifier:null}]}})).body);
  console.log('case', op.caseId, 'pmrn', p.pmrn);
  for (const [type,ident] of [['ALLERGEN','a-cefazolin'],['MEDICATION','m-vancomycin-iv']]) {
    const r = await req('POST',`/api/admin/patients/${p.pmrn}/allergies?caseId=${op.caseId}&type=${type}&identifier=${ident}&reaction=Anaphylaxis`,{tenant:T});
    console.log('allergy',ident,r.status,r.body.slice(0,120));
  }
  const r = await req('GET',`/api/admin/patients/${p.pmrn}/operations/${op.caseId}/antibiotic-candidates`,{tenant:T});
  const d = JSON.parse(r.body);
  console.log('outcome:', d.outcome, '| contraindicated:', JSON.stringify(d.contraindicated));
  console.log('recommended:', JSON.stringify(d.recommended.map(o=>o.medicationCandidates.map(m=>m.medicationCategory))));
  for (const pr of d.procedures) for (const pw of pr.pathways) for (const s of pw.steps) for (const o of s.options) console.log('  ', pr.procedure.procedureId, 'step', s.stepNumber, o.medicationCategories.join('+'), '->', o.status);
  require('fs').writeFileSync(__dirname+'/allergy-case.json', JSON.stringify({pmrn:p.pmrn,caseId:op.caseId},null,2));
})();
