const http = require('http'); const fs = require('fs'); const qs = require('querystring');
const [,, jarPath, method, path, body] = process.argv;
const jar = fs.existsSync(jarPath) ? JSON.parse(fs.readFileSync(jarPath)) : {};
const headers = { Cookie: Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; ') };
let data;
if (body) { data = body; headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
if (jar['XSRF-TOKEN']) headers['X-XSRF-TOKEN'] = jar['XSRF-TOKEN'];
const r = http.request({ host: 'localhost', port: 50745, method, path, headers }, res => {
  (res.headers['set-cookie'] || []).forEach(c => { const [kv] = c.split(';'); const [k, v] = kv.split('='); if (v === '' ) delete jar[k]; else jar[k] = v; });
  fs.writeFileSync(jarPath, JSON.stringify(jar));
  let d = ''; res.on('data', c => d += c); res.on('end', () => console.log(res.statusCode, (d || '').slice(0, 300)));
});
if (data) r.write(data); r.end();
