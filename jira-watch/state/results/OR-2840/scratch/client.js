const http = require('http');
const HOST = '127.0.0.1';
const PORT = 61555;

class Client {
  constructor() { this.jar = {}; }
  cookieHeader() {
    return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  absorb(res) {
    const sc = res.headers['set-cookie'] || [];
    for (const c of sc) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
      if (v === '' ) delete this.jar[k]; else this.jar[k] = v;
    }
  }
  req(method, path, { body, headers = {}, form } = {}) {
    return new Promise((resolve, reject) => {
      const h = { ...headers };
      const ck = this.cookieHeader();
      if (ck) h['Cookie'] = ck;
      let payload = null;
      if (form) { payload = new URLSearchParams(form).toString(); h['Content-Type'] = 'application/x-www-form-urlencoded'; }
      else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
      if (payload) h['Content-Length'] = Buffer.byteLength(payload);
      if (this.jar['XSRF-TOKEN']) h['X-XSRF-TOKEN'] = this.jar['XSRF-TOKEN'];
      const r = http.request({ host: HOST, port: PORT, path, method, headers: h }, (res) => {
        this.absorb(res);
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
      });
      r.on('error', reject);
      if (payload) r.write(payload);
      r.end();
    });
  }
  get(p, o) { return this.req('GET', p, o); }
  post(p, o) { return this.req('POST', p, o); }
  patch(p, o) { return this.req('PATCH', p, o); }
  del(p, o) { return this.req('DELETE', p, o); }
  async login(user, pass) {
    await this.get('/csrf');
    const r = await this.post('/api/login/basic', { form: { username: user, password: pass } });
    await this.get('/csrf');
    return r;
  }
}
module.exports = { Client };
