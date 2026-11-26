const http = require("http");
const BASE = { host: "127.0.0.1", port: 52621 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => k + "=" + v).join("; "); }
function storeCookies(res) {
  (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
}
function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : (typeof body === "string" ? body : JSON.stringify(body));
    const h = { Cookie: cookieHeader(), ...headers };
    if (data != null && !h["Content-Type"]) h["Content-Type"] = "application/json";
    if (data != null) h["Content-Length"] = Buffer.byteLength(data);
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const req = http.request({ ...BASE, method, path, headers: h }, res => {
      storeCookies(res); let d = ""; res.on("data", c => d += c);
      res.on("end", () => { let j = d; try { j = JSON.parse(d); } catch (e) {} resolve({ status: res.statusCode, body: j }); });
    });
    req.on("error", reject); if (data != null) req.write(data); req.end();
  });
}
async function login(user, pass) {
  await request("GET", "/csrf");
  const r = await request("POST", "/api/login/basic", `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, { "Content-Type": "application/x-www-form-urlencoded" });
  await request("GET", "/csrf");
  return r.status;
}
const tenant = (t) => ({ "X-Tenant-Id": t });
module.exports = { request, login, tenant, jar };
