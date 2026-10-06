const {Session}=require("./api.js");
const [,, idsFile, type, code, reaction="Hives"]=process.argv;
const ids=require("./"+idsFile);
(async()=>{
  const a=new Session("mayo-mayo"); await a.login("admin","admin");
  const r=await a.req("POST",`/api/admin/patients/${encodeURIComponent(ids.pmrn)}/allergies?caseId=${ids.caseId}&type=${type}&identifier=${code}&reaction=${encodeURIComponent(reaction)}`);
  console.log("ADD ALLERGY",type,code,r.status,JSON.stringify(r.body).slice(0,300));
})().catch(e=>console.log("ERR",e));
