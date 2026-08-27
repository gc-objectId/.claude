const {req,login}=require("./cli.js");
(async()=>{
  for (let i=0;i<90;i++){
    try {
      const l = await login("admin","admin");
      if (l.status===200) { console.log("UP after",i,"tries"); return; }
    } catch(e) {}
    await new Promise(r=>setTimeout(r,3000));
  }
  console.log("TIMEOUT");
})();
