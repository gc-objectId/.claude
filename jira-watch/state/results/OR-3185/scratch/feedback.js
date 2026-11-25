const { req, login } = require("./client");
(async () => {
  const l = await login("loopuser", "LoopValidate1!");
  const tenant = "demo-demo", patientId = "patient-1", caseId = "case-3185";
  const h = { "X-Tenant-Id": tenant };
  if (process.argv[2] === "launch") {
    const a = await req("POST", "/api/app-launch", { body: JSON.stringify({ patientId, caseId }), headers: h });
    console.log("app-launch", a.status, a.body.slice(0, 200));
  }
  const r = await req("POST", "/api/feedback",
    { body: JSON.stringify({ patientId, caseId, comment: "OR-3185 validation " + new Date().toISOString() }), headers: h });
  console.log("feedback", r.status, r.body.slice(0, 300));
})().catch(e => { console.error(e); process.exit(1); });
