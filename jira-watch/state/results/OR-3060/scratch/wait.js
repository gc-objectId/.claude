const http=require("http");
const deadline=Date.now()+240000;
(function poll(){ const req=http.get("http://127.0.0.1:56531/actuator/health/readiness",res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{ if(res.statusCode===200&&d.includes('"UP"')){console.log("READY",d);process.exit(0);} retry();});}); req.on("error",retry); req.setTimeout(3000,()=>{req.destroy();}); function retry(){ if(Date.now()>deadline){console.log("TIMEOUT");process.exit(1);} setTimeout(poll,2000);} })();
