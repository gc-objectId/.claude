const http = require("http");
const BASE = { host: "127.0.0.1", port: 64369 };
function jar() { return { cookies: {} }; }
function cookieHeader(j) { return Object.entries(j.cookies).map(([k, v]) => k + "=" + v).join("; "); }
function req(j, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    let data = null;
    const h = Object.assign({ Cookie: cookieHeader(j) }, headers);
    if (body !== undefined && body !== null) {
      if (typeof body === "string") { data = body; }
      else { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
      h["Content-Length"] = Buffer.byteLength(data);
    }
    if (j.cookies["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = j.cookies["XSRF-TOKEN"];
    const r = http.request(Object.assign({ method, path, headers: h }, BASE), res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); j.cookies[kv.slice(0, i)] = kv.slice(i + 1); });
        let parsed = d; try { parsed = JSON.parse(d); } catch (e) {}
        resolve({ status: res.statusCode, body: parsed, raw: d });
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}
async function login(user, pw) {
  const j = jar();
  await req(j, "GET", "/csrf");
  const form = "username=" + encodeURIComponent(user) + "&password=" + encodeURIComponent(pw);
  const r = await req(j, "POST", "/api/login/basic", form, { "Content-Type": "application/x-www-form-urlencoded" });
  if (r.status >= 400) throw new Error("login failed " + r.status + " " + r.raw.slice(0, 200));
  await req(j, "GET", "/csrf");
  return j;
}
const T = { "X-Tenant-Id": "demo-demo" };
module.exports = { req, login, T };
