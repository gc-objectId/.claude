const http = require('http');
function once() { return new Promise(r => {
  const req = http.request({host:'localhost',port:62476,path:'/api/server-info',method:'GET'}, res => { res.resume(); r(res.statusCode); });
  req.on('error',()=>r(0)); req.setTimeout(3000,()=>{req.destroy(); r(0);}); req.end();
});}
(async () => {
  for (let i=0;i<120;i++) { const s = await once(); if (s && s !== 0) { console.log('up after', i, 'status', s); return; } await new Promise(r=>setTimeout(r,2000)); }
  console.log('TIMEOUT');
})();
