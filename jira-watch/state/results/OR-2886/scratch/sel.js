const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
const c=require("./case.json");
(async()=>{
  const l = await login("loopuser","LoopValidate1!");
  const r = await req("POST",`/api/cds/medication-selection/${encodeURIComponent(c.pmrn)}/${c.caseId}`,{medicationIdentifier:"m-sugammadex", timeZone:"America/New_York"},T);
  console.log("selection", r.status);
  if (r.status !== 200) { console.log(r.body.slice(0,800)); return; }
  const j = JSON.parse(r.body);
  const mine = (j.results||[]).filter(x=>x.ruleId==="w-sugammadex-default-dose");
  console.log(JSON.stringify(mine.map(x=>({ruleId:x.ruleId,needsAction:x.needsAction,explanation:x.explanation,error:x.error,details:x.details})),null,1));
  console.log("total results:", (j.results||[]).length, "errors:", (j.results||[]).filter(x=>x.error).map(x=>x.ruleId));
})().catch(e=>{console.error(e);process.exit(1)});
