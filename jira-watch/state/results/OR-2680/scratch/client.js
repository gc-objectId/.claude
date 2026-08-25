const http = require('http');
const HOST = 'localhost', PORT = 62476;
let jar = {};
function setCookies(res) {
  const sc = res.headers['set-cookie'] || [];
  for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0,i).trim()] = kv.slice(i+1); }
}
function cookieHeader() { return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; '); }
function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const h = Object.assign({ 'Cookie': cookieHeader() }, headers);
    if (body != null) h['Content-Length'] = Buffer.byteLength(body);
    const r = http.request({ host: HOST, port: PORT, method, path, headers: h }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { setCookies(res); resolve({ status: res.statusCode, headers: res.headers, body: d }); });
    });
    r.on('error', reject);
    if (body != null) r.write(body);
    r.end();
  });
}
async function login(user, pass) {
  jar = {};
  await req('GET', '/csrf');
  const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  const res = await req('POST', '/api/login/basic', form, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-XSRF-TOKEN': jar['XSRF-TOKEN']
  });
  return res;
}
async function csrfToken() {
  const r = await req('GET', '/csrf');
  return jar['XSRF-TOKEN'];
}
module.exports = { req, login, jar: () => jar, csrfToken };
