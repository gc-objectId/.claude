const http = require('http');
const [,, path, method='GET'] = process.argv;
const req = http.request({host:'localhost', port:53217, path, method}, res => {
  console.log(method, path, '->', res.statusCode);
  for (const h of ['cache-control','content-type','content-length','last-modified','etag','expires','pragma']) if (res.headers[h]) console.log('  '+h+': '+res.headers[h]);
  let n=0; res.on('data', d=>n+=d.length); res.on('end', ()=>console.log('  bytes:', n));
});
req.on('error', e=>console.log('ERR', e.message)); req.end();
