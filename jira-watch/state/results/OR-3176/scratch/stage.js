const {request,login,tenant}=require("./api.js");
const [last]=process.argv.slice(2);
(async()=>{
  await login("admin","admin"); const T=tenant("mayo-mayo");
  const p=await request("POST","/api/admin/patients/",{prmnPrefix:"or3176",firstName:"Early",lastName:last,dob:"1980-01-01",weight:"80 kg",height:"180 cm",gender:"FEMALE",genderIdentity:"FEMALE"},T);
  const o=await request("POST",`/api/admin/patients/${p.body.uuid}/operations/create`,{startTime:new Date(Date.now()-30*60*1000).toISOString(),procedureTypes:[{id:"p-appendectomy",qualifier:null}]},T);
  console.log(JSON.stringify({pmrn:p.body.pmrn,uuid:p.body.uuid,op:o.body.operationId,caseId:o.body.caseId}));
})().catch(e=>console.log("ERR",e));
