const http = require("http");
const BASE = { host: "127.0.0.1", port: 51163 };
const TENANT = "demo-demo";
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const h = { Cookie: cookieHeader(), "X-Tenant-Id": TENANT, ...headers };
    if (body) h["Content-Length"] = Buffer.byteLength(body);
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    r.on("error", reject); if (body) r.write(body); r.end();
  });
}
async function login() {
  await req("GET", "/csrf");
  const l = await req("POST", "/api/login/basic", { body: "username=admin&password=admin",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-XSRF-TOKEN": jar["XSRF-TOKEN"] } });
  if (l.status >= 400) throw new Error("login failed " + l.status + " " + l.body);
  await req("GET", "/csrf");
}
const getConfig = rule => req("GET", `/api/admin/rule/configuration/${rule}`);
const postConfig = (rule, obj) => req("POST", `/api/admin/rule/configuration/${rule}`, { body: JSON.stringify(obj),
  headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": jar["XSRF-TOKEN"] } });
module.exports = { login, getConfig, postConfig, req };
if (require.main === module) {
  (async () => {
    const [cmd, rule, arg] = process.argv.slice(2);
    await login();
    if (cmd === "get") { const r = await getConfig(rule); console.log(r.status, r.body); }
    else if (cmd === "post") { const r = await postConfig(rule, JSON.parse(arg)); console.log(r.status, r.body); }
  })().catch(e => { console.error("ERR", e); process.exit(1); });
}
