const {req, loginAdmin, xsrf} = require("./client");
const T = { "X-Tenant-Id": "mayo-mayo" };
function h() { return Object.assign({}, T, { "X-XSRF-TOKEN": xsrf() }); }
const prefix = process.argv[2];
const closed = process.argv[3] === "closed";
(async () => {
  await loginAdmin();
  const p = JSON.parse((await req("POST", "/api/admin/patients/", { prmnPrefix: prefix, firstName: "Glu", lastName: "Red" }, h())).body);
  const now = Date.now();
  const start = new Date(now - 3 * 3600 * 1000);
  const op = JSON.parse((await req("POST", `/api/admin/patients/${p.uuid}/operations/create`,
    { startTime: start.toISOString(), procedureTypes: [{ id: "p-appendectomy", qualifier: null }] }, h())).body);
  if (closed) {
    const end = new Date(now - 2 * 3600 * 1000);
    const u = await req("PUT", `/api/admin/patients/${p.pmrn}/operations/${op.caseId}/dates`, { endTime: end.toISOString() }, h());
    console.log("closeCase", u.status, JSON.parse(u.body).endTime);
  }
  const admin = new Date(start.getTime() + 60 * 1000);
  const b = await req("POST", `/api/admin/bolus/patient/${p.pmrn}/${op.caseId}`,
    { medicationId: "m-insulin-regular", administrationDate: admin.toISOString(), doseAmount: "5", doseUnits: "units", route: "INTRAVENOUS" }, h());
  console.log(JSON.stringify({ pmrn: p.pmrn, caseId: op.caseId, start: start.toISOString(), admin: admin.toISOString(), bolus: b.status }));
})();
