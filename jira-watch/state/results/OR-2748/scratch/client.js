const http = require('http');
const BASE = { host: 'localhost', port: 49571 };
const jar = new Map();

function setCookies(res) {
  const sc = res.headers['set-cookie'] || [];
  for (const c of sc) {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function req(method, path, { body, headers = {}, tenant } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    if (jar.size) h['Cookie'] = cookieHeader();
    if (jar.has('XSRF-TOKEN')) h['X-XSRF-TOKEN'] = jar.get('XSRF-TOKEN');
    if (tenant) h['X-Tenant-Id'] = tenant;
    let payload = body;
    if (body && typeof body === 'object') { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
    if (payload) h['Content-Length'] = Buffer.byteLength(payload);
    const r = http.request({ ...BASE, method, path, headers: h }, (res) => {
      setCookies(res);
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function login(user, pass, tenant) {
  jar.clear();
  await req('GET', '/csrf', { tenant });
  const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  const res = await req('POST', '/api/login/basic', { body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, tenant });
  await req('GET', '/csrf', { tenant });
  return res;
}

module.exports = { req, login, jar, cookieHeader };
