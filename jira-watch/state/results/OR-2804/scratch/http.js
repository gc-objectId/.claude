const http = require('http');
const HOST = 'localhost', PORT = 58842;
let cookies = {};
function cookieHeader() { return Object.entries(cookies).map(([k,v])=>`${k}=${v}`).join('; '); }
function req(method, path, body, extraHeaders={}) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({}, extraHeaders);
    if (Object.keys(cookies).length) headers['Cookie'] = cookieHeader();
    let data = null;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') { data = body; headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded'; }
      else { data = JSON.stringify(body); headers['Content-Type'] = headers['Content-Type'] || 'application/json'; }
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const r = http.request({host:HOST, port:PORT, path, method, headers}, res => {
      let chunks='';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        (res.headers['set-cookie']||[]).forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0,i)] = kv.slice(i+1); });
        resolve({status: res.statusCode, headers: res.headers, body: chunks});
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
async function login(user, pass, tenant) {
  await req('GET', '/api/csrf');
  const t = cookies['XSRF-TOKEN'];
  const res = await req('POST', '/api/login/basic', `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, {'X-XSRF-TOKEN': t, ...(tenant?{'X-Tenant-Id':tenant}:{})});
  return res;
}
async function csrf() { return cookies['XSRF-TOKEN']; }
module.exports = {req, login, csrf, cookies};
