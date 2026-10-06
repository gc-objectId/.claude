const http = require("http");
const BASE = "http://localhost:65457";
const TENANT = "demo-demo";
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function request(method, path, { body, headers = {}, form = false } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const data = body == null ? null : (form ? body : JSON.stringify(body));
    const h = { Cookie: cookieHeader(), "X-Tenant-Id": TENANT, Accept: "application/json", ...headers };
    if (data != null) { h["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: h }, (res) => {
      let b = ""; res.on("data", (c) => (b += c));
      res.on("end", () => {
        (res.headers["set-cookie"] || []).forEach((c) => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
        let json = null; try { json = JSON.parse(b); } catch {}
        resolve({ status: res.statusCode, body: b, json });
      });
    });
    req.on("error", reject);
    if (data != null) req.write(data);
    req.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await request("GET", "/csrf");
  const r = await request("POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, form: true });
  await request("GET", "/csrf");
  return r.status;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = { request, login, sleep, jar };
