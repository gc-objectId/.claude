const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
const fs=require("fs");
const label = process.argv[2] || "erasRed";
(async()=>{
  await login("admin","admin");
  const p = await req("POST","/api/admin/patients/",{prmnPrefix:label,firstName:"Eras",lastName:label,dob:"1979-03-03",gender:"FEMALE",genderIdentity:"FEMALE"},T);
  const pj = JSON.parse(p.body);
  const o = await req("POST",`/api/admin/patients/${pj.uuid}/operations/create`,{procedureTypes:[{id:"p-hysterectomy"}]},T);
  const oj = JSON.parse(o.body);
  console.log("staged", pj.pmrn, oj.caseId, "adminCreate erasOperation =", oj.erasOperation);
  fs.writeFileSync(label+".json", JSON.stringify({pmrn:pj.pmrn, caseId:oj.caseId},null,2));
})();
