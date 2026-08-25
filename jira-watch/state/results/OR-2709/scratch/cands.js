const {req,login}=require("./api");
const tenant=process.argv[2]||"mayo-mayo";
const pmrn=process.argv[3];
const caseId=process.argv[4];
const T={"X-Tenant-Id":tenant};
(async()=>{
  await login("admin","admin",tenant);
  const r=await req("GET",`/api/admin/patients/${encodeURIComponent(pmrn)}/operations/${caseId}/antibiotic-candidates`,null,T);
  console.log(r.status,r.body);
})();
