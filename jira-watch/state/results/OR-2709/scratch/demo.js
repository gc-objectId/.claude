const {req,login}=require("./api");
const T={"X-Tenant-Id":"demo-demo"};
(async()=>{
  await login("admin","admin","demo-demo");
  const p=await req("POST","/api/admin/patients/",{prmnPrefix:"or2709demo",firstName:"Combo",lastName:"Demo",dob:"1970-01-01",height:"180 cm",weight:"80 kg",gender:"MALE",genderIdentity:"MALE"},T);
  const {pmrn,uuid}=JSON.parse(p.body);
  console.log("patient",p.status,pmrn);
  const op=await req("POST",`/api/admin/patients/${uuid}/operations/create`,{startTime:new Date().toISOString(),procedureTypes:[{id:"p-pancreatectomy",qualifier:null},{id:"p-biliary-stent-placement",qualifier:null}]},T);
  const j=JSON.parse(op.body);
  console.log("op",op.status,j.caseId,j.procedureTypes.map(x=>x.procedureId).join(","),"opId",j.operationId);
  const r=await req("GET",`/api/admin/patients/${encodeURIComponent(pmrn)}/operations/${j.caseId}/antibiotic-candidates`,null,T);
  console.log("candidates",r.status,r.body);
})();
