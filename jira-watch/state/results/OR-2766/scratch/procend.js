const {req, loginAdmin, xsrf} = require("./client");
const T = { "X-Tenant-Id": "mayo-mayo" };
function h() { return Object.assign({}, T, { "X-XSRF-TOKEN": xsrf() }); }
(async () => {
  await loginAdmin();
  const p = JSON.parse((await req("POST", "/api/admin/patients/", { prmnPrefix: "or2766pe", firstName: "Proc", lastName: "End" }, h())).body);
  const now = Date.now();
  const start = new Date(now - 10 * 60 * 1000);
  const op = JSON.parse((await req("POST", `/api/admin/patients/${p.uuid}/operations/create`,
    { startTime: start.toISOString(), procedureTypes: [{ id: "p-appendectomy", qualifier: null }] }, h())).body);
  const admin = new Date(start.getTime() + 60 * 1000);
  const b = await req("POST", `/api/admin/bolus/patient/${p.pmrn}/${op.caseId}`,
    { medicationId: "m-insulin-regular", administrationDate: admin.toISOString(), doseAmount: "5", doseUnits: "units", route: "INTRAVENOUS" }, h());
  console.log(JSON.stringify({ pmrn: p.pmrn, caseId: op.caseId, bolus: b.status }));
})();
