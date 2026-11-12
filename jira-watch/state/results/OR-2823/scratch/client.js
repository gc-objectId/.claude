const http = require("http");
const BASE = { host: "127.0.0.1", port: 62694 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, { body, headers = {}, tenant } = {}) {
  return new Promise((resolve, reject) => {
    const h = { Cookie: cookieHeader(), ...headers };
    if (tenant) h["X-Tenant-Id"] = tenant;
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    let data;
    if (body !== undefined) {
      data = typeof body === "string" ? body : JSON.stringify(body);
      h["Content-Type"] = h["Content-Type"] || "application/json";
      h["Content-Length"] = Buffer.byteLength(data);
    }
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}
async function login(user, pass) {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  await req("GET", "/csrf");
  return r.status;
}
module.exports = { req, login, jar };
