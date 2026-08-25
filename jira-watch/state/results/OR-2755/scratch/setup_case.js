const { req, login } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };

(async () => {
  console.log("login", (await login("admin", "admin")).status);
  const p = await req("POST", "/api/admin/patients/", { prmnPrefix: "gc2755", firstName: "Cat", lastName: "Egory", weight: "80 kg", height: "175 cm", dob: "1960-04-01", gender: "MALE" }, T);
  console.log("createPatient", p.status, p.body);
  const { pmrn, uuid } = JSON.parse(p.body);
  const c = await req("POST", `/api/admin/patients/${uuid}/conditions`, { conditionId: "c-type-2-diabetes-mellitus" }, T);
  console.log("addCondition", c.status, c.body.slice(0, 200));
  const start = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const o = await req("POST", `/api/admin/patients/${uuid}/operations/create`, { startTime: start, procedureTypes: [{ id: "p-appendectomy" }] }, T);
  console.log("createOperation", o.status, o.body.slice(0, 400));
  const op = JSON.parse(o.body);
  console.log(JSON.stringify({ pmrn, uuid, caseId: op.caseId || op.case_id }));
})();
