const {Client}=require("./client.js");
const fs=require("fs");
const tpl=fs.readFileSync("/Users/ryanducharme/dev/worktrees/OR-2921-a-preop-doxycycline-check/mayo-client-integration/src/test/resources/hl7/rosmc-siu-s14-timing-in-room.hl7","utf8").replace(/\r?\n/g,"\r").split("\r").filter(Boolean);
function siu(pmrn, caseId, procs){
  const out=[];
  for(const seg of tpl){
    if(seg.startsWith("AIS|")||seg.startsWith("NTE|")) continue;
    if(seg.startsWith("PID|")){ out.push(seg.replace("11292545^^^MC^MC", pmrn+"^^^MC^MC")); continue; }
    if(seg.startsWith("SCH|")){ out.push(seg.replace("SCH||185211|","SCH||"+caseId+"|")); continue; }
    if(seg.startsWith("MSH|")){ out.push(seg.replace("|52520|","|"+caseId+"1|")); continue; }
    if(seg.startsWith("AIL|")){ procs.forEach((p,i)=>out.push(`AIS|${i+1}||${4000+i}^${p}|20260917113000|1200|S||S|||General^General`)); out.push(seg); continue; }
    out.push(seg);
  }
  return out.join("\r");
}
(async()=>{
  const a=new Client("mayo-mayo"); await a.login("admin","admin");
  let pmrn=process.argv[2];
  if(!pmrn){
    const p=await a.req("POST","/api/admin/patients/",{prmnPrefix:"or2921",firstName:"Doxy",lastName:"Validate",dob:"1990-01-01",gender:"FEMALE",genderIdentity:"FEMALE"});
    console.log("create patient",p.status,p.body); pmrn=JSON.parse(p.body).pmrn;
  }
  fs.writeFileSync(__dirname+"/pmrn.txt",pmrn);
  const cases={
    "92101":["DILATATION AND CURETTAGE"],
    "92102":["DILATATION AND CURETTAGE","HYSTERECTOMY TOTAL ABDOMINAL"],
    "92103":["DILATATION AND CURETTAGE","EXAMINATION UNDER ANESTHESIA GENITAL TRACT"],
    "92104":["DILATATION AND CURETTAGE","ZZZ UNKNOWN PROCEDURE OR2921"],
    "92105":["DILATATION AND CURETTAGE","HYSTERECTOMY TOTAL ABDOMINAL"],
    "92106":["HYSTERECTOMY TOTAL ABDOMINAL"],
  };
  for(const [caseId,procs] of Object.entries(cases)){
    const msg=siu(pmrn,caseId,procs);
    fs.writeFileSync(`${__dirname}/siu-${caseId}.hl7`,msg);
    const r=await a.req("POST","/api/admin/hl7-inbound-messages/send",{rawMessage:msg});
    console.log(caseId, r.status, r.body.replace(/\r/g," | ").slice(0,160));
  }
})();
