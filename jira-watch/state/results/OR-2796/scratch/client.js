const http = require('http');
const BASE = { host: '127.0.0.1', port: 60596 };
let jar = {};
function cookieHeader() { return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; '); }
function req(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const opts = { ...BASE, method, path, headers: Object.assign({}, headers||{}) };
    if (Object.keys(jar).length) opts.headers['Cookie'] = cookieHeader();
    if (body != null) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const r = http.request(opts, res => {
      (res.headers['set-cookie']||[]).forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0,i)] = kv.slice(i+1); });
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode, headers:res.headers, body:d}));
    });
    r.on('error', reject);
    if (body != null) r.write(body);
    r.end();
  });
}
async function login(user, pass) {
  await req('GET','/csrf');
  const x = jar['XSRF-TOKEN'];
  const r = await req('POST','/api/login/basic', `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, {'Content-Type':'application/x-www-form-urlencoded','X-XSRF-TOKEN':x});
  await req('GET','/csrf');
  return r;
}
function xsrf(){ return jar['XSRF-TOKEN']; }
async function json(method, path, obj, tenant) {
  const h = {'Content-Type':'application/json','X-XSRF-TOKEN':xsrf()};
  if (tenant) h['X-Tenant-Id'] = tenant;
  return req(method, path, obj==null?null:JSON.stringify(obj), h);
}
async function get(path, tenant){ const h={'X-XSRF-TOKEN':xsrf()}; if(tenant) h['X-Tenant-Id']=tenant; return req('GET',path,null,h); }
module.exports = { req, login, json, get, jar, xsrf };
