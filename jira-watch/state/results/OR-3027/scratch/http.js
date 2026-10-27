const http = require("http");
const BASE = { host: "127.0.0.1", port: 65459 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, { body, headers = {}, form = false } = {}) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : (form ? body : (typeof body === "string" ? body : JSON.stringify(body)));
    const h = { Cookie: cookieHeader(), ...headers };
    if (data != null) {
      h["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json";
      h["Content-Length"] = Buffer.byteLength(data);
    }
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject);
    if (data != null) r.write(data);
    r.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, form: true });
  await req("GET", "/csrf");
  return r;
}
async function sendHl7(raw, tenant = "mayo-mayo") {
  return req("POST", "/api/admin/hl7-inbound-messages/send", { body: { rawMessage: raw }, headers: { "X-Tenant-Id": tenant } });
}
module.exports = { req, login, sendHl7, jar };
