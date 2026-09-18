const http = require("http");
const qs = require("querystring");
const BASE = { host: "127.0.0.1", port: 50698 };
class Client {
  constructor(tenant) { this.jar = {}; this.tenant = tenant; }
  cookieHeader() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  req(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const h = { Cookie: this.cookieHeader(), "X-Tenant-Id": this.tenant, ...headers };
      if (this.jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = this.jar["XSRF-TOKEN"];
      let data;
      if (body !== undefined) {
        data = typeof body === "string" ? body : JSON.stringify(body);
        h["Content-Type"] = h["Content-Type"] || "application/json";
        h["Content-Length"] = Buffer.byteLength(data);
      }
      const r = http.request({ ...BASE, method, path, headers: h }, res => {
        (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); this.jar[kv.slice(0, i)] = kv.slice(i + 1); });
        let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
      });
      r.on("error", reject);
      if (data) r.write(data);
      r.end();
    });
  }
  async login(user, pass) {
    await this.req("GET", "/csrf");
    const r = await this.req("POST", "/api/login/basic", qs.stringify({ username: user, password: pass }), { "Content-Type": "application/x-www-form-urlencoded" });
    await this.req("GET", "/csrf");
    return r.status;
  }
}
module.exports = { Client };
