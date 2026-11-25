const { req, login } = require("./client");
const [,, tenant, patientId, caseId, comment] = process.argv;
(async () => {
  console.log("loopuser login", (await login("loopuser", "LoopValidate1!")).status);
  const r = await req("POST", "/api/feedback", { body: JSON.stringify({ patientId, caseId, comment }), headers: { "X-Tenant-Id": tenant } });
  console.log("POST /api/feedback", r.status, r.body.slice(0, 200));
})();
