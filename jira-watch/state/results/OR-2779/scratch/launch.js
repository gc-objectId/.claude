const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
const cases=require("./cases.json");
(async()=>{
  const l = await login("loopuser","LoopValidate1!");
  console.log("login", l.status);
  const k = await req("POST","/api/generate-app-launch-key",null,T);
  console.log("key", k.status, k.body.slice(0,60));
  for (const [label, c] of Object.entries(cases)) {
    const caseId = JSON.parse(c.op).caseId;
    const r = await req("POST","/api/app-launch",{patientId:c.pmrn, caseId},T);
    console.log("=== launch", label, caseId, r.status);
    console.log(r.body.slice(0,3000));
  }
})();
