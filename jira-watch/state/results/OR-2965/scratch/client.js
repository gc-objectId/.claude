const http = require("http");
const base = { host: "127.0.0.1", port: 64601 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, { body, headers = {}, tenant } = {}) {
  return new Promise((resolve, reject) => {
    const h = { Cookie: cookieHeader(), ...headers };
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    if (tenant) h["X-Tenant-Id"] = tenant;
    if (body !== undefined) h["Content-Length"] = Buffer.byteLength(body);
    const r = http.request({ ...base, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject);
    if (body !== undefined) r.write(body);
    r.end();
  });
}
async function login(user, pass) {
  await req("GET", "/csrf");
  const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  const r = await req("POST", "/api/login/basic", { body: form, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  await req("GET", "/csrf");
  return r;
}
module.exports = { req, login, jar };
if (require.main === module) {
  (async () => {
    const [user, pass, method, path, body, tenant] = process.argv.slice(2);
    const l = await login(user, pass); console.log("login", l.status, l.headers.location || "");
    const r = await req(method, path, { body, tenant, headers: body ? { "Content-Type": "application/json" } : {} });
    console.log(r.status, r.body.slice(0, 400));
  })().catch(e => { console.log("ERR", e); process.exit(1); });
}
