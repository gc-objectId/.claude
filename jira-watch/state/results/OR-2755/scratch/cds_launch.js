const { req, login } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
const [pmrn, caseId] = process.argv.slice(2);
(async () => {
  console.log("login", (await login("loopuser", "LoopValidate1!")).status);
  const r = await req("POST", `/api/cds/app-launch/${pmrn}/${caseId}`, { patientId: pmrn, caseId, mode: "INTERACTIVE", timeZone: "America/New_York" }, T);
  console.log("cds app-launch", r.status);
  try {
    const j = JSON.parse(r.body);
    console.log("alerts:", JSON.stringify((j.alerts || []).map(a => ({ id: a.ruleIdentifier || a.ruleId, type: a.type, title: a.title })), null, 1));
  } catch (e) { console.log(r.body.slice(0, 800)); }
})();
