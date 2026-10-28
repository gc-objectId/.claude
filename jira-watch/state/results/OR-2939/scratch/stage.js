const fs=require("fs");const {req,login}=require("./api.js");
const T={"X-Tenant-Id":"demo-demo"};
(async()=>{
  console.log("login",(await login()).status);
  const p=await req("POST","/api/admin/patients/",{prmnPrefix:"or2939",firstName:"Mrsa",lastName:"Positive",dob:"1980-01-01",height:"180 cm",weight:"80 kg",gender:"MALE",genderIdentity:"MALE"},T);
  console.log("patient",p.status,JSON.stringify(p.body));
  const {pmrn,uuid}=p.body;
  const op=await req("POST",`/api/admin/patients/${uuid}/operations/create`,{startTime:new Date().toISOString(),procedureTypes:[{id:"p-gastroduodenal",qualifier:null}]},T);
  console.log("operation",op.status,JSON.stringify(op.body).slice(0,300));
  const caseId=op.body.caseId;
  const obs=await req("POST",`/api/admin/observations/patient/${pmrn}/case/${caseId}`,{type:"MRSA_INFECTION",value:"MRSA POSITIVE",units:null,date:new Date(Date.now()-24*3600e3).toISOString()},T);
  console.log("observation",obs.status,JSON.stringify(obs.body));
  fs.writeFileSync("ids.json",JSON.stringify({pmrn,uuid,caseId}));
})().catch(e=>console.log("ERR",e));
