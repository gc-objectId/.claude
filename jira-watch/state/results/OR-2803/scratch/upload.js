const c = require('./client'); const fs=require('fs');
const T={'X-Tenant-Id':'mayo-mayo'};
const file = process.argv[2];
(async()=>{
  await c.login('admin','admin'); await c.req('GET','/api/csrf',undefined,T);
  const boundary='----orciBoundary'+Date.now();
  const content = fs.readFileSync(file);
  const pre = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="antibiotic-pathways.csv"\r\nContent-Type: text/csv\r\n\r\n`);
  const post = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([pre, content, post]);
  const r = await c.req('POST','/api/admin/config-imports/antibiotic-pathways/upload', body,
    Object.assign({'Content-Type':`multipart/form-data; boundary=${boundary}`,'X-XSRF-TOKEN':c.xsrf()}, T));
  console.log(r.status, r.body.slice(0,1500));
})();
