const http = require("http");
const BASE = { host: "127.0.0.1", port: 64128 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, { body, headers = {}, tenant } = {}) {
  return new Promise((resolve, reject) => {
    const isForm = typeof body === "string";
    const data = body == null ? null : isForm ? body : JSON.stringify(body);
    const h = { Cookie: cookieHeader(), ...headers };
    if (data != null) { h["Content-Type"] = isForm ? "application/x-www-form-urlencoded" : "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    if (tenant) h["X-Tenant-Id"] = tenant;
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    r.on("error", reject);
    if (data != null) r.write(data);
    r.end();
  });
}
async function login(user, pass) {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}` });
  await req("GET", "/csrf");
  return r;
}
module.exports = { req, login, jar };
