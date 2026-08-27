const http = require('http');
const BASE = { host: '127.0.0.1', port: 61153 };
let jar = {};

function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const h = Object.assign({}, headers);
    if (Object.keys(jar).length) h['Cookie'] = cookieHeader();
    if (jar['XSRF-TOKEN']) h['X-XSRF-TOKEN'] = jar['XSRF-TOKEN'];
    let payload = null;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') { payload = body; }
      else { payload = JSON.stringify(body); h['Content-Type'] = h['Content-Type'] || 'application/json'; }
      h['Content-Length'] = Buffer.byteLength(payload);
    }
    const r = http.request(Object.assign({}, BASE, { method, path, headers: h }), res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        (res.headers['set-cookie'] || []).forEach(c => {
          const [kv] = c.split(';');
          const i = kv.indexOf('=');
          jar[kv.slice(0, i)] = kv.slice(i + 1);
        });
        resolve({ status: res.statusCode, body: d, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function login(user = 'admin', pass = 'admin') {
  jar = {};
  await req('GET', '/csrf');
  const r = await req('POST', '/api/login/basic',
    `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
    { 'Content-Type': 'application/x-www-form-urlencoded' });
  await req('GET', '/csrf');
  return r;
}

module.exports = { req, login, jar: () => jar };
