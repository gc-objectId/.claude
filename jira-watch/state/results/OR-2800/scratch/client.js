const http = require('http');
const HOST = 'localhost', PORT = 50638;
let jar = {};
function cookieHeader() { return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; '); }
function absorb(res) {
  const sc = res.headers['set-cookie'] || [];
  for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0,i).trim()] = kv.slice(i+1).trim(); }
}
function req(method, path, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const h = Object.assign({}, headers);
    if (Object.keys(jar).length) h['Cookie'] = cookieHeader();
    const r = http.request({ host: HOST, port: PORT, method, path, headers: h }, res => {
      absorb(res);
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}
async function csrf() {
  const r = await req('GET', '/csrf');
  try { return JSON.parse(r.body).token; } catch { return jar['XSRF-TOKEN']; }
}
async function login(user, pass, tenant) {
  await req('GET', '/csrf');
  const token = jar['XSRF-TOKEN'];
  const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  const r = await req('POST', '/api/login/basic', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form), 'X-XSRF-TOKEN': token, ...(tenant?{'X-Tenant-Id':tenant}:{}) },
    body: form });
  return r;
}
module.exports = { req, jar, csrf, login };
