const fs = require("fs");
const { req, login } = require("./client");

(async () => {
  await login("admin", "admin");
  const file = process.argv[2];
  const tenant = process.argv[3] || "mayo-mayo";
  let raw = fs.readFileSync(file, "utf8").replace(/\r/g, "").split("\n").filter(l => l.trim()).join("\r");
  const r = await req("POST", "/api/admin/hl7-inbound-messages/send",
    { body: JSON.stringify({ rawMessage: raw }), headers: { "X-Tenant-Id": tenant } });
  console.log(r.status, r.body.slice(0, 500));
})().catch(e => console.log("ERR", e));
