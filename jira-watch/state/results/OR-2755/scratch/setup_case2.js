const { req, login } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
(async () => {
  await login("admin", "admin");
  const p = await req("POST", "/api/admin/patients/", { prmnPrefix: "gc2755b", firstName: "Eras", lastName: "Diabetic", weight: "80 kg", height: "170 cm", dob: "1962-02-02", gender: "FEMALE" }, T);
  const { pmrn, uuid } = JSON.parse(p.body);
  const c = await req("POST", `/api/admin/patients/${pmrn}/conditions`, { conditionId: "c-type-2-diabetes-mellitus", tags: ["DIABETES"] }, T);
  const start = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const o = await req("POST", `/api/admin/patients/${uuid}/operations/create`, { startTime: start, procedureTypes: [{ id: "p-hysterectomy" }] }, T);
  const op = JSON.parse(o.body);
  console.log("cond", c.status, "op", o.status, "eras?", op.erasOperation);
  console.log(JSON.stringify({ pmrn, uuid, caseId: op.caseId }));
})();
