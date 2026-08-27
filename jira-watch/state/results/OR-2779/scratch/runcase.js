const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
const c=require("./"+process.argv[2]+".json");
(async()=>{
  await login("loopuser","LoopValidate1!");
  await req("POST","/api/generate-app-launch-key",null,T);
  const r = await req("POST","/api/app-launch",{patientId:c.pmrn, caseId:c.caseId},T);
  const j = JSON.parse(r.body);
  console.log("app-launch", r.status, "erasOperation =", j.operation.erasOperation, "procs =", j.operation.procedureTypes.map(p=>p.procedureId+":"+JSON.stringify(p.categories)).join(","));
  const cds = await req("POST",`/api/cds/app-launch/${encodeURIComponent(c.pmrn)}/${c.caseId}`,{timeZone:"America/New_York"},T);
  console.log("cds", cds.status);
  await login("admin","admin");
  const e = await req("POST","/api/admin/events/category-event",{sourceEventType:"PROCEDURE_END",eventCategories:["ERAS_OPERATION_END"],patientId:c.pmrn,caseId:c.caseId,date:new Date().toISOString()},T);
  console.log("erasEnd", e.status, e.body);
})();
