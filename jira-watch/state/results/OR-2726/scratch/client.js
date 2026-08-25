const http = require('http');
const HOST = 'localhost', PORT = 61175;

class Session {
  constructor(tenant) { this.cookies = {}; this.tenant = tenant; }
  cookieHeader() { return Object.entries(this.cookies).map(([k,v]) => `${k}=${v}`).join('; '); }
  req(method, path, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const headers = { ...extraHeaders };
      const ch = this.cookieHeader();
      if (ch) headers['Cookie'] = ch;
      if (this.tenant) headers['X-Tenant-Id'] = this.tenant;
      if (this.cookies['XSRF-TOKEN']) headers['X-XSRF-TOKEN'] = decodeURIComponent(this.cookies['XSRF-TOKEN']);
      let data = body;
      if (body && typeof body === 'object') { data = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
      if (data) headers['Content-Length'] = Buffer.byteLength(data);
      const r = http.request({ host: HOST, port: PORT, path, method, headers }, res => {
        let chunks = '';
        res.on('data', d => chunks += d);
        res.on('end', () => {
          (res.headers['set-cookie'] || []).forEach(c => {
            const [kv] = c.split(';');
            const i = kv.indexOf('=');
            this.cookies[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
          });
          resolve({ status: res.statusCode, headers: res.headers, body: chunks });
        });
      });
      r.on('error', reject);
      if (data) r.write(data);
      r.end();
    });
  }
  get(p, h) { return this.req('GET', p, null, h); }
  post(p, b, h) { return this.req('POST', p, b, h); }
  patch(p, b, h) { return this.req('PATCH', p, b, h); }
  del(p, b, h) { return this.req('DELETE', p, b, h); }
  async csrf() { const r = await this.get('/api/csrf'); return r; }
  async login(user, pass) {
    await this.csrf();
    const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
    const r = await this.req('POST', '/api/login/basic', form, { 'Content-Type': 'application/x-www-form-urlencoded' });
    await this.csrf();
    return r;
  }
}
module.exports = { Session };
