const http = require('http');
const HOST = 'localhost', PORT = 56363;
let jar = {};
function setCookies(res){ const sc = res.headers['set-cookie']||[]; sc.forEach(c=>{const [kv]=c.split(';'); const i=kv.indexOf('='); jar[kv.slice(0,i)]=kv.slice(i+1);}); }
function cookieHeader(){ return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; '); }
function req(method, path, body, headers={}) {
  return new Promise((resolve,reject)=>{
    const data = body===undefined?null:((typeof body==='string'||Buffer.isBuffer(body))?body:JSON.stringify(body));
    const h = Object.assign({'Cookie':cookieHeader()}, headers);
    if(data!==null && !h['Content-Type']) h['Content-Type']='application/json';
    if(data!==null) h['Content-Length']=Buffer.byteLength(data);
    const r = http.request({host:HOST,port:PORT,path,method,headers:h}, res=>{
      setCookies(res); let b='';
      res.on('data',d=>b+=d); res.on('end',()=>resolve({status:res.statusCode, headers:res.headers, body:b}));
    });
    r.on('error',reject); if(data!==null) r.write(data); r.end();
  });
}
async function login(user,pass){
  await req('GET','/api/csrf');
  const xsrf = jar['XSRF-TOKEN'];
  const res = await req('POST','/api/login/basic', `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
    {'Content-Type':'application/x-www-form-urlencoded','X-XSRF-TOKEN':xsrf});
  await req('GET','/api/csrf');
  return res;
}
function xsrf(){ return jar['XSRF-TOKEN']; }
module.exports = {req, login, jar, xsrf};
