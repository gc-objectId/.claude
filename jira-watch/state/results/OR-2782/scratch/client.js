const http = require('http');
const HOST = 'localhost', PORT = 60086;
let jar = {};

function setCookies(res) {
  const sc = res.headers['set-cookie'] || [];
  for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0,i)] = kv.slice(i+1); }
}
function cookieHeader() { return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; '); }

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const h = Object.assign({ 'Cookie': cookieHeader() }, headers);
    if (body) h['Content-Length'] = Buffer.byteLength(body);
    const r = http.request({ host: HOST, port: PORT, path, method, headers: h }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { setCookies(res); resolve({ status: res.statusCode, headers: res.headers, body: data }); });
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
  const res = await req('POST', '/api/login/basic', form, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-XSRF-TOKEN': decodeURIComponent(jar['XSRF-TOKEN'] || '')
  });
  await req('GET', '/csrf');
  return res;
}

async function post(path, obj, tenant) {
  const body = JSON.stringify(obj);
  const h = { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(jar['XSRF-TOKEN'] || '') };
  if (tenant) h['X-Tenant-Id'] = tenant;
  return req('POST', path, body, h);
}
async function get(path, tenant) {
  const h = {};
  if (tenant) h['X-Tenant-Id'] = tenant;
  return req('GET', path, null, h);
}
module.exports = { login, post, get, req, jar: () => jar };
