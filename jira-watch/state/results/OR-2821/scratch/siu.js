const {req,login}=require("./client");
const {execSync}=require("child_process");
const fs=require("fs");
const T="mayo-mayo";
const sql = q => execSync(`docker exec orci-loop-or-2821-postgres-1 psql -U orci -d orci -tAc ${JSON.stringify(q)}`).toString().trim();
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const pmrn = sql(`select pmrn from "mayo-mayo".patients where pmrn like 'or2821red-fake-%' limit 1`);
const base = fs.readFileSync("siu.hl7","utf8").split(/\r?\n/).filter(Boolean);
const caseId = "77" + String(Date.now()).slice(-4);
function build(pv14) {
  return base.map(l => {
    if (l.startsWith("SCH|")) { const f=l.split("|"); f[2]=caseId; return f.join("|"); }
    if (l.startsWith("PID|")) { const f=l.split("|"); f[3]=`${pmrn}^^^MC^MC`; return f.join("|"); }
    if (l.startsWith("PV1|")) { const f=l.split("|"); f[4]=pv14; return f.join("|"); }
    return l;
  }).join("\r");
}
(async()=>{
  await login();
  console.log("pmrn",pmrn,"caseId",caseId);
  for (const pv14 of ["Urg","Elec","","Bogus-Acuity"]) {
    const r=await req("POST","/api/admin/hl7-inbound-messages/send",{tenant:T,body:{rawMessage:build(pv14)}});
    const ack = typeof r.body==="string"? r.body : JSON.stringify(r.body);
    console.log(`\nSIU PV1-4='${pv14}' ->`,r.status, ack.replace(/\r/g," ").slice(0,160));
    let row=""; for (let i=0;i<20;i++){ await sleep(1000); row=sql(`select case_id||' acuity='||coalesce(acuity,'<NULL>')||' room='||coalesce(operating_room_name,'') from "mayo-mayo".operations where case_id='${caseId}'`); if(row) break; }
    console.log(" db:",row||"<no row>");
  }
  console.log("\n--- log lines for case",caseId);
  console.log(execSync(`docker logs orci-loop-or-2821-orci-1 2>&1 | grep -E 'caseId=${caseId}|Unmapped SIU case acuity|skipping' | cut -c1-240 | tail -12`).toString());
})().catch(e=>console.error("ERR",e));
