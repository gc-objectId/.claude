const http = require("http");
const fs = require("fs");
const { execSync } = require("child_process");
const BASE = { host: "127.0.0.1", port: 49308 };
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "); }
function req(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ ...BASE, method, path, headers: { Cookie: cookieHeader(), ...headers } }, res => {
      (res.headers["set-cookie"] || []).forEach(c => { const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    r.on("error", reject); if (body) r.write(body); r.end();
  });
}
async function login() {
  await req("GET", "/csrf", {});
  const form = "username=admin&password=admin";
  const l = await req("POST", "/api/login/basic", { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(form), "X-XSRF-TOKEN": jar["XSRF-TOKEN"] }, form);
  await req("GET", "/csrf", {});
  return l.status;
}
async function send(raw) {
  const body = JSON.stringify({ rawMessage: raw });
  return req("POST", "/api/admin/hl7-inbound-messages/send", { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "X-Tenant-Id": "mayo-mayo", "X-XSRF-TOKEN": jar["XSRF-TOKEN"] }, body);
}
function pad(n) { return String(n).padStart(2, "0"); }
function ras(pmrn, i, tag) {
  let m = fs.readFileSync(__dirname + "/ras.hl7", "utf8").replace(/\r?\n/g, "\r").replace(/\r$/, "");
  m = m.replace("11282019^^^MC^MC", `${pmrn}^^^MC^MC`).replace("|78665|", `|${tag}R${i}|`)
       .replace("RXA|0|3|20260512143800", `RXA|0|${i + 1}|2026051214${pad(i)}00`).replace("Given||20260512143853", `Given||2026051214${pad(i)}05`);
  return m;
}
function oru(pmrn, i, tag) {
  let m = fs.readFileSync(__dirname + "/oru.hl7", "utf8").replace(/\r?\n/g, "\r").replace(/\r$/, "");
  m = m.replace("11291855^^^MC^MC", `${pmrn}^^^MC^MC`).replace("|194177|", `|${tag}O${i}|`)
       .replace(/2222006537777/g, `2222${tag}${i}`).replace(/20260507080000/g, `2026050708${pad(i)}00`).replace("ABO GROUP, B||O", `ABO GROUP, B||O${i}`);
  return m;
}
(async () => {
  const [cmd, pmrn, nRas, nOru, tag, offArg] = process.argv.slice(2); const off = +(offArg || 0);
  console.log("login:", await login());
  if (cmd === "burst") {
    const msgs = [];
    for (let i = off; i < off + +nRas; i++) msgs.push(["RAS", ras(pmrn, i, tag)]);
    for (let i = off; i < off + +nOru; i++) msgs.push(["ORU", oru(pmrn, i, tag)]);
    const t0 = Date.now();
    const results = await Promise.all(msgs.map(([k, m]) => send(m).then(r => ({ k, status: r.status, ack: (r.body.match(/MSA\|(\w+)/) || [])[1] }))));
    console.log(`sent ${msgs.length} in ${Date.now() - t0}ms`, JSON.stringify(results));
  } else if (cmd === "one") {
    const m = nRas === "oru" ? oru(pmrn, +nOru, tag) : ras(pmrn, +nOru, tag);
    const r = await send(m); console.log(r.status, r.body.slice(0, 200));
  }
})();
