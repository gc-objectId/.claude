const http = require('http');
const fs = require('fs');
const E = process.env;
const BASE = { host: 'localhost', port: 55752 };
const JAR = E.JAR || '/tmp/or2776-cookies.json';

function loadJar() { try { return JSON.parse(fs.readFileSync(JAR, 'utf8')); } catch { return {}; } }
function saveJar(j) { fs.writeFileSync(JAR, JSON.stringify(j)); }

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function request(method, path, body, extraHeaders = {}) {
  const jar = loadJar();
  return new Promise((resolve, reject) => {
    const headers = Object.assign({}, extraHeaders);
    if (Object.keys(jar).length) headers['Cookie'] = cookieHeader(jar);
    let payload = null;
    if (body !== null && body !== undefined) {
      if (typeof body === 'string') { payload = body; }
      else { payload = JSON.stringify(body); }
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({ ...BASE, method, path, headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const sc = res.headers['set-cookie'] || [];
        const j = loadJar();
        for (const c of sc) {
          const kv = c.split(';')[0];
          const idx = kv.indexOf('=');
          const k = kv.slice(0, idx).trim(), v = kv.slice(idx + 1).trim();
          if (v === '') delete j[k]; else j[k] = v;
        }
        saveJar(j);
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = { request, loadJar, saveJar };

if (require.main === module) {
  const [method, path, ...rest] = process.argv.slice(2);
  const bodyArg = rest.join(' ') || null;
  const hdrs = {};
  if (E.TENANT) hdrs['X-Tenant-Id'] = E.TENANT;
  if (E.XSRF) hdrs['X-XSRF-TOKEN'] = E.XSRF;
  if (E.CTYPE) hdrs['Content-Type'] = E.CTYPE;
  request(method, path, bodyArg, hdrs).then(r => {
    console.log('STATUS', r.status);
    console.log(r.body);
  }).catch(e => { console.error('ERR', e.message); process.exit(1); });
}
