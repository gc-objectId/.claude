const http = require("http");
const BASE = { host: "127.0.0.1", port: 55393 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const h = { Cookie: cookieHeader(), ...headers };
    let data = null;
    if (body !== undefined && body !== null) {
      if (typeof body === "string") { data = body; h["Content-Type"] = h["Content-Type"] || "application/x-www-form-urlencoded"; }
      else { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
      h["Content-Length"] = Buffer.byteLength(data);
    }
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => { let j = d; try { j = JSON.parse(d); } catch (e) {} resolve({ status: res.statusCode, body: j }); });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
  await req("GET", "/csrf");
  return r;
}
module.exports = { req, login, jar };
