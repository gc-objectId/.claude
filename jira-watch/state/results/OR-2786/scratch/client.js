const http = require("http");
const BASE = { host: "127.0.0.1", port: 54581 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function request(method, path, { body, headers = {}, form = false } = {}) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : (form ? body : JSON.stringify(body));
    const h = { Cookie: cookieHeader(), ...headers };
    if (data != null) { if (!h["Content-Type"]) h["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const req = http.request({ ...BASE, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.on("error", reject);
    if (data != null) req.write(data);
    req.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await request("GET", "/csrf");
  const r = await request("POST", "/api/login/basic", { form: true, body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}` });
  await request("GET", "/csrf");
  return r.status;
}
async function sendHl7(tenant, raw) {
  return request("POST", "/api/admin/hl7-inbound-messages/send", { body: { rawMessage: raw }, headers: { "X-Tenant-Id": tenant } });
}
module.exports = { request, login, sendHl7, jar };
