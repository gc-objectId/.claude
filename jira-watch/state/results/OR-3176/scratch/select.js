const {request,login,tenant}=require("./api.js");
const [pmrn, caseId, med] = process.argv.slice(2);
(async()=>{
  await login("admin","admin");
  const r=await request("POST",`/api/cds/medication-selection/${pmrn}/${caseId}`,{medicationIdentifier:med,timeZone:"America/Chicago"},tenant("mayo-mayo"));
  const hits=(r.body.results||[]).filter(x=>x.ruleId==="w-antiemetic-early-redose");
  console.log(`SELECT ${med} status=${r.status} needsAction=${r.body.needsAction} redoseHits=${hits.length}`);
  hits.forEach(h=>console.log("  prompt:", h.prompt && h.prompt.promptText && h.prompt.promptText.displayText, "| citations:", (h.prompt.citations||[]).map(c=>c.id).join(",")));
  console.log("  other rules fired:", (r.body.results||[]).filter(x=>x.ruleId!=="w-antiemetic-early-redose").map(x=>x.ruleId).join(",")||"none");
})().catch(e=>console.log("ERR",e));
