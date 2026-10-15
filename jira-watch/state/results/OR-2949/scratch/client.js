const http = require("http");
const BASE = "http://127.0.0.1:58765";
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function request(method, path, { body, headers = {}, form } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const data = form ? new URLSearchParams(form).toString() : body !== undefined ? JSON.stringify(body) : undefined;
    const h = { Cookie: cookieHeader(), ...headers };
    if (data !== undefined) { h["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.on("error", reject);
    if (data !== undefined) req.write(data);
    req.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await request("GET", "/csrf");
  const r = await request("POST", "/api/login/basic", { form: { username: user, password: pass } });
  await request("GET", "/csrf");
  return r.status;
}
module.exports = { request, login, jar };
