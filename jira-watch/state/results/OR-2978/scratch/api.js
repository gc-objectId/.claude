const http = require("http");
const BASE = { host: "127.0.0.1", port: 64618 };
class Session {
  constructor(tenant) { this.cookies = {}; this.tenant = tenant; }
  header() { return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; "); }
  store(res) { (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); this.cookies[kv.slice(0, i)] = kv.slice(i + 1); }); }
  req(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const h = { Cookie: this.header(), ...headers };
      if (this.tenant) h["X-Tenant-Id"] = this.tenant;
      if (this.cookies["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = this.cookies["XSRF-TOKEN"];
      let data;
      if (body !== undefined) {
        if (typeof body === "string") { data = body; h["Content-Type"] = h["Content-Type"] || "application/x-www-form-urlencoded"; }
        else { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
        h["Content-Length"] = Buffer.byteLength(data);
      }
      const r = http.request({ ...BASE, method, path, headers: h }, res => {
        let d = ""; res.on("data", c => d += c); res.on("end", () => { this.store(res); let j; try { j = JSON.parse(d); } catch { j = d; } resolve({ status: res.statusCode, body: j, headers: res.headers }); });
      });
      r.on("error", reject);
      if (data !== undefined) r.write(data);
      r.end();
    });
  }
  async login(user, pass) {
    await this.req("GET", "/csrf");
    const r = await this.req("POST", "/api/login/basic", `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
    await this.req("GET", "/csrf");
    return r.status;
  }
}
module.exports = { Session };
