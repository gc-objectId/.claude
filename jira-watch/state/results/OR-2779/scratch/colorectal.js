const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
const fs=require("fs");
(async()=>{
  await login("admin","admin");
  const p = await req("POST","/api/admin/patients/",{prmnPrefix:"erasColo",firstName:"Eras",lastName:"erasColo",dob:"1975-05-05",gender:"FEMALE",genderIdentity:"FEMALE"},T);
  const pj = JSON.parse(p.body);
  const o = await req("POST",`/api/admin/patients/${pj.uuid}/operations/create`,{procedureTypes:[{id:"p-colorectal"}]},T);
  const oj = JSON.parse(o.body);
  console.log("created", pj.pmrn, oj.caseId, "erasOperation(admin-create) =", oj.erasOperation, JSON.stringify(oj.procedureTypes));
  fs.writeFileSync("colo.json", JSON.stringify({pmrn:pj.pmrn, caseId:oj.caseId},null,2));
})();
