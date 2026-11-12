// usage: node api.js login | node api.js METHOD /path [jsonBody] [tenant]
const http = require("http"); const fs = require("fs"); const path = require("path");
const JAR = path.join(__dirname, "cookies.json");
const BASE = { host: "127.0.0.1", port: 62468 };
const jar = fs.existsSync(JAR) ? JSON.parse(fs.readFileSync(JAR)) : {};
function save() { fs.writeFileSync(JAR, JSON.stringify(jar)); }
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, p, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const h = { Cookie: cookieHeader(), ...headers };
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    let data; if (body !== undefined) { data = typeof body === "string" ? body : JSON.stringify(body); h["Content-Type"] = headers["Content-Type"] || "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
    const r = http.request({ ...BASE, method, path: p, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); }); save();
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    r.on("error", reject); if (data) r.write(data); r.end();
  });
}
async function login(user = "admin", pass = "admin") {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`, { "Content-Type": "application/x-www-form-urlencoded" });
  await req("GET", "/csrf");
  return r;
}
(async () => {
  const [, , cmd, p, body, tenant] = process.argv;
  if (cmd === "login") { const r = await login(p || "admin", body || "admin"); console.log(r.status, r.body.slice(0, 200)); return; }
  const r = await req(cmd, p, body !== undefined && body !== "" ? JSON.parse(body) : undefined, { "X-Tenant-Id": tenant || "demo-demo" });
  console.log(r.status); console.log(r.body);
})().catch(e => { console.error("ERR", e); process.exit(1); });
