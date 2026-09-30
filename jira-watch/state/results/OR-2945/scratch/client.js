const http = require("http");
const BASE = { host: "127.0.0.1", port: 65532 };
function makeClient() {
  const jar = {};
  function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  function req(method, path, { body, headers = {}, form = false } = {}) {
    return new Promise((resolve, reject) => {
      const h = { Cookie: cookieHeader(), ...headers };
      let payload;
      if (body !== undefined) {
        payload = form ? new URLSearchParams(body).toString() : JSON.stringify(body);
        h["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json";
        h["Content-Length"] = Buffer.byteLength(payload);
      }
      if (jar["XSRF-TOKEN"]) h["X-XSRF-TOKEN"] = jar["XSRF-TOKEN"];
      const r = http.request({ ...BASE, method, path, headers: h }, res => {
        (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
        let d = ""; res.on("data", c => d += c); res.on("end", () => {
          let json = null; try { json = JSON.parse(d); } catch {}
          resolve({ status: res.statusCode, headers: res.headers, text: d, json });
        });
      });
      r.on("error", reject);
      if (payload) r.write(payload);
      r.end();
    });
  }
  async function login(username, password) {
    await req("GET", "/csrf");
    const r = await req("POST", "/api/login/basic", { body: { username, password }, form: true });
    await req("GET", "/csrf");
    return r.status;
  }
  return { req, login, jar };
}
module.exports = { makeClient };
