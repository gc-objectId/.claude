const {req,login}=require(process.argv[2]);
const tag=process.argv[3]||"run";
(async()=>{
  const l=await login("admin","admin"); console.log("admin login",l.status);
  let tok=await req("GET","/api/admin/tokens/tenant/demo-demo");
  let list=JSON.parse(tok.body);
  let token=list.find(t=>t.label==="or2964-loop");
  if(!token){ const c=await req("POST","/api/admin/tokens/tenant/demo-demo",{body:{label:"or2964-loop"}}); console.log("create token",c.status,c.body.slice(0,200)); token=JSON.parse(c.body);}
  const tokenString=token.token||token.tokenString||token.value; console.log("token keys",Object.keys(token).join(","));
  const bsm=await req("POST","/api/bsm/logs",{headers:{"X-API-Key":tokenString},body:{logs:[{timestamp:"2026-10-05T12:00:00",machine_name:"loop-or2964-"+tag,message:"OR-2964 "+tag+" write",windows_username:"loop"}]}});
  console.log("BSM POST",bsm.status,JSON.stringify(bsm.body.slice(0,200)));
  const p=await req("POST","/api/admin/patients/",{tenant:"demo-demo",body:{prmnPrefix:"or2964"+tag,firstName:"Envers",lastName:tag}});
  console.log("create patient",p.status,p.body.slice(0,300));
  if(p.status===200){ const pj=JSON.parse(p.body); const uuid=pj.patientUuid||pj.patientUUID||pj.uuid||(pj.patientId&&pj.patientId.value); console.log("patient json",p.body);
    const puuid=(typeof uuid==="object"&&uuid)?uuid.value:uuid;
    const o=await req("POST",`/api/admin/patients/${puuid}/operations/create`,{tenant:"demo-demo",body:{startTime:new Date().toISOString(),procedureTypes:[]}});
    console.log("create operation",o.status,o.body.slice(0,300));
    const pm=(typeof pj.pmrn==="object")?pj.pmrn.value:pj.pmrn;
    const g=await req("GET",`/api/admin/patients/by-pmrn/${encodeURIComponent(pm)}/operations`,{tenant:"demo-demo"});
    console.log("GET operations by pmrn",g.status,g.body.slice(0,300));
  }
})().catch(e=>{console.error(e);process.exit(1)});
