const http = require("http");
const BASE = "http://127.0.0.1:65476";
class Session {
  constructor() { this.jar = {}; }
  cookieHeader() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  req(method, path, { body, headers = {}, form = false } = {}) {
    return new Promise((resolve, reject) => {
      const data = body == null ? null : (form ? body : JSON.stringify(body));
      const h = { Cookie: this.cookieHeader(), ...headers };
      if (data != null) { h["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
      if (this.jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = this.jar["XSRF-TOKEN"];
      const r = http.request(BASE + path, { method, headers: h }, (res) => {
        (res.headers["set-cookie"] || []).forEach((c) => { const [kv] = c.split(";"); const i = kv.indexOf("="); this.jar[kv.slice(0, i)] = kv.slice(i + 1); });
        let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
      });
      r.on("error", reject); if (data != null) r.write(data); r.end();
    });
  }
  async login(user, pass) {
    await this.req("GET", "/csrf");
    const r = await this.req("POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, form: true });
    if (r.status >= 400) throw new Error(`login ${user} failed ${r.status} ${r.body.slice(0, 200)}`);
    await this.req("GET", "/csrf");
    return r.status;
  }
}
module.exports = { Session, BASE };
