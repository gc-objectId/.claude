const http = require("http");
const BASE = "http://127.0.0.1:63939";
const jars = {};
function jar(name) { return (jars[name] ||= {}); }
function cookieHeader(j) { return Object.entries(j).map(([k, v]) => `${k}=${v}`).join("; "); }
function request(session, method, path, { body, headers = {}, form = false } = {}) {
  const j = jar(session);
  const url = new URL(BASE + path);
  const data = body == null ? null : (form ? body : (typeof body === "string" ? body : JSON.stringify(body)));
  const h = { Accept: "application/json", ...headers };
  if (data != null) { h["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
  if (Object.keys(j).length) h.Cookie = cookieHeader(j);
  if (j["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = j["XSRF-TOKEN"];
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: h }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); j[kv.slice(0, i)] = kv.slice(i + 1); });
        let parsed = d; try { parsed = JSON.parse(d); } catch (_) {}
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    req.on("error", reject);
    if (data != null) req.write(data);
    req.end();
  });
}
async function login(session, username, password) {
  await request(session, "GET", "/csrf");
  const r = await request(session, "POST", "/api/login/basic", { form: true, body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}` });
  await request(session, "GET", "/csrf");
  return r.status;
}
module.exports = { request, login };
