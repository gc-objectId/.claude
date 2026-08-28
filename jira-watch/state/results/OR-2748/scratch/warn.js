const {req,login}=require('./client');
const fs=require('fs');
const T='demo-demo';
const c=JSON.parse(fs.readFileSync('case.json'));
const med=process.argv[2]||'m-lidocaine-epinephrine-2-10';
(async()=>{
  await login('loopuser','LoopValidate1!',T);
  const r = await req('POST',`/api/cds/medication-selection/${encodeURIComponent(c.pmrn)}/${c.caseId}`,{tenant:T,body:{medicationIdentifier:med,timeZone:'America/New_York',isReselection:false}});
  console.log('HTTP', r.status);
  if(r.status!==200){console.log(r.body.slice(0,1500));return;}
  const j=JSON.parse(r.body);
  const w=(j.results||[]).find(x=>x.ruleId==='w-last-local-anesthetic-max-dose');
  if(!w){console.log('WARNING RULE ABSENT. rules=', (j.results||[]).map(x=>x.ruleId+(x.error?' ERR='+x.error:'')));return;}
  console.log('needsAction=',w.needsAction,'error=',w.error,'explanation=',w.explanation);
  console.log('NERVE_BLOCK_REMAINING_ALLOWED_DOSE      =', JSON.stringify(w.details.NERVE_BLOCK_REMAINING_ALLOWED_DOSE));
  console.log('NERVE_BLOCK_REMAINING_ALLOWED_DOSE_AMOUNT_MG =', w.details.NERVE_BLOCK_REMAINING_ALLOWED_DOSE_AMOUNT_MG);
  console.log('NERVE_BLOCK_REMAINING_DOSE =', JSON.stringify(w.details.NERVE_BLOCK_REMAINING_DOSE));
  console.log('NERVE_BLOCK_MAX_DOSE       =', JSON.stringify(w.details.NERVE_BLOCK_MAX_DOSE));
  console.log('prior admins =', JSON.stringify(w.details.LOCAL_ANESTHETIC_ADMINISTRATIONS||[]).slice(0,300));
  const pt=w.prompt&&w.prompt.routeBasedPromptText&&w.prompt.routeBasedPromptText.NERVE_BLOCK;
  console.log('PROMPT NERVE_BLOCK =', pt?JSON.stringify(pt.displayText):'(none)');
  const cits=(w.prompt&&w.prompt.routeBasedCitations&&w.prompt.routeBasedCitations.NERVE_BLOCK)||[];
  console.log('CITATION IDS =', cits.map(x=>x.id));
  cits.forEach(x=>console.log('  label:', JSON.stringify(x.label)));
})();
