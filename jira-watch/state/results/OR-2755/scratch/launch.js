const { req, login } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
const [pmrn, caseId] = process.argv.slice(2);
(async () => {
  console.log("login", (await login("loopuser", "LoopValidate1!")).status);
  const r = await req("POST", "/api/app-launch", { patientId: pmrn, caseId }, T);
  console.log("app-launch", r.status);
  try {
    const j = JSON.parse(r.body);
    const alerts = (j.alerts || j.guidance || []);
    console.log("keys:", Object.keys(j).join(","));
    console.log(JSON.stringify(alerts, null, 1).slice(0, 1500));
  } catch (e) { console.log(r.body.slice(0, 1000)); }
})();
