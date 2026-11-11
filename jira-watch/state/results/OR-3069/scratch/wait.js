const http=require("http");
const t0=Date.now();
function tick(){ const r=http.get("http://127.0.0.1:55164/actuator/health/readiness",res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{ if(res.statusCode===200&&/UP/.test(d)){console.log("READY after",Math.round((Date.now()-t0)/1000),"s");process.exit(0);} else setTimeout(tick,3000);});}); r.on("error",()=>setTimeout(tick,3000)); r.setTimeout(3000,()=>{r.destroy();}); }
setTimeout(()=>{console.log("TIMEOUT waiting for readiness");process.exit(1)},240000); tick();
