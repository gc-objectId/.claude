const s = require('./scenario');
const G1 = ['p-duodenal-ulcer','p-exploratory-laparotomy','p-exploratory-laparoscopy'];
const G2 = ['p-myomectomy-open','p-myomectomy-laparoscopic','p-myomectomy-robotic','p-pelvic-floor-repair-open',
 'p-pelvic-floor-repair-laparoscopic','p-pelvic-floor-repair-robotic','p-pelvic-floor-repair-endoscopic',
 'p-urogynecologic-with-cystoscopy-other','p-urogynecologic-no-cystoscopy-other','p-gynecologic-laparoscopic-other',
 'p-gynecologic-open-other','p-vulvectomy','p-vesicovaginal-fistula','p-rectovaginal-fistula'];
const EXP1_NOALLERGY = [['CEFAZOLIN'],['CEFAZOLIN','METRONIDAZOLE']];
const EXP1_ALLERGY = [['VANCOMYCIN'],['CIPROFLOXACIN','METRONIDAZOLE'],['CIPROFLOXACIN','CLINDAMYCIN']];
const EXP2_NOALLERGY = [['CEFAZOLIN'],['CEFAZOLIN','METRONIDAZOLE']];
const EXP2_ALLERGY = [['CIPROFLOXACIN','VANCOMYCIN'],['CIPROFLOXACIN','METRONIDAZOLE','VANCOMYCIN']];

const norm = d => JSON.stringify((d.recommended||[]).map(o => o.medicationCandidates.map(m=>m.medicationCategory).sort()).sort());
const exp = a => JSON.stringify(a.map(x=>[...x].sort()).sort());

(async () => {
  await s.login('admin','admin');
  let fails = 0;
  for (const [group, procs, en, ea] of [['G1',G1,EXP1_NOALLERGY,EXP1_ALLERGY],['G2',G2,EXP2_NOALLERGY,EXP2_ALLERGY]]) {
    for (const p of procs) {
      for (const [label, allergen, expected] of [['no-allergy', null, en], ['cefazolin-allergy','a-cefazolin', ea]]) {
        const c = await s.makeCase([p]);
        if (allergen) await s.addAllergy(c.pmrn, c.caseId, allergen);
        const d = await s.candidates(c.pmrn, c.caseId);
        const got = norm(d), want = exp(expected);
        const ok = got === want && d.outcome === 'RECOMMENDED';
        if (!ok) fails++;
        console.log(`${ok?'PASS':'FAIL'} ${group} ${p} ${label} outcome=${d.outcome} got=${got}${ok?'':' want='+want}`);
      }
    }
  }
  console.log(`\nfailures=${fails}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
