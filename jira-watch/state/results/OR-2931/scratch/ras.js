const {request,login}=require("./http.js");
const [amount, unit, seq, orderId, tsArg] = process.argv.slice(2);
const pmrn = "99lipid-fake-80436b9b-1073-4574-83ce-133aefd12e33";
function hl7ts(d){ // Chicago wall clock (UTC-5 in September)
  const c=new Date(d.getTime()-5*3600*1000); const p=n=>String(n).padStart(2,'0');
  return `${c.getUTCFullYear()}${p(c.getUTCMonth()+1)}${p(c.getUTCDate())}${p(c.getUTCHours())}${p(c.getUTCMinutes())}${p(c.getUTCSeconds())}`; }
const ts = tsArg || hl7ts(new Date(Date.now()-2*60*1000));
const msg = [
 `MSH|^~\\&|EPIC^RAS_GENERIC|RORMC|RST||${ts}|1395|RAS^O17|${Date.now()}|P|2.5.1`,
 `PID|||${pmrn}^^^MC^MC||TEST^LIPID||19800101|F`,
 `PV1||IP|ROEI93^REI9302^302-P^RORMC^^^^^RST ROEI 09 3^^DEPID||||11036541^NYMAN^MARK^A^^^^^PERID^^^^PERID`,
 `ORC|RE|${orderId}^EPC|||||^Once^^${ts}^^R||${ts}|1458^MAYO IP AMB^PHYSICIAN^^||11036541^NYMAN^MARK^A^^^^^PERID^^^^PERID`,
 `RXA|0|${seq}|${ts}||40840090^FAT EMULSION 20 % IV INJECTION (ANESTHESIA TOXICITY)^ERX|${amount}|${unit}|||15573354^STERRETT^FAHREN^E^^^^^PERID^^^^PERID|ROEI93|||||||||Given||${ts}`,
 `RXR|IV^intravenous`,
].join("\r");
(async()=>{ await login("admin","admin");
 const r=await request("POST","/api/admin/hl7-inbound-messages/send",{tenant:"mayo-mayo", body:{rawMessage:msg}});
 console.log("send", r.status, r.body.replace(/\r/g,"\n").slice(0,400));
})().catch(e=>console.log("ERR",e));
