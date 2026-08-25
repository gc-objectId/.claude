const http = require("http");
const BASE = { host: "127.0.0.1", port: 60489 };
const jar = {};

function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function req(method, path, { body, headers = {}, form } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    if (Object.keys(jar).length) h["Cookie"] = cookieHeader();
    let payload = null;
    if (form) { payload = new URLSearchParams(form).toString(); h["Content-Type"] = "application/x-www-form-urlencoded"; }
    else if (body !== undefined) { payload = JSON.stringify(body); h["Content-Type"] = "application/json"; }
    if (payload) h["Content-Length"] = Buffer.byteLength(payload);
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request({ ...BASE, method, path, headers: h }, (res) => {
      (res.headers["set-cookie"] || []).forEach((c) => {
        const [kv] = c.split(";");
        const i = kv.indexOf("=");
        const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
        if (v === "" ) delete jar[k]; else jar[k] = v;
      });
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function login(user, pass) {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { form: { username: user, password: pass } });
  await req("GET", "/csrf");
  return r;
}

module.exports = { req, login, jar };
