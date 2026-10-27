const { Session } = require("./client");
const fs = require("fs");
const T = { "X-Tenant-Id": "demo-demo" };
const c = JSON.parse(fs.readFileSync(__dirname + "/case.json"));
(async () => {
  const admin = new Session();
  await admin.login("admin", "admin");
  let r = await admin.req("POST", `/api/admin/bolus/patient/${c.pmrn}/${c.caseId}`, { headers: T, body: { medicationId: "m-bupivacaine", administrationDate: new Date().toISOString(), doseAmount: "12", doseUnits: "mg", route: "NERVE_BLOCK", concentrationOptionIndex: 1 } });
  console.log("bolus", r.status, r.body.slice(0, 300));
  r = await admin.req("GET", `/api/admin/patients/${c.pmrn}/operations/${c.caseId}/medication-administrations`, { headers: T });
  console.log("admins", r.status, r.body.slice(0, 400));
})().catch((e) => { console.error(e); process.exit(1); });
