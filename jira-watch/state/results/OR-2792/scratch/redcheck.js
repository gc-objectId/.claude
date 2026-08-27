const s = require('./scenario');
(async () => {
  await s.login('admin','admin');
  const cases = [
    ['p-duodenal-ulcer','a-cefazolin'],
    ['p-exploratory-laparotomy','a-cefazolin'],
    ['p-hysterectomy-open',null],
    ['p-hysterectomy-open','a-cefazolin'],
    ['p-myomectomy-open','a-cefazolin'],
  ];
  for (const [p, allergen] of cases) {
    const c = await s.makeCase([p]);
    if (allergen) await s.addAllergy(c.pmrn, c.caseId, allergen);
    const d = await s.candidates(c.pmrn, c.caseId);
    const got = JSON.stringify((d.recommended||[]).map(o=>o.medicationCandidates.map(m=>m.medicationCategory).sort()).sort());
    console.log(`${p} allergen=${allergen||'none'} outcome=${d.outcome} recommended=${got}`);
    for (const pr of d.procedures) for (const pw of pr.pathways) console.log(`    pathway ${pw.position} :: ${pw.notation}`);
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
