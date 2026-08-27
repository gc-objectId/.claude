const http = require("http");
const BASE = { host: "127.0.0.1", port: 54681 };
let jar = {};
function cookieHeader() { return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join("; "); }
function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const h = Object.assign({}, headers);
    if (Object.keys(jar).length) h["Cookie"] = cookieHeader();
    if (body && !h["Content-Type"]) h["Content-Type"] = "application/json";
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        const sc = res.headers["set-cookie"] || [];
        sc.forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0,i)] = kv.slice(i+1); });
        resolve({ status: res.statusCode, body: d, headers: res.headers });
      });
    });
    r.on("error", reject);
    if (body) r.write(typeof body === "string" ? body : JSON.stringify(body));
    r.end();
  });
}
async function loginAdmin(user = "admin", pass = "admin") {
  await req("GET", "/csrf");
  const res = await req("POST", "/api/login/basic", `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
    { "Content-Type": "application/x-www-form-urlencoded", "X-XSRF-TOKEN": jar["XSRF-TOKEN"] });
  await req("GET", "/csrf");
  return res;
}
function xsrf() { return jar["XSRF-TOKEN"]; }
module.exports = { req, loginAdmin, xsrf, jar };
