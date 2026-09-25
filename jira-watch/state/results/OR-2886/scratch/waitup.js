const http=require("http");
const t0=Date.now();
function poll(){ const r=http.get("http://127.0.0.1:51486/actuator/health/readiness",res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{ if(res.statusCode===200){console.log("UP after",Math.round((Date.now()-t0)/1000),"s",d);} else if(Date.now()-t0>240000){console.log("TIMEOUT",res.statusCode,d);process.exit(1);} else setTimeout(poll,3000);});});
 r.on("error",()=>{ if(Date.now()-t0>240000){console.log("TIMEOUT err");process.exit(1);} else setTimeout(poll,3000);}); }
poll();
