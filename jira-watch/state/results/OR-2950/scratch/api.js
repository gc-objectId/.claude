const http = require("http");
const BASE = { host: "127.0.0.1", port: 59027 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, { headers = {}, body = null, auth = null } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    if (Object.keys(jar).length) h["Cookie"] = cookieHeader();
    if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
    if (auth) h["Authorization"] = "Basic " + Buffer.from(auth).toString("base64");
    if (body != null) h["Content-Length"] = Buffer.byteLength(body);
    const r = http.request({ ...BASE, method, path, headers: h }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject);
    if (body != null) r.write(body);
    r.end();
  });
}
async function adminLogin() {
  await req("GET", "/csrf");
  const r = await req("POST", "/api/login/basic", { headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "username=admin&password=admin" });
  if (r.status >= 400) throw new Error("login failed " + r.status + " " + r.body);
  await req("GET", "/csrf");
  return r.status;
}
function hl7(controlId, facility = "FAC", app = "APP", pid = "99000001") {
  const ts = "20261014120000";
  return ["MSH|^~\\&|" + app + "|" + facility + "|ORCI|ORCI|" + ts + "||ADT^A01|" + controlId + "|P|2.3",
    "EVN|A01|" + ts,
    "PID|1||" + pid + "^^^MRN||TESTPAT^OR2950||19800101|M",
    "PV1|1|I|OR^1^1"].join("\r") + "\r";
}
module.exports = { req, adminLogin, hl7, jar };
