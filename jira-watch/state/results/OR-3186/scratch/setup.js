const { req, login } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
(async () => {
  console.log("admin login", (await login("admin", "admin")).status);
  const p = await req("POST", "/api/admin/patients/", { headers: T, body: JSON.stringify({ prmnPrefix: "or3186", firstName: "Stage", lastName: "Prefix", dob: "1980-01-01", height: "170", weight: "70", gender: "FEMALE", genderIdentity: "FEMALE" }) });
  console.log("create patient", p.status, p.body.slice(0, 300));
  const { pmrn, uuid } = JSON.parse(p.body);
  const o = await req("POST", `/api/admin/patients/${uuid}/operations/create`, { headers: T, body: JSON.stringify({ startTime: new Date().toISOString(), procedureTypes: [] }) });
  console.log("create operation", o.status, o.body.slice(0, 400));
  console.log("PMRN", pmrn);
})();
