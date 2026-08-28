const {req,login}=require('./client');
const fs=require('fs');
const T='demo-demo';
const c=JSON.parse(fs.readFileSync('case.json'));
const meds=process.argv.slice(2);
(async()=>{
  await login('loopuser','LoopValidate1!',T);
  for (const med of meds) {
    const r = await req('POST',`/api/cds/medication-selection/${encodeURIComponent(c.pmrn)}/${c.caseId}`,{tenant:T,body:{medicationIdentifier:med,timeZone:'America/New_York',isReselection:false}});
    let out='ERR '+r.status;
    try{
      const j=JSON.parse(r.body);
      const routes=(j.context&&j.context.availableRoutes)||[];
      const rules=(j.results||[]).map(x=>x.ruleId);
      const last=(j.results||[]).find(x=>String(x.ruleId).includes('last'));
      const rad = last? Object.entries(last.details).filter(([k])=>k.includes('REMAINING_ALLOWED_DOSE')).map(([k,v])=>k+'='+v).join(' ') : '';
      out=`routes=${routes} rules=${rules} ${rad}`;
    }catch(e){out+=' '+r.body.slice(0,120)}
    console.log(med.padEnd(38), out);
  }
})();
