const http = require('http');
const HOST = 'localhost', PORT = 50972;
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; '); }
function req(method, path, { body, headers = {}, tenant } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    if (tenant) h['X-Tenant-Id'] = tenant;
    if (Object.keys(jar).length) h['Cookie'] = cookieHeader();
    if (jar['XSRF-TOKEN']) h['X-XSRF-TOKEN'] = jar['XSRF-TOKEN'];
    let payload = null;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') { payload = body; h['Content-Type'] = h['Content-Type'] || 'application/x-www-form-urlencoded'; }
      else { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
      h['Content-Length'] = Buffer.byteLength(payload);
    }
    const r = http.request({ host: HOST, port: PORT, path, method, headers: h }, res => {
      (res.headers['set-cookie'] || []).forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0,i)] = kv.slice(i+1); });
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}
async function csrf(tenant) { const r = await req('GET', '/csrf', { tenant }); return r; }
async function login(user, pass, tenant) {
  await csrf(tenant);
  const r = await req('POST', '/api/login/basic', { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, tenant });
  await csrf(tenant);
  return r;
}
module.exports = { req, csrf, login, jar };
