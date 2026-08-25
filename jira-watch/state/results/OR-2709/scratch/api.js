const http = require("http");
const BASE = { host: "127.0.0.1", port: 62666 };
const jar = {};

function setCookies(res) {
  const sc = res.headers["set-cookie"] || [];
  for (const c of sc) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
}
function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}
function req(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = { Cookie: cookieHeader(), ...extraHeaders };
    let data = null;
    if (body !== undefined && body !== null) {
      if (typeof body === "string") {
        data = body;
        headers["Content-Type"] = headers["Content-Type"] || "application/x-www-form-urlencoded";
      } else {
        data = JSON.stringify(body);
        headers["Content-Type"] = "application/json";
      }
      headers["Content-Length"] = Buffer.byteLength(data);
    }
    if (jar["XSRF-TOKEN"]) headers["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request({ ...BASE, method, path, headers }, (res) => {
      setCookies(res);
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => resolve({ status: res.statusCode, body: b, headers: res.headers }));
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}
async function login(user, pass, tenant) {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic",
    `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
    tenant ? { "X-Tenant-Id": tenant } : {});
  await req("GET", "/csrf");
  return r;
}
module.exports = { req, login, jar };
