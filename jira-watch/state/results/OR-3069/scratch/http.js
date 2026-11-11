const http = require("http");
const BASE = "http://127.0.0.1:55164";
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, { body, headers = {}, tenant, form } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    let data = null;
    const h = { Cookie: cookieHeader(), ...headers };
    if (tenant) h["X-Tenant-Id"] = tenant;
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    if (form) { data = new URLSearchParams(form).toString(); h["Content-Type"] = "application/x-www-form-urlencoded"; }
    else if (body !== undefined) { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
    if (data) h["Content-Length"] = Buffer.byteLength(data);
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: h }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
        let j = null; try { j = JSON.parse(d); } catch (_) {}
        resolve({ status: res.statusCode, text: d, json: j });
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { form: { username: user, password: pass } });
  if (r.status >= 400) throw new Error("login failed " + r.status + " " + r.text.slice(0, 200));
  await req("GET", "/csrf");
  return r.status;
}
module.exports = { req, login, jar };
