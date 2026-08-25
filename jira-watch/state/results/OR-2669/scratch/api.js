const http = require('http');
const BASE = { host: '127.0.0.1', port: 62050 };
const jar = {};

function setCookies(res) {
  const sc = res.headers['set-cookie'] || [];
  for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1); }
}
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); }

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const h = Object.assign({}, headers);
    if (data !== null && !h['Content-Type']) h['Content-Type'] = 'application/json';
    if (data !== null) h['Content-Length'] = Buffer.byteLength(data);
    if (Object.keys(jar).length) h['Cookie'] = cookieHeader();
    if (jar['XSRF-TOKEN']) h['X-XSRF-TOKEN'] = decodeURIComponent(jar['XSRF-TOKEN']);
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      setCookies(res);
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on('error', reject);
    if (data !== null) r.write(data);
    r.end();
  });
}

async function login(user, pass, tenant) {
  await req('GET', '/csrf', undefined, { 'X-Tenant-Id': tenant });
  const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  const r = await req('POST', '/api/login/basic', form, { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Tenant-Id': tenant });
  await req('GET', '/csrf', undefined, { 'X-Tenant-Id': tenant });
  return r;
}

module.exports = { req, login, jar };

if (require.main === module) {
  (async () => {
    const [, , user, pass, tenant, method, path, ...rest] = process.argv;
    const lr = await login(user, pass, tenant);
    console.error('login:', lr.status);
    const body = rest.length ? rest.join(' ') : undefined;
    const r = await req(method, path, body, { 'X-Tenant-Id': tenant });
    console.log(r.status, r.body);
  })().catch(e => { console.error(e); process.exit(1); });
}
