const http = require('http');
const BASE = { host: '127.0.0.1', port: 60083 };
const TENANT = 'mayo-mayo';
let jar = {};

function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}
function absorb(res) {
  const sc = res.headers['set-cookie'] || [];
  for (const c of sc) {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
}
function req(method, path, { body, contentType, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const h = { 'X-Tenant-Id': TENANT, 'Cookie': cookieHeader(), ...headers };
    if (jar['XSRF-TOKEN']) h['X-XSRF-TOKEN'] = jar['XSRF-TOKEN'];
    if (body) { h['Content-Type'] = contentType || 'application/json'; h['Content-Length'] = Buffer.byteLength(body); }
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      absorb(res);
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}
async function login(user, pass) {
  jar = {};
  await req('GET', '/csrf');
  const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  const res = await req('POST', '/api/login/basic', { body: form, contentType: 'application/x-www-form-urlencoded' });
  if (res.status >= 400) throw new Error(`login ${res.status} ${res.body.slice(0, 300)}`);
  await req('GET', '/csrf');
  return res;
}
module.exports = { req, login, jar: () => jar };
