const http = require('http');
const BASE = { host: 'localhost', port: 58062 };
let cookies = {};
function setCookies(res) {
  const sc = res.headers['set-cookie'] || [];
  for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0,i).trim()] = kv.slice(i+1); }
}
function cookieHeader() { return Object.entries(cookies).map(([k,v])=>`${k}=${v}`).join('; '); }
function req(method, path, body, extraHeaders={}) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({}, extraHeaders);
    if (Object.keys(cookies).length) headers['Cookie'] = cookieHeader();
    let data = null;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') { data = body; }
      else { data = JSON.stringify(body); headers['Content-Type'] = headers['Content-Type'] || 'application/json'; }
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const r = http.request({...BASE, method, path, headers}, res => {
      let chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => { setCookies(res); resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString()}); });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
async function login(user, pass) {
  await req('GET', '/api/csrf');
  const xsrf = cookies['XSRF-TOKEN'];
  const res = await req('POST', '/api/login/basic', `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, {'Content-Type':'application/x-www-form-urlencoded', 'X-XSRF-TOKEN': xsrf});
  await req('GET', '/api/csrf');
  return res;
}
function xsrf() { return cookies['XSRF-TOKEN']; }
module.exports = { req, login, cookies, xsrf };
