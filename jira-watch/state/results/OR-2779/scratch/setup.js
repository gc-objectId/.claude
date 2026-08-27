const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
(async()=>{
  await login("admin","admin");
  const mk = async (proc, label) => {
    const p = await req("POST","/api/admin/patients/",{prmnPrefix:label,firstName:"Eras",lastName:label,dob:"1980-01-01",gender:"FEMALE",genderIdentity:"FEMALE"},T);
    const pj = JSON.parse(p.body);
    const o = await req("POST",`/api/admin/patients/${pj.uuid}/operations/create`,{procedureTypes:[{id:proc}]},T);
    console.log(label, p.status, pj.pmrn, "| op:", o.status, o.body.slice(0,400));
    return {pmrn: pj.pmrn, uuid: pj.uuid, op: o.body};
  };
  const a = await mk("p-hysterectomy","erasPos");
  const b = await mk("p-appendectomy","erasNeg");
  require("fs").writeFileSync("cases.json", JSON.stringify({a,b},null,2));
})();
