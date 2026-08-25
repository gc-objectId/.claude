const http = require("http");
const HOST = "127.0.0.1", PORT = 62333;
const jar = {};

function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}
function req(method, path, { body, headers = {}, type } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    if (Object.keys(jar).length) h["Cookie"] = cookieHeader();
    if (body) {
      h["Content-Type"] = type || "application/json";
      h["Content-Length"] = Buffer.byteLength(body);
    }
    const r = http.request({ host: HOST, port: PORT, method, path, headers: h }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        for (const sc of res.headers["set-cookie"] || []) {
          const [kv] = sc.split(";");
          const i = kv.indexOf("=");
          jar[kv.slice(0, i)] = kv.slice(i + 1);
        }
        resolve({ status: res.statusCode, body: d, headers: res.headers });
      });
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}
async function loginAdmin(user = "admin", pass = "admin") {
  await req("GET", "/csrf");
  const login = await req("POST", "/api/login/basic", {
    body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
    type: "application/x-www-form-urlencoded",
    headers: { "X-XSRF-TOKEN": jar["XSRF-TOKEN"] },
  });
  await req("GET", "/csrf");
  return login;
}
async function sendHl7(raw, tenant = "mayo-mayo") {
  return req("POST", "/api/admin/hl7-inbound-messages/send", {
    body: JSON.stringify({ rawMessage: raw }),
    headers: { "X-XSRF-TOKEN": jar["XSRF-TOKEN"], "X-Tenant-Id": tenant },
  });
}
module.exports = { req, loginAdmin, sendHl7, jar };
