const http = require('http');

const HOST = 'localhost';
const PORT = 54669;
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function absorb(res) {
  const sc = res.headers['set-cookie'] || [];
  for (const c of sc) {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
  }
}

function request(method, path, { body, headers = {}, contentType } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    if (jar.size) h['Cookie'] = cookieHeader();
    if (jar.has('XSRF-TOKEN')) h['X-XSRF-TOKEN'] = jar.get('XSRF-TOKEN');
    let payload = null;
    if (body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      h['Content-Type'] = contentType || 'application/json';
      h['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({ host: HOST, port: PORT, path, method, headers: h }, (res) => {
      absorb(res);
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(user, pass) {
  await request('GET', '/api/csrf');
  const r = await request('POST', '/api/login/basic', {
    body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
    contentType: 'application/x-www-form-urlencoded',
  });
  await request('GET', '/api/csrf');
  return r;
}

module.exports = { request, login, jar };
