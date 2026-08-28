const http = require("http");
const BASE = { host: "127.0.0.1", port: 50453 };

function makeJar() { return {}; }

function req(jar, method, path, { body, json, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const cookieHeader = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
    const h = { ...headers };
    if (cookieHeader) h["Cookie"] = cookieHeader;
    let payload = null;
    if (json !== undefined) { payload = JSON.stringify(json); h["Content-Type"] = "application/json"; }
    else if (body !== undefined) { payload = body; h["Content-Type"] = h["Content-Type"] || "application/x-www-form-urlencoded"; }
    if (payload) h["Content-Length"] = Buffer.byteLength(payload);
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    const r = http.request({ ...BASE, method, path, headers: h }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        const sc = res.headers["set-cookie"] || [];
        sc.forEach((c) => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
        resolve({ status: res.statusCode, headers: res.headers, body: d });
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function login(user, pass) {
  const jar = makeJar();
  await req(jar, "GET", "/csrf");
  const res = await req(jar, "POST", "/api/login/basic", { body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}` });
  await req(jar, "GET", "/csrf");
  return { jar, res };
}

module.exports = { req, login, makeJar };
