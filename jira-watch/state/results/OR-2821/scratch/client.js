const http = require("http");
const BASE = { host: "127.0.0.1", port: 62485 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, { body, headers = {}, tenant } = {}) {
  return new Promise((resolve, reject) => {
    const h = { Cookie: cookieHeader(), ...headers };
    if (tenant) h["X-Tenant-Id"] = tenant;
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    let payload;
    if (body !== undefined) {
      if (typeof body === "string") { payload = body; h["Content-Type"] = h["Content-Type"] || "application/x-www-form-urlencoded"; }
      else { payload = JSON.stringify(body); h["Content-Type"] = "application/json"; }
      h["Content-Length"] = Buffer.byteLength(payload);
    }
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => { let j; try { j = JSON.parse(d); } catch { j = d; } resolve({ status: res.statusCode, body: j }); });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}` });
  await req("GET", "/csrf");
  return r;
}
module.exports = { req, login, jar };
