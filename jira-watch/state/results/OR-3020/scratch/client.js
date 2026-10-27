const http = require("http");
const BASE = "http://127.0.0.1:64534";
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function absorb(res) {
  (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); });
}
function req(method, path, { body, headers = {}, form = false } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const data = body == null ? null : form ? body : JSON.stringify(body);
    const h = { Cookie: cookieHeader(), ...headers };
    if (data != null) { h["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: h }, res => {
      absorb(res); let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject); if (data != null) r.write(data); r.end();
  });
}
async function login(user, pass) {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, form: true });
  await req("GET", "/csrf");
  return r.status;
}
const T = { "X-Tenant-Id": "demo-demo" };
module.exports = { req, login, T, jar };
