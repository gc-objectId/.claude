const {Client}=require("./client.js"); const fs=require("fs");
const pmrn=fs.readFileSync(__dirname+"/pmrn.txt","utf8").trim();
(async()=>{
  const u=new Client("mayo-mayo"); await u.login("loopuser","LoopValidate1!");
  for(const caseId of process.argv.slice(2)){
    const r=await u.req("POST",`/api/cds/app-launch/${encodeURIComponent(pmrn)}/${caseId}`,{timeZone:"America/Chicago"});
    let alerts="?"; try{ const j=JSON.parse(r.body); alerts=JSON.stringify((j.alerts||[]).map(a=>({rule:a.ruleIdentifier||a.ruleId||a.id,title:a.title}))); }catch(e){ alerts=r.body.slice(0,300); }
    console.log(caseId, r.status, alerts);
  }
})();
