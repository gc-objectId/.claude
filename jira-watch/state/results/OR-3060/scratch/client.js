const http = require("http");
const BASE = { host: "127.0.0.1", port: 56531 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function request(method, path, { body, headers = {}, tenant } = {}) {
  return new Promise((resolve, reject) => {
    const h = { Cookie: cookieHeader(), Accept: "application/json", ...headers };
    if (tenant) h["X-Tenant-Id"] = tenant;
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    let data;
    if (body !== undefined) {
      if (typeof body === "string") { data = body; h["Content-Type"] = h["Content-Type"] || "application/x-www-form-urlencoded"; }
      else { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
      h["Content-Length"] = Buffer.byteLength(data);
    }
    const req = http.request({ ...BASE, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: res.statusCode, text: d, json: j }); });
    });
    req.on("error", reject); if (data) req.write(data); req.end();
  });
}
async function login(user, pass) {
  await request("GET", "/csrf");
  const r = await request("POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}` });
  await request("GET", "/csrf");
  return r.status;
}
module.exports = { request, login, jar };
