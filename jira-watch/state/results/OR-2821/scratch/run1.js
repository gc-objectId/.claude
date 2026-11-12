const {req,login}=require("./client");
const T="mayo-mayo";
const drugs = r => (r.body.recommended||[]).map(x=>JSON.stringify(x)).join(" | ");
(async()=>{
  await login();
  const p=await req("POST","/api/admin/patients/",{tenant:T,body:{prmnPrefix:"or2821",firstName:"Acuity",lastName:"Check",dob:"1990-01-01",gender:"FEMALE",genderIdentity:"FEMALE"}});
  console.log("create patient",p.status,JSON.stringify(p.body));
  const {pmrn,uuid}=p.body;
  const op=await req("POST",`/api/admin/patients/${uuid}/operations/create`,{tenant:T,body:{startTime:new Date().toISOString(),procedureTypes:[{id:"p-cesarean-delivery"}]}});
  console.log("create op",op.status,JSON.stringify(op.body).slice(0,600));
  const caseId=op.body.caseId;
  console.log("IDS",pmrn,uuid,caseId);
  const base=await req("GET",`/api/admin/patients/${pmrn}/operations/${caseId}/antibiotic-candidates`,{tenant:T});
  console.log("candidates(null acuity)",base.status,"outcome=",base.body.outcome,"recommended=",drugs(base));
  for (const a of ["EMERGENT","ELECTIVE","URGENT","NON_URGENT"]) {
    const r=await req("PATCH",`/api/admin/patients/${pmrn}/operations/${caseId}/acuity`,{tenant:T,body:{acuity:a}});
    console.log("PATCH",a,r.status,"dto.acuity=",r.body.acuity, "dto.classification=",r.body.classification);
    const c=await req("GET",`/api/admin/patients/${pmrn}/operations/${caseId}/antibiotic-candidates`,{tenant:T});
    console.log("  candidates",c.status,"outcome=",c.body.outcome,"recommended=",drugs(c));
  }
  console.log("--- negatives");
  const bad=await req("PATCH",`/api/admin/patients/${pmrn}/operations/${caseId}/acuity`,{tenant:T,body:{acuity:"SEMI_URGENT_OR2821"}});
  console.log("PATCH invalid",bad.status,JSON.stringify(bad.body).slice(0,300));
  const old=await req("PATCH",`/api/admin/patients/${pmrn}/operations/${caseId}/classification`,{tenant:T,body:{classification:"ELECTIVE"}});
  console.log("PATCH old /classification route",old.status,JSON.stringify(old.body).slice(0,200));
  const after=await req("GET",`/api/admin/patients/${pmrn}/operations`,{tenant:T});
  console.log("GET ops after negatives: acuity=",after.body.map(o=>o.acuity));
  const clr=await req("PATCH",`/api/admin/patients/${pmrn}/operations/${caseId}/acuity`,{tenant:T,body:{acuity:null}});
  console.log("PATCH null",clr.status,"dto.acuity=",clr.body.acuity);
  const c2=await req("GET",`/api/admin/patients/${pmrn}/operations/${caseId}/antibiotic-candidates`,{tenant:T});
  console.log("  candidates after clear outcome=",c2.body.outcome,"recommended=",drugs(c2));
})().catch(e=>console.error("ERR",e));
