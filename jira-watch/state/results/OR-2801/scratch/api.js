const http = require('http');
const BASE = { host: 'localhost', port: 50666 };

class Client {
  constructor(tenant) { this.jar = {}; this.tenant = tenant; }
  cookieHeader() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; '); }
  absorb(res) {
    const sc = res.headers['set-cookie'] || [];
    for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); this.jar[kv.slice(0, i)] = kv.slice(i + 1); }
  }
  req(method, path, body, extraHeaders) {
    return new Promise((resolve, reject) => {
      const headers = Object.assign({}, extraHeaders || {});
      const cookies = this.cookieHeader();
      if (cookies) headers['Cookie'] = cookies;
      if (this.tenant) headers['X-Tenant-Id'] = this.tenant;
      if (this.jar['XSRF-TOKEN']) headers['X-XSRF-TOKEN'] = this.jar['XSRF-TOKEN'];
      if (this.useBodyToken && this.csrfBody) headers['X-XSRF-TOKEN'] = this.csrfBody;
      let payload = null;
      if (body !== undefined && body !== null) {
        if (typeof body === 'string') { payload = body; if (!headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
        else { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
        headers['Content-Length'] = Buffer.byteLength(payload);
      }
      const r = http.request(Object.assign({}, BASE, { method, path, headers }), res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => { this.absorb(res); resolve({ status: res.statusCode, headers: res.headers, body: d }); });
      });
      r.on('error', reject);
      if (payload) r.write(payload);
      r.end();
    });
  }
  get(p, h) { return this.req('GET', p, null, h); }
  post(p, b, h) { return this.req('POST', p, b, h); }
  put(p, b, h) { return this.req('PUT', p, b, h); }
  del(p, b, h) { return this.req('DELETE', p, b, h); }
  async csrf() {
    const r = await this.get('/csrf');
    try { this.csrfBody = JSON.parse(r.body).token; } catch (e) { this.csrfBody = undefined; }
    return r;
  }
  async login(user, pass) {
    this.useBodyToken = false;
    await this.csrf();
    const r = await this.post('/api/login/basic', `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
    await this.csrf();
    return r;
  }
}
module.exports = { Client };
