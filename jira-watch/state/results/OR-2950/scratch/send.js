const { req, hl7 } = require("./api.js");
const [user, token, controlId, headerTenant, paramTenant] = process.argv.slice(2);
(async () => {
  const headers = { "Content-Type": "application/hl7-v2+er7; charset=UTF-8" };
  if (headerTenant) headers["X-Tenant-Id"] = headerTenant;
  const path = "/api/integration/hl7" + (paramTenant ? "?client_id=" + paramTenant : "");
  const r = await req("POST", path, { headers, body: hl7(controlId), auth: user + ":" + token });
  console.log(`[${controlId}] user=${user} header=${headerTenant || "-"} param=${paramTenant || "-"} -> ${r.status} ${r.body.replace(/\r/g, "|").slice(0, 160)}`);
})().catch(e => { console.error("ERR", e); process.exit(1); });
