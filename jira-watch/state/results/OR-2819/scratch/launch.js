const { login, req } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
const [pmrn, caseId] = process.argv.slice(2);
(async () => {
  const { jar, res } = await login("loopuser", "LoopValidate1!");
  console.log("login", res.status);
  const r = await req(jar, "POST", "/api/app-launch", { json: { patientId: pmrn, caseId }, headers: T });
  console.log("STATUS", r.status);
  console.log(r.body.slice(0, 600));
})();
