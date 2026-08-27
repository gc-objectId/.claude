const http = require('http');
const HOST = 'localhost', PORT = 60949;
let jar = {};
function setCookies(res){
  const sc = res.headers['set-cookie'] || [];
  sc.forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0,i)] = kv.slice(i+1); });
}
function cookieHeader(){ return Object.entries(jar).map(([k,v])=>k+'='+v).join('; '); }
function req(method, path, body, extraHeaders){
  return new Promise((resolve,reject)=>{
    const headers = Object.assign({'Cookie': cookieHeader()}, extraHeaders||{});
    let data = null;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') { data = body; }
      else { data = JSON.stringify(body); headers['Content-Type']='application/json'; }
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (jar['XSRF-TOKEN']) headers['X-XSRF-TOKEN'] = decodeURIComponent(jar['XSRF-TOKEN']);
    const r = http.request({host:HOST,port:PORT,path,method,headers}, res=>{
      setCookies(res);
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode, headers:res.headers, body:d}));
    });
    r.on('error',reject);
    if (data) r.write(data);
    r.end();
  });
}
async function csrf(){ const r = await req('GET','/csrf'); try { return JSON.parse(r.body).token; } catch(e){ return null; } }
async function login(user, pass, tenant){
  jar = {};
  await csrf();
  const form = 'username='+encodeURIComponent(user)+'&password='+encodeURIComponent(pass);
  const h = {'Content-Type':'application/x-www-form-urlencoded'};
  if (tenant) h['X-Tenant-Id'] = tenant;
  const r = await req('POST','/api/login/basic', form, h);
  await csrf();
  return r;
}
module.exports = {req, login, csrf, jar: ()=>jar, setTenant:(t)=>{TENANT=t}};
