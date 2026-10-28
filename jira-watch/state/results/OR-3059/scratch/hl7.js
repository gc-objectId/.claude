const http = require("http");
const jar = {};
function req(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
    const r = http.request({ host: "127.0.0.1", port: 53204, method, path, headers: { ...headers, Cookie: cookie } }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    r.on("error", reject); if (body) r.write(body); r.end();
  });
}
async function main() {
  await req("GET", "/csrf", {});
  const login = await req("POST", "/api/login/basic", { "Content-Type": "application/x-www-form-urlencoded", "X-XSRF-TOKEN": jar["XSRF-TOKEN"] }, "username=admin&password=admin");
  console.error("login", login.status);
  await req("GET", "/csrf", {});
  const files = process.argv.slice(2);
  for (const f of files) {
    const raw = require("fs").readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).join("\r");
    const res = await req("POST", "/api/admin/hl7-inbound-messages/send", { "Content-Type": "application/json", "X-Tenant-Id": "mayo-mayo", "X-XSRF-TOKEN": jar["XSRF-TOKEN"] }, JSON.stringify({ rawMessage: raw }));
    console.log(f.split("/").pop(), res.status, res.body.slice(0, 300));
  }
}
main().catch(e => { console.error("ERR", e); process.exit(1); });
