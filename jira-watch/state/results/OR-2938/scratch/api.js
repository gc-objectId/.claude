const http = require("http");
const BASE = { host: "127.0.0.1", port: 54583 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function storeCookies(res) {
  for (const c of res.headers["set-cookie"] || []) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); }
}
function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const h = { Cookie: cookieHeader(), "X-Tenant-Id": "demo-demo", Accept: "application/json", ...headers };
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    let payload;
    if (body !== undefined) {
      if (typeof body === "string") { payload = body; h["Content-Type"] = h["Content-Type"] || "application/x-www-form-urlencoded"; }
      else { payload = JSON.stringify(body); h["Content-Type"] = "application/json"; }
      h["Content-Length"] = Buffer.byteLength(payload);
    }
    const req = http.request({ ...BASE, method, path, headers: h }, (res) => {
      storeCookies(res);
      let d = ""; res.on("data", (c) => (d += c));
      res.on("end", () => { let j = d; try { j = JSON.parse(d); } catch {} resolve({ status: res.statusCode, body: j }); });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await request("GET", "/csrf");
  const r = await request("POST", "/api/login/basic", `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
  await request("GET", "/csrf");
  return r.status;
}
module.exports = { request, login, jar };
