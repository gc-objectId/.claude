const http = require("http");
const HOST = "127.0.0.1", PORT = 62189;
let jar = {};

function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function req(method, path, { body, headers = {}, contentType } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    if (Object.keys(jar).length) h["Cookie"] = cookieHeader();
    if (body) {
      h["Content-Type"] = contentType || "application/json";
      h["Content-Length"] = Buffer.byteLength(body);
    }
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request({ host: HOST, port: PORT, path, method, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => {
        const [kv] = c.split(";");
        const i = kv.indexOf("=");
        const k = kv.slice(0, i), v = kv.slice(i + 1);
        if (v === "") delete jar[k]; else jar[k] = v;
      });
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

async function login(user, pass) {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic",
    { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
      contentType: "application/x-www-form-urlencoded" });
  await req("GET", "/csrf");
  return r;
}

module.exports = { req, login, jar };
