const {req,login}=require("./api");
const T={"X-Tenant-Id":"mayo-mayo"};
const pmrn="or2709-fake-de45cf6a-d057-4134-a6af-712d3ce69825";
(async()=>{
  await login("admin","admin","mayo-mayo");
  const r=await req("POST",`/api/admin/patients/${encodeURIComponent(pmrn)}/allergies?caseId=26669&type=ALLERGEN&identifier=a-piperacillin&reaction=ANAPHYLAXIS`,"",T);
  console.log("allergy",r.status,r.body.slice(0,400));
})();
