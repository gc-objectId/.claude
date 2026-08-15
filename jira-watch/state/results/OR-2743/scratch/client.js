const http = require("http");
const BASE = { host: "127.0.0.1", port: 57959 };
const jar = {};
function setCookies(res) {
  const sc = res.headers["set-cookie"] || [];
  sc.forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0,i)] = kv.slice(i+1); });
}
function cookieHeader() { return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join("; "); }
function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const h = Object.assign({ "Cookie": cookieHeader() }, headers);
    let data = null;
    if (body !== undefined && body !== null) {
      data = typeof body === "string" ? body : JSON.stringify(body);
      if (!h["Content-Type"]) h["Content-Type"] = "application/json";
      h["Content-Length"] = Buffer.byteLength(data);
    }
    if (jar["XSRF-TOKEN"] && !h["X-XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => { setCookies(res); resolve({ status: res.statusCode, headers: res.headers, body: d }); });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}
async function csrf() { return await req("GET", "/csrf"); }
async function csrfBodyToken() { const r = await req("GET", "/csrf"); try { return JSON.parse(r.body).token; } catch(e) { return null; } }
async function login(u, p) {
  await csrf();
  const form = `username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}`;
  const r = await req("POST", "/api/login/basic", form, { "Content-Type": "application/x-www-form-urlencoded" });
  await csrf();
  return r;
}
module.exports = { req, csrf, csrfBodyToken, login, jar };
