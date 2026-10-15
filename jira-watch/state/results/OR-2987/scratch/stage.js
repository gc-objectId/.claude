const { makeClient } = require("./client");
const fs = require("fs");
(async () => {
  const c = makeClient("demo-demo");
  await c.login("admin", "admin");
  const p = await c.request("POST", "/api/admin/patients/", { body: { prmnPrefix: "or2987", firstName: "Scan", lastName: "Test", dob: "1980-01-01", weight: "80 kg", height: "180 cm", gender: "MALE", genderIdentity: "MALE" } });
  console.log("patient", p.status, p.body);
  const { pmrn, uuid } = JSON.parse(p.body);
  const o = await c.request("POST", `/api/admin/patients/${uuid}/operations/create`, { body: { startTime: new Date().toISOString(), procedureTypes: [{ id: "p-angiogram-arm" }] } });
  console.log("operation", o.status, o.body.slice(0, 300));
  const caseId = JSON.parse(o.body).caseId;
  fs.writeFileSync(__dirname + "/case.json", JSON.stringify({ pmrn, uuid, caseId }));
})();
