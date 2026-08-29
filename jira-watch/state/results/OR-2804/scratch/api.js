const http = require('http');
const HOST = '127.0.0.1', PORT = 56375;
let jar = {};
function cookieHeader() { return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; '); }
function store(res) {
  const sc = res.headers['set-cookie'] || [];
  for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0,i).trim()] = kv.slice(i+1).trim(); }
}
function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const h = Object.assign({}, headers);
    if (data !== null && !h['Content-Type']) h['Content-Type'] = 'application/json';
    if (data !== null) h['Content-Length'] = Buffer.byteLength(data);
    const ck = cookieHeader(); if (ck) h['Cookie'] = ck;
    if (jar['XSRF-TOKEN']) h['X-XSRF-TOKEN'] = jar['XSRF-TOKEN'];
    const r = http.request({host:HOST,port:PORT,path,method,headers:h}, res => {
      store(res);
      let b=''; res.on('data',d=>b+=d); res.on('end',()=>resolve({status:res.statusCode, headers:res.headers, body:b}));
    });
    r.on('error',reject); if (data!==null) r.write(data); r.end();
  });
}
async function login(user, pass) {
  jar = {};
  await req('GET','/api/csrf');
  const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  const res = await req('POST','/api/login/basic', form, {'Content-Type':'application/x-www-form-urlencoded'});
  await req('GET','/api/csrf');
  return res;
}
module.exports = { req, login, jar: () => jar };
