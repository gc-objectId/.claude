const http = require("http");
const BASE = { host: "127.0.0.1", port: 52629 };
function makeClient() {
  const jar = {};
  function cookieHeader() { return Object.entries(jar).map(([k, v]) => k + "=" + v).join("; "); }
  function call(method, path, { headers = {}, body, form } = {}) {
    return new Promise((resolve, reject) => {
      let data = body;
      const h = { ...headers, Cookie: cookieHeader() };
      if (form) { data = new URLSearchParams(form).toString(); h["Content-Type"] = "application/x-www-form-urlencoded"; }
      else if (body && typeof body !== "string") { data = JSON.stringify(body); h["Content-Type"] = "application/json"; }
      if (data) h["Content-Length"] = Buffer.byteLength(data);
      const req = http.request({ ...BASE, method, path, headers: h }, (res) => {
        let d = ""; res.on("data", (c) => (d += c));
        res.on("end", () => {
          const sc = res.headers["set-cookie"] || [];
          for (const c of sc) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); }
          let json = null; try { json = JSON.parse(d); } catch {}
          resolve({ status: res.statusCode, headers: res.headers, text: d, json, setCookie: sc });
        });
      });
      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    });
  }
  async function csrf() { const r = await call("GET", "/csrf"); return { headerName: r.json.headerName, token: jar["XSRF-TOKEN"] }; }
  async function login(username, password) {
    const c = await csrf();
    const r = await call("POST", "/api/login/basic", { form: { username, password }, headers: { [c.headerName]: c.token } });
    if (r.status >= 300) throw new Error("login failed " + r.status + " " + r.text);
    return r;
  }
  async function mutate(method, path, opts = {}) { const c = await csrf(); return call(method, path, { ...opts, headers: { ...(opts.headers || {}), [c.headerName]: c.token } }); }
  return { call, login, mutate, jar };
}
module.exports = { makeClient };
