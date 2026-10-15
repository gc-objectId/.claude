const http = require("http");
const BASE = { host: "127.0.0.1", port: 58952 };
function makeClient(tenant) {
  const jar = {};
  function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  function request(method, path, { body, headers = {}, raw } = {}) {
    return new Promise((resolve, reject) => {
      let data = null;
      const h = { Cookie: cookieHeader(), "X-Tenant-Id": tenant, ...headers };
      if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = decodeURIComponent(jar["XSRF-TOKEN"]);
      if (raw !== undefined) { data = raw; }
      else if (body !== undefined) { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
      if (data !== null) h["Content-Length"] = Buffer.byteLength(data);
      const req = http.request({ ...BASE, method, path, headers: h }, (res) => {
        (res.headers["set-cookie"] || []).forEach((c) => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
        let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
      });
      req.on("error", reject);
      if (data !== null) req.write(data);
      req.end();
    });
  }
  async function login(username, password) {
    await request("GET", "/csrf");
    const form = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const r = await request("POST", "/api/login/basic", { raw: form, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    await request("GET", "/csrf");
    return r;
  }
  return { request, login, jar };
}
module.exports = { makeClient };
