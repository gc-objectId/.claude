const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
const cases=require("./cases.json");
(async()=>{
  await login("admin","admin");
  for (const [label,c] of Object.entries(cases)) {
    const caseId = JSON.parse(c.op).caseId;
    const r = await req("POST","/api/admin/events/category-event",{sourceEventType:"PROCEDURE_END",eventCategories:["ERAS_OPERATION_END"],patientId:c.pmrn,caseId,date:new Date().toISOString()},T);
    console.log("erasEnd",label,caseId,r.status,r.body.slice(0,200));
  }
})();
