const { req, login } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
(async () => {
  await login("admin", "admin");
  const p = await req("POST", "/api/admin/patients/", { prmnPrefix: "gc2755d", firstName: "Post", lastName: "Restore", weight: "75 kg", height: "172 cm", dob: "1958-08-08", gender: "MALE" }, T);
  const { pmrn, uuid } = JSON.parse(p.body);
  await req("POST", `/api/admin/patients/${pmrn}/conditions`, { conditionId: "c-diabetes-mellitus", tags: ["DIABETES"] }, T);
  const start = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const o = await req("POST", `/api/admin/patients/${uuid}/operations/create`, { startTime: start, procedureTypes: [{ id: "p-appendectomy" }] }, T);
  console.log(JSON.stringify({ pmrn, caseId: JSON.parse(o.body).caseId }));
})();
