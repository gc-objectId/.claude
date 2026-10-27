const http = require('http');
const [,, path, body, portArg] = process.argv;
const port = portArg || 64811;
const payload = body || '';
const req = http.request({host:'localhost', port, path, method:'POST', headers:{'Content-Type':'application/xml','Content-Length':Buffer.byteLength(payload)}}, res => {
  let d=''; res.on('data', c=>d+=c); res.on('end', ()=>console.log(path, '->', res.statusCode, JSON.stringify(d).slice(0,300)));
});
req.on('error', e=>console.log(path, 'ERR', e.message));
req.end(payload);
