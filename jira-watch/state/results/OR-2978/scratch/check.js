const {Session}=require("./api.js");
const ids=require("./"+(process.argv[2]||"ids.json")); const MED=process.argv[3]||"m-cefazolin";
(async()=>{
  const a=new Session("mayo-mayo"); await a.login("admin","admin");
  const c=await a.req("GET",`/api/admin/patients/${encodeURIComponent(ids.pmrn)}/operations/${ids.caseId}/antibiotic-candidates`);
  const rec=(c.body.recommended||[]).map(r=>JSON.stringify(r.medicationCandidates?r.medicationCandidates.map(m=>m.medicationCategory):r));
  console.log("CANDIDATES",c.status,"outcome=",c.body.outcome,"recommended=",rec.join(" | "));
  const al=await a.req("GET",`/api/admin/patients/${encodeURIComponent(ids.pmrn)}/allergies`);
  console.log("ALLERGIES",al.status,JSON.stringify(al.body).slice(0,500));
  const u=new Session("mayo-mayo"); await u.login("loopuser","LoopValidate1!");
  const s=await u.req("POST",`/api/cds/medication-selection/${encodeURIComponent(ids.pmrn)}/${ids.caseId}`,{medicationIdentifier:MED,timeZone:"America/Chicago"});
  const results=(s.body.results||[]).map(r=>r.ruleId||r.ruleIdentifier);
  console.log("SELECTION",s.status,"rules fired=",JSON.stringify(results));
  const wrong=(s.body.results||[]).find(r=>(r.ruleId||r.ruleIdentifier)==="a-known-procedure-wrong-antibiotic");
  if(wrong) console.log("WRONG-ABX PROMPT:",JSON.stringify(wrong).slice(0,700));
  const nf=await a.req("GET",`/api/admin/rule/evaluations/not-fired?patientId=${encodeURIComponent(ids.pmrn)}&caseId=${ids.caseId}`);
  const mine=Array.isArray(nf.body)?nf.body.filter(x=>JSON.stringify(x).includes("wrong-antibiotic")).slice(-2):nf.body;
  console.log("NOT-FIRED(wrong-abx)",nf.status,JSON.stringify(mine).slice(0,600));
})().catch(e=>console.log("ERR",e));
