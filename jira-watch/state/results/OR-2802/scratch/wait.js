const http=require('http');
const deadline=Date.now()+240000;
function tick(){
  const r=http.get('http://localhost:50972/csrf',res=>{res.resume();
    if(res.statusCode<500){console.log('up',res.statusCode);return;}
    setTimeout(tick,3000);
  });
  r.on('error',()=>{ if(Date.now()>deadline){console.log('TIMEOUT');return;} setTimeout(tick,3000); });
}
tick();
