const http = require("http");
const BASE = { host: "127.0.0.1", port: 61325 };
const jar = {};

function setCookies(res) {
  const sc = res.headers["set-cookie"] || [];
  sc.forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
}
function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}
function req(method, path, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({}, extraHeaders || {});
    let payload = null;
    if (body !== undefined && body !== null) {
      if (typeof body === "string") { payload = body; headers["Content-Type"] = headers["Content-Type"] || "application/x-www-form-urlencoded"; }
      else { payload = JSON.stringify(body); headers["Content-Type"] = "application/json"; }
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    if (Object.keys(jar).length) headers["Cookie"] = cookieHeader();
    if (jar["XSRF-TOKEN"]) headers["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request(Object.assign({}, BASE, { method, path, headers }), res => {
      setCookies(res);
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}
async function login(user, pass) {
  jar["JSESSIONID"] && delete jar["JSESSIONID"];
  await req("GET", "/csrf");
  const res = await req("POST", "/api/login/basic", `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
  await req("GET", "/csrf");
  return res;
}
module.exports = { req, login, jar };
