const http = require('http');

const HOST = 'localhost';
const PORT = 55025;

class Client {
  constructor(tenant) { this.jar = {}; this.tenant = tenant; }
  cookieHeader() { return Object.entries(this.jar).map(([k,v])=>`${k}=${v}`).join('; '); }
  absorb(res) {
    const sc = res.headers['set-cookie'] || [];
    for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); this.jar[kv.slice(0,i).trim()] = kv.slice(i+1).trim(); }
  }
  req(method, path, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const headers = Object.assign({}, extraHeaders);
      if (this.tenant) headers['X-Tenant-Id'] = this.tenant;
      const ck = this.cookieHeader(); if (ck) headers['Cookie'] = ck;
      if (this.jar['XSRF-TOKEN']) headers['X-XSRF-TOKEN'] = decodeURIComponent(this.jar['XSRF-TOKEN']);
      let data = body;
      if (body && typeof body === 'object') { data = JSON.stringify(body); headers['Content-Type'] = headers['Content-Type'] || 'application/json'; }
      if (data) headers['Content-Length'] = Buffer.byteLength(data);
      const r = http.request({host:HOST, port:PORT, method, path, headers}, res => {
        this.absorb(res);
        let out = ''; res.on('data', c => out += c);
        res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: out}));
      });
      r.on('error', reject);
      if (data) r.write(data);
      r.end();
    });
  }
  get(p, h) { return this.req('GET', p, null, h); }
  post(p, b, h) { return this.req('POST', p, b, h); }
  async csrf() { const r = await this.get('/csrf'); return r; }
  async login(user, pass) {
    await this.get('/csrf');
    const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
    const r = await this.post('/api/login/basic', form, {'Content-Type':'application/x-www-form-urlencoded'});
    await this.get('/csrf');
    return r;
  }
}
module.exports = { Client };
