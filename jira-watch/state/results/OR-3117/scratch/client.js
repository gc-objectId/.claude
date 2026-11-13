const http = require("http");
const BASE = "http://127.0.0.1:56643";
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function request(method, path, { body, headers = {}, tenant, form } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const h = { Cookie: cookieHeader(), ...headers };
    if (tenant) h["X-Tenant-Id"] = tenant;
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    let data;
    if (form) { data = new URLSearchParams(form).toString(); h["Content-Type"] = "application/x-www-form-urlencoded"; }
    else if (body !== undefined) { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
    if (data) h["Content-Length"] = Buffer.byteLength(data);
    const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => {
        let json; try { json = JSON.parse(d); } catch { json = undefined; }
        resolve({ status: res.statusCode, text: d, json, headers: res.headers });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}
async function login(user, pass) {
  await request("GET", "/csrf");
  const r = await request("POST", "/api/login/basic", { form: { username: user, password: pass } });
  if (r.status >= 400) throw new Error("login failed " + r.status + " " + r.text.slice(0, 200));
  await request("GET", "/csrf");
  return r;
}
module.exports = { request, login, jar };
