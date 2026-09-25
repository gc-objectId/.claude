const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
const c=require("./case.json");
(async()=>{
  const l = await login("loopuser","LoopValidate1!"); console.log("login", l.status);
  const k = await req("POST","/api/generate-app-launch-key",null,T); console.log("key", k.status);
  const r = await req("POST","/api/app-launch",{patientId:c.pmrn, caseId:c.caseId},T);
  console.log("launch", r.status, r.body.slice(0,600));
})().catch(e=>{console.error(e);process.exit(1)});
