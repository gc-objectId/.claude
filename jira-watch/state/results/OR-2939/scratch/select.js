const {req,login}=require("./api.js");const ids=require("./ids.json");
const T={"X-Tenant-Id":"demo-demo"};
(async()=>{
  const user=process.argv[2]||"loopuser", pass=process.argv[3]||"LoopValidate1!";
  console.log("login",user,(await login(user,pass)).status);
  const c=await req("GET",`/api/admin/patients/${ids.pmrn}/operations/${ids.caseId}/antibiotic-candidates`,null,T);
  console.log("candidates",c.status,JSON.stringify(c.body).slice(0,1500));
  const s=await req("POST",`/api/cds/medication-selection/${ids.pmrn}/${ids.caseId}`,{medicationIdentifier:"m-cefazolin",timeZone:"America/New_York"},T);
  console.log("selection",s.status);
  const results=(s.body&&s.body.results)||[];
  console.log("results ruleIds:",results.map(r=>r.ruleId||r.ruleIdentifier));
  console.log("mrsa results:",JSON.stringify(results.filter(r=>/mrsa/i.test(JSON.stringify(r)))).slice(0,2000));
  console.log("body keys:",Object.keys(s.body||{}), JSON.stringify(s.body).slice(0,800));
})().catch(e=>console.log("ERR",e));
