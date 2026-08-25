const http=require("http");
const deadline=Date.now()+240000;
function tick(){
  const r=http.get({host:"127.0.0.1",port:62666,path:"/actuator/health"},res=>{
    let d="";res.on("data",c=>d+=c);res.on("end",()=>{
      if(res.statusCode===200&&d.includes("UP")){console.log("UP",d.slice(0,80));process.exit(0);}
      else if(Date.now()<deadline) setTimeout(tick,3000); else {console.log("TIMEOUT",res.statusCode,d.slice(0,120));process.exit(1);}
    });
  });
  r.on("error",()=>{ if(Date.now()<deadline) setTimeout(tick,3000); else {console.log("TIMEOUT err");process.exit(1);} });
}
tick();
