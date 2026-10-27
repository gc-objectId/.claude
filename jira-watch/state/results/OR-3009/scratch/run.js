const {req,login,T}=require("./client.js");
const { execSync } = require("child_process");
const RULES = ["a-acetaminophen-max-dose-scan","w-acetaminophen-max-dose","a-acetaminophen-max-dose-save","a-acetaminophen-early-redose"];
function evict(){ try { return execSync(`docker exec orci-loop-or-3009-redis-1 sh -c "valkey-cli -a 'g76!s4z' --no-auth-warning --scan --pattern '*atient*' | xargs -r valkey-cli -a 'g76!s4z' --no-auth-warning del"`).toString().trim(); } catch(e){ return "evict-err "+e.message; } }
async function main(){
  const [label, offsetMin, doseMg, nextDoseMg] = process.argv.slice(2);
  const a=await login("admin","admin");
  const p=await req(a,"POST","/api/admin/patients/",{prmnPrefix:"or3009-"+label,dob:"1980-01-01",weight:"80 kg",height:"180 cm",firstName:label,lastName:"Validate"},T);
  const op=await req(a,"POST","/api/admin/patients/"+p.body.uuid+"/operations/create",{startTime:new Date().toISOString(),procedureTypes:[{id:"p-angiogram-arm",qualifier:null}]},T);
  const pmrn=p.body.pmrn, caseId=op.body.caseId;
  const adminDate=new Date(Date.now()-Number(offsetMin)*60000);
  const b=await req(a,"POST","/api/admin/bolus/patient/"+pmrn+"/"+caseId,{medicationId:"m-acetaminophen-iv",administrationDate:adminDate.toISOString(),doseAmount:String(doseMg),doseUnits:"mg",route:"INTRAVENOUS",concentrationOptionIndex:0},T);
  const ma=await req(a,"GET","/api/admin/patients/"+pmrn+"/operations/"+caseId+"/medication-administrations",null,T);
  console.log(JSON.stringify({label,pmrn,caseId,patientUuid:p.body.uuid,operationId:op.body.operationId,bolusStatus:b.status,priorAdmin:(ma.body||[]).map(m=>({id:m.medicationIdentifier,dose:m.doseAmount,units:m.doseUnits,at:m.administrationDate}))}));
  console.log("evicted:", evict());
  const u=await login("loopuser","LoopValidate1!");
  const evalAt=new Date();
  const sel=await req(u,"POST","/api/cds/medication-selection/"+pmrn+"/"+caseId,{medicationIdentifier:"m-acetaminophen-iv",timeZone:"UTC",isReselection:false},T);
  const selRes=(sel.body.results||[]).filter(r=>RULES.includes(r.ruleId)).map(r=>({ruleId:r.ruleId,needsAction:r.needsAction,explanation:r.explanation,cumulative:r.details&&r.details.CUMULATIVE_24_HOUR_DOSE_MG,max:r.details&&r.details.MAX_24_HOUR_DOSE_MG,title:r.prompt&&r.prompt.title,desc:r.prompt&&r.prompt.description}));
  console.log("evaluatedAt",evalAt.toISOString(),"offsetFromPriorAdmin(min)",((evalAt-adminDate)/60000).toFixed(1));
  console.log("SELECTION",sel.status,JSON.stringify(selRes,null,1));
  console.log("selection keys",Object.keys(sel.body).join(","),"trackingTabId",sel.body.trackingTabId);
  const n=evalAt;
  const dose=await req(u,"POST","/api/cds/medication-dose/"+pmrn+"/"+caseId,{medicationIdentifier:"m-acetaminophen-iv",doseAmount:Number(nextDoseMg||1000),doseUnits:"mg",route:"INTRAVENOUS",concentrations:[{rawAmount:"10",unit:"mg/mL",amount:10}],adminYear:n.getUTCFullYear(),adminMonth:n.getUTCMonth()+1,adminDay:n.getUTCDate(),adminHours:n.getUTCHours(),adminMinutes:n.getUTCMinutes(),timeZone:"UTC",trackingTabId:sel.body.trackingTabId},T);
  console.log("DOSE",dose.status,dose.status>=400?dose.raw.slice(0,500):JSON.stringify((dose.body.alerts||[]).map(x=>({ruleId:x.ruleIdentifier||x.ruleId,title:x.title,desc:x.description})),null,1));
}
main().catch(e=>{console.log("ERR",e);process.exit(1);});
