const http = require("http");
const BASE = { host: "localhost", port: 54100 };
const TENANT = "demo-demo";

function makeSession() {
  const jar = {};
  function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  function request(method, path, { body, form, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      let data = null;
      const h = { "X-Tenant-Id": TENANT, Cookie: cookieHeader(), ...headers };
      if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
      if (form) { data = new URLSearchParams(form).toString(); h["Content-Type"] = "application/x-www-form-urlencoded"; }
      else if (body !== undefined) { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
      if (data) h["Content-Length"] = Buffer.byteLength(data);
      const req = http.request({ ...BASE, method, path, headers: h }, (res) => {
        (res.headers["set-cookie"] || []).forEach((c) => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
        let out = ""; res.on("data", (c) => (out += c));
        res.on("end", () => { let parsed = out; try { parsed = JSON.parse(out); } catch {} resolve({ status: res.statusCode, body: parsed, headers: res.headers }); });
      });
      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    });
  }
  async function login(username, password) {
    await request("GET", "/csrf");
    const r = await request("POST", "/api/login/basic", { form: { username, password } });
    await request("GET", "/csrf");
    return r.status;
  }
  return { request, login, jar };
}
module.exports = { makeSession };
