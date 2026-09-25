const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
(async()=>{
  const l = await login("admin","admin"); console.log("admin login", l.status);
  const p = await req("POST","/api/admin/patients/",{prmnPrefix:"or2886",firstName:"Sug",lastName:"Null",dob:"1980-01-01",gender:"MALE",genderIdentity:"MALE",weight:"80 kg",height:"180 cm"},T);
  console.log("patient", p.status, p.body.slice(0,300));
  const pj = JSON.parse(p.body);
  const o = await req("POST",`/api/admin/patients/${pj.uuid}/operations/create`,{procedureTypes:[{id:"p-appendectomy"}]},T);
  console.log("op", o.status, o.body.slice(0,400));
  const oj = JSON.parse(o.body);
  require("fs").writeFileSync("case.json", JSON.stringify({pmrn:pj.pmrn, uuid:pj.uuid, caseId:oj.caseId},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
