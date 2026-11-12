const {req,login}=require("./client");
const {execSync}=require("child_process");
const T="mayo-mayo";
const sql = q => execSync(`docker exec orci-loop-or-2821-postgres-1 psql -U orci -d orci -tAc ${JSON.stringify(q)}`).toString().trim();
const drugs = r => (r.body.recommended||[]).flatMap(s=>s.medicationCandidates.map(m=>m.medicationCategory)).join("+");
const logCount = sig => execSync(`docker logs orci-loop-or-2821-orci-1 2>&1 | grep -c -F ${JSON.stringify(sig)} || true`).toString().trim();
(async()=>{
  await login();
  const p=await req("POST","/api/admin/patients/",{tenant:T,body:{prmnPrefix:"or2821red",dob:"1992-01-01",gender:"FEMALE",genderIdentity:"FEMALE"}});
  const {pmrn,uuid}=p.body;
  const op=await req("POST",`/api/admin/patients/${uuid}/operations/create`,{tenant:T,body:{startTime:new Date().toISOString(),procedureTypes:[{id:"p-cesarean-delivery"}]}});
  const caseId=op.body.caseId, opId=op.body.operationId;
  console.log("case",caseId,"operation",opId);
  const SIG=`Operation ${opId} matched no antibiotic pathway for p-cesarean-delivery: 2 configured, procedure risk LOW case acuity NON_URGENT`;
  const cand = () => req("GET",`/api/admin/patients/${pmrn}/operations/${caseId}/antibiotic-candidates`,{tenant:T});
  const dbRow = () => sql(`select acuity from "mayo-mayo".operations where case_id='${caseId}'`);

  console.log("\n[baseline] PATCH acuity EMERGENT");
  const r1=await req("PATCH",`/api/admin/patients/${pmrn}/operations/${caseId}/acuity`,{tenant:T,body:{acuity:"EMERGENT"}});
  console.log(" PATCH",r1.status,"dto.acuity=",r1.body.acuity,"| db.acuity=",dbRow());
  let c=await cand(); console.log(" resolve:",c.body.outcome,drugs(c),"| sig count:",logCount(SIG));

  console.log("\n[FLIP] SQL UPDATE operations.acuity='NON_URGENT' (bypasses the endpoint)");
  console.log(" ",sql(`update "mayo-mayo".operations set acuity='NON_URGENT' where case_id='${caseId}'`),"| db.acuity=",dbRow());
  c=await cand(); console.log(" resolve:",c.body.outcome,"recommended=",JSON.stringify(c.body.recommended),"| sig count:",logCount(SIG));
  const ops=await req("GET",`/api/admin/patients/${uuid}/operations`,{tenant:T}); console.log(" GET operations dto.acuity=",(Array.isArray(ops.body)?ops.body:ops.body.content||[]).map(o=>o.acuity));

  console.log("\n[REVERT] SQL UPDATE operations.acuity='EMERGENT'");
  console.log(" ",sql(`update "mayo-mayo".operations set acuity='EMERGENT' where case_id='${caseId}'`),"| db.acuity=",dbRow());
  c=await cand(); console.log(" resolve:",c.body.outcome,drugs(c),"| sig count (unchanged expected):",logCount(SIG));

  console.log("\n[clear] PATCH acuity null");
  const r2=await req("PATCH",`/api/admin/patients/${pmrn}/operations/${caseId}/acuity`,{tenant:T,body:{acuity:null}});
  console.log(" PATCH",r2.status,"dto.acuity=",r2.body.acuity,"| db.acuity=",JSON.stringify(dbRow()),"| is null:",sql(`select acuity is null from "mayo-mayo".operations where case_id='${caseId}'`));
  c=await cand(); console.log(" resolve:",c.body.outcome);
  console.log("\n[invalid] PATCH acuity SEMI_URGENT_OR2821 after setting URGENT");
  await req("PATCH",`/api/admin/patients/${pmrn}/operations/${caseId}/acuity`,{tenant:T,body:{acuity:"URGENT"}});
  const bad=await req("PATCH",`/api/admin/patients/${pmrn}/operations/${caseId}/acuity`,{tenant:T,body:{acuity:"SEMI_URGENT_OR2821"}});
  console.log(" PATCH",bad.status,bad.body.message,"| db.acuity=",dbRow());
  console.log("\nSIG=",SIG);
})().catch(e=>console.error("ERR",e));
