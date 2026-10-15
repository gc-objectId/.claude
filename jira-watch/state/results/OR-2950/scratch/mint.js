const { req, adminLogin } = require("./api.js");
(async () => {
  console.log("login", await adminLogin());
  for (const t of process.argv.slice(2)) {
    const r = await req("POST", "/api/admin/tokens/tenant/" + t, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "OR-2950 validation" }) });
    console.log(t, r.status, r.body);
  }
})().catch(e => { console.error("ERR", e); process.exit(1); });
