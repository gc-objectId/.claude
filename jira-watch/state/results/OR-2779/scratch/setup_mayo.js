const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"mayo-mayo"};
(async()=>{
  await login("admin","admin");
  const mk = async (procs, label) => {
    const p = await req("POST","/api/admin/patients/",{prmnPrefix:label,firstName:"Eras",lastName:label,dob:"1980-01-01",gender:"FEMALE",genderIdentity:"FEMALE"},T);
    const pj = JSON.parse(p.body);
    const o = await req("POST",`/api/admin/patients/${pj.uuid}/operations/create`,{procedureTypes:procs.map(id=>({id}))},T);
    console.log(label, p.status, "| op:", o.status, o.body.slice(0,120));
  };
  await mk(["p-colectomy"],"mayoColectomy");
  await mk(["p-arthroplasty-knee"],"mayoKnee");
  await mk(["p-cholecystectomy"],"mayoChole");
  await mk(["p-cholecystectomy","p-spinal-fusion"],"mayoMixed");
})();
