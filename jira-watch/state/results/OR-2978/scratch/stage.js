const {Session}=require("./api.js");
(async()=>{
  const a=new Session("mayo-mayo"); await a.login("admin","admin");
  const p=await a.req("POST","/api/admin/patients/",{prmnPrefix:"or2978",firstName:process.argv[3]||"Sulfa",lastName:"Allergic",dob:"1970-01-01",height:"170",weight:"70",gender:"MALE",genderIdentity:"MALE"});
  console.log("patient",p.status,JSON.stringify(p.body));
  const uuid=p.body.id||p.body.patientId||p.body.uuid; const pmrn=p.body.pmrn||p.body.prmn||p.body.patientMrn;
  const start=new Date(Date.now()+6*3600e3).toISOString();
  const o=await a.req("POST",`/api/admin/patients/${uuid}/operations/create`,{startTime:start,procedureTypes:[{id:"p-cystoscopy"}]});
  console.log("operation",o.status,JSON.stringify(o.body).slice(0,600));
  require("fs").writeFileSync(process.argv[2]||"ids.json",JSON.stringify({uuid,pmrn,caseId:o.body.caseId},null,1));
})().catch(e=>console.log("ERR",e));
