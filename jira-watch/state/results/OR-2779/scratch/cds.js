const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
const cases=require("./cases.json");
(async()=>{
  await login("loopuser","LoopValidate1!");
  for (const [label,c] of Object.entries(cases)) {
    const caseId = JSON.parse(c.op).caseId;
    const r = await req("POST",`/api/cds/app-launch/${encodeURIComponent(c.pmrn)}/${caseId}`,{timeZone:"America/New_York"},T);
    console.log("=== cds", label, caseId, r.status, r.body.length);
  }
})();
