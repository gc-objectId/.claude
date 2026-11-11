const http = require("http");
const BASE = "http://127.0.0.1:61603";
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, { body, headers = {}, form = false, tenant = module.exports.tenant } = {}) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : form ? body : JSON.stringify(body);
    const h = { Cookie: cookieHeader(), "X-Tenant-Id": tenant, ...headers };
    if (data != null) { h["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request(BASE + path, { method, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: res.statusCode, text: d, json: j }); });
    });
    r.on("error", reject); if (data != null) r.write(data); r.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, form: true });
  if (r.status >= 400) throw new Error("login failed " + r.status + " " + r.text.slice(0, 200));
  await req("GET", "/csrf");
  return r;
}
module.exports = { req, login, jar, tenant: "mayo-mayo" };
