const {req, login} = require('./api');
const T = {'X-Tenant-Id':'mayo-mayo'};
const cases = require('./cases.json');
(async()=>{
  await login('admin','admin');
  for (const c of cases) {
    const r = await req('GET',`/api/admin/patients/${c.pmrn}/operations/${c.caseId}/antibiotic-candidates`, undefined, T);
    if (r.status !== 200) { console.log(c.label, r.status, r.body.slice(0,300)); continue; }
    const d = JSON.parse(r.body);
    const drugs = (d.recommended||[]).map(o => o.medicationCandidates.map(m=>m.medicationCategory).join('+'));
    console.log(`---- ${c.label} case=${c.caseId} outcome=${d.outcome} caseAcuity=${d.caseAcuity} recommended=[${drugs.join(', ')}]`);
    for (const p of d.procedures) for (const pw of p.pathways)
      console.log(`     pos=${pw.position} acuities=${JSON.stringify(pw.acuities)} appliesToCase=${pw.appliesToCase} :: ${pw.notation}`);
  }
})();
