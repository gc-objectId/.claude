const {req,login}=require("./api");
const tenant=process.argv[2];
const uuid=process.argv[3];
const procs=process.argv.slice(4);
const T={"X-Tenant-Id":tenant};
(async()=>{
  await login("admin","admin",tenant);
  const op=await req("POST",`/api/admin/patients/${uuid}/operations/create`,{startTime:new Date().toISOString(),procedureTypes:procs.map(p=>({id:p,qualifier:null}))},T);
  const j=JSON.parse(op.body);
  console.log(op.status,"caseId",j.caseId,"procs",j.procedureTypes.map(p=>p.procedureId).join(","));
})();
