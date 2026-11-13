const http = require("http");
const BASE = "http://127.0.0.1:56166";
class Client {
  constructor(tenant) { this.cookies = {}; this.tenant = tenant; }
  cookieHeader() { return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; "); }
  request(method, path, { body, form, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE + path);
      let data = null;
      const h = { Cookie: this.cookieHeader(), ...headers };
      if (this.tenant) h["X-Tenant-Id"] = this.tenant;
      if (this.cookies["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = this.cookies["XSRF-TOKEN"];
      if (form) { data = new URLSearchParams(form).toString(); h["Content-Type"] = "application/x-www-form-urlencoded"; }
      else if (body !== undefined) { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
      if (data) h["Content-Length"] = Buffer.byteLength(data);
      const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: h }, res => {
        (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); this.cookies[kv.slice(0, i)] = kv.slice(i + 1); });
        let d = ""; res.on("data", c => d += c); res.on("end", () => { let j = null; try { j = JSON.parse(d); } catch (_) {} resolve({ status: res.statusCode, text: d, json: j }); });
      });
      req.on("error", reject); if (data) req.write(data); req.end();
    });
  }
  async login(u, p) {
    await this.request("GET", "/csrf");
    const r = await this.request("POST", "/api/login/basic", { form: { username: u, password: p } });
    if (r.status >= 400) throw new Error("login " + r.status + " " + r.text);
    await this.request("GET", "/csrf");
    return r;
  }
}
module.exports = { Client, BASE };
