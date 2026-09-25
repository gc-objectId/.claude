const {req,login}=require("./cli.js");
const T={"X-Tenant-Id":"demo-demo"};
const c=require("./case.json");
// usage: node infuse.js <medicationId> <eventType>:<minutesAgo>[,<eventType>:<minutesAgo>...]
const med = process.argv[2]; const spec = process.argv[3] || "";
(async()=>{
  await login("admin","admin");
  const events = spec.split(",").filter(Boolean).map(s=>{ const [t,m]=s.split(":"); const d=new Date(Date.now()-Number(m)*60000);
    return t==="STOP" ? {eventType:t, eventDate:d.toISOString()} : {eventType:t, eventDate:d.toISOString(), rateAmount:"10", rateUnits:"mg/hr", doseAmount:"50", doseUnits:"mg"}; });
  const r = await req("POST",`/api/admin/infusion/patient/${encodeURIComponent(c.pmrn)}/${c.caseId}`,{medicationId:med, events, route:"INTRAVENOUS", concentrationOptionIndex:0},T);
  console.log("infuse", med, spec, r.status, r.body.slice(0,300));
})().catch(e=>{console.error(e);process.exit(1)});
