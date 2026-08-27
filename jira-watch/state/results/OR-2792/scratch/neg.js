const s = require('./scenario');
(async () => {
  await s.login('admin','admin');
  for (const p of ['p-hysterectomy-open','p-duodenectomy','p-cholecystectomy','p-colonoscopy']) {
    for (const allergen of [null,'a-cefazolin']) {
      const c = await s.makeCase([p]);
      if (allergen) await s.addAllergy(c.pmrn, c.caseId, allergen);
      const d = await s.candidates(c.pmrn, c.caseId);
      const got = JSON.stringify((d.recommended||[]).map(o=>o.medicationCandidates.map(m=>m.medicationCategory).sort()).sort());
      console.log(`${p} allergen=${allergen||'none'} outcome=${d.outcome} recommended=${got}`);
      for (const pr of d.procedures) for (const pw of pr.pathways)
        console.log(`    pathway ${pw.position} applies=${pw.appliesToCase} :: ${pw.notation}`);
    }
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
