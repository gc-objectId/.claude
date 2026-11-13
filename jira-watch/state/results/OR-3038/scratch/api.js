const http = require("http");
const BASE = { host: "127.0.0.1", port: 56173 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function store(res) { (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); }); }
function req(method, path, { body, headers = {}, tenant, form } = {}) {
  return new Promise((resolve, reject) => {
    const h = { Cookie: cookieHeader(), ...headers };
    if (tenant) h["X-Tenant-Id"] = tenant;
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    let data;
    if (form) { data = new URLSearchParams(form).toString(); h["Content-Type"] = "application/x-www-form-urlencoded"; }
    else if (body !== undefined) { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
    if (data) h["Content-Length"] = Buffer.byteLength(data);
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      store(res); let d = ""; res.on("data", c => d += c); res.on("end", () => { let j; try { j = JSON.parse(d); } catch { j = d; } resolve({ status: res.statusCode, body: j, raw: d }); });
    });
    r.on("error", reject); if (data) r.write(data); r.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { form: { username: user, password: pass } });
  await req("GET", "/csrf");
  return r.status;
}
module.exports = { req, login, jar };
if (require.main === module) {
  (async () => {
    console.log("login", await login());
    const r = await req("GET", "/api/admin/rule/configuration/a-insulin-glucose-check", { tenant: "mayo-mayo" });
    console.log(r.status, r.raw);
    const d = await req("GET", "/api/admin/rule/configuration/a-insulin-glucose-check", { tenant: "demo-demo" });
    console.log(d.status, d.raw);
  })();
}
