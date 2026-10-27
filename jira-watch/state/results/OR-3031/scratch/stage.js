const { Session } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
(async () => {
  const admin = new Session();
  console.log("admin login", await admin.login("admin", "admin"));
  const dob = new Date(); dob.setFullYear(dob.getFullYear() - 10);
  let r = await admin.req("POST", "/api/admin/patients/", { headers: T, body: { prmnPrefix: "or3031", firstName: "Test", lastName: "Patient", dob: dob.toISOString().split("T")[0], height: "130 cm", weight: "30 kg", gender: "MALE", genderIdentity: "MALE" } });
  console.log("create patient", r.status, r.body.slice(0, 300));
  const p = JSON.parse(r.body);
  r = await admin.req("POST", `/api/admin/patients/${p.uuid}/operations/create`, { headers: T, body: { procedureTypes: [{ id: "p-gastro-uncomplicated", qualifier: null }], startTime: new Date().toISOString() } });
  console.log("create op", r.status, r.body.slice(0, 300));
  const caseId = JSON.parse(r.body).caseId;
  require("fs").writeFileSync(__dirname + "/case.json", JSON.stringify({ pmrn: p.pmrn, uuid: p.uuid, caseId }));
  console.log("STAGED", p.pmrn, caseId);
})().catch((e) => { console.error(e); process.exit(1); });
