const s = require('./scenario');
(async () => {
  await s.login('admin', 'admin');
  const procs = process.argv[2].split(',');
  const allergen = process.argv[3];
  const c = await s.makeCase(procs);
  console.log(`### case ${c.caseId} pmrn ${c.pmrn} procs=${procs.join('+')} allergen=${allergen || 'none'}`);
  if (allergen) {
    const a = await s.addAllergy(c.pmrn, c.caseId, allergen);
    console.log('addAllergy', a.status, a.body.slice(0, 200));
  }
  console.log(s.summarize(await s.candidates(c.pmrn, c.caseId)));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
