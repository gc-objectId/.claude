const {req,login}=require("./api");
const T={"X-Tenant-Id":"mayo-mayo"};
(async()=>{
  await login("admin","admin","mayo-mayo");
  const p=await req("POST","/api/admin/patients/",{prmnPrefix:"or2709",firstName:"Combo",lastName:"Test",dob:"1970-01-01",height:"180 cm",weight:"80 kg",gender:"MALE",genderIdentity:"MALE"},T);
  console.log("patient",p.status,p.body);
  const {pmrn,uuid}=JSON.parse(p.body);
  const now=new Date().toISOString();
  const op=await req("POST",`/api/admin/patients/${uuid}/operations/create`,{startTime:now,procedureTypes:[{id:"p-pancreatectomy",qualifier:null},{id:"p-biliary-stent-placement",qualifier:null}]},T);
  console.log("op",op.status,op.body);
})();
