const http=require("http");
let n=0;
const tick=()=>{ n++;
 const r=http.get({host:"127.0.0.1",port:60489,path:"/actuator/health"},res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{
   if(res.statusCode===200){console.log("UP after",n,"tries",d);process.exit(0);} else if(n<80) setTimeout(tick,3000); else {console.log("not up",res.statusCode,d);process.exit(1);}
 });});
 r.on("error",()=>{ if(n<80) setTimeout(tick,3000); else {console.log("no connect");process.exit(1);} });
};
tick();
