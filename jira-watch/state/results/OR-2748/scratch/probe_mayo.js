const {req,login}=require('./client');
const fs=require('fs');
const T='mayo-mayo';
const c=JSON.parse(fs.readFileSync('case_mayo.json'));
(async()=>{
  await login('loopuser','LoopValidate1!',T);
  for (const med of process.argv.slice(2)) {
    const r = await req('POST',`/api/cds/medication-selection/${encodeURIComponent(c.pmrn)}/${c.caseId}`,{tenant:T,body:{medicationIdentifier:med,timeZone:'America/New_York',isReselection:false}});
    let out='ERR '+r.status;
    try{
      const j=JSON.parse(r.body);
      const routes=(j.context&&j.context.availableRoutes)||[];
      const rules=(j.results||[]).map(x=>x.ruleId+(x.error?'[ERR:'+x.error+']':''));
      const w=(j.results||[]).find(x=>x.ruleId==='w-last-local-anesthetic-max-dose');
      const rad = w? Object.entries(w.details).filter(([k])=>k.includes('REMAINING_ALLOWED_DOSE')).map(([k,v])=>k+'='+v).join(' ') : '';
      out=`routes=${routes} rules=${rules}\n    ${rad}`;
      if(w) out+='\n    promptText='+JSON.stringify(w.prompt&&w.prompt.routeBasedPromptText);
    }catch(e){out+=' '+r.body.slice(0,200)}
    console.log(med.padEnd(36), out);
  }
})();
