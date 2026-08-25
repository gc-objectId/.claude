const { req, login } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
(async () => {
  await login("admin", "admin");
  const p = await req("POST", "/api/admin/patients/", { prmnPrefix: "gc2755c", firstName: "Doxy", lastName: "Case", weight: "70 kg", height: "165 cm", dob: "1990-05-05", gender: "FEMALE" }, T);
  const { pmrn, uuid } = JSON.parse(p.body);
  const start = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const o = await req("POST", `/api/admin/patients/${uuid}/operations/create`, { startTime: start, procedureTypes: [{ id: "p-dilation-and-curettage" }] }, T);
  const op = JSON.parse(o.body);
  console.log("op", o.status, JSON.stringify({ pmrn, uuid, caseId: op.caseId }));
})();
