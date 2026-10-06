const http=require("http");
const start=Date.now();
(function poll(){
  const r=http.get("http://localhost:62901/actuator/health/readiness",res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{ if(res.statusCode===200&&/UP/.test(d)){console.log("READY after",Math.round((Date.now()-start)/1000),"s");process.exit(0);} else setTimeout(poll,3000);});});
  r.on("error",()=>{ if(Date.now()-start>560000){console.log("TIMEOUT");process.exit(2);} setTimeout(poll,3000);});
})();
