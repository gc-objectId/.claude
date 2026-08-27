const http = require('http');
const BASE = { host: '127.0.0.1', port: 55896 };
const jar = {};

function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}
function absorb(res) {
  (res.headers['set-cookie'] || []).forEach(c => {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  });
}
function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const h = Object.assign({ Cookie: cookieHeader() }, headers);
    if (jar['XSRF-TOKEN']) h['X-XSRF-TOKEN'] = jar['XSRF-TOKEN'];
    let payload = null;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') { payload = body; h['Content-Type'] = h['Content-Type'] || 'application/x-www-form-urlencoded'; }
      else { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
      h['Content-Length'] = Buffer.byteLength(payload);
    }
    const r = http.request(Object.assign({}, BASE, { method, path, headers: h }), res => {
      absorb(res);
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}
async function login(user, pass) {
  await req('GET', '/csrf');
  const r = await req('POST', '/api/login/basic', `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
  await req('GET', '/csrf');
  return r;
}
module.exports = { req, login, jar };
