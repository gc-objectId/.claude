const {req, loginAdmin, xsrf} = require("./client");
const T = { "X-Tenant-Id": "mayo-mayo" };
function h() { return Object.assign({}, T, { "X-XSRF-TOKEN": xsrf() }); }
const prefix = process.argv[2];
(async () => {
  await loginAdmin();
  const p = JSON.parse((await req("POST", "/api/admin/patients/", { prmnPrefix: prefix, firstName: "Inf", lastName: "Case" }, h())).body);
  const now = Date.now();
  const start = new Date(now - 3 * 3600 * 1000);
  const op = JSON.parse((await req("POST", `/api/admin/patients/${p.uuid}/operations/create`,
    { startTime: start.toISOString(), procedureTypes: [{ id: "p-appendectomy", qualifier: null }] }, h())).body);
  const evStart = new Date(start.getTime() + 60 * 1000);
  const r = await req("POST", `/api/admin/infusion/patient/${p.pmrn}/${op.caseId}`, {
    medicationId: "m-insulin-regular",
    route: "INTRAVENOUS",
    events: [{ eventType: "START", eventDate: evStart.toISOString(), rateAmount: "2", rateUnits: "units/hr", doseAmount: "2", doseUnits: "units/hr" }]
  }, h());
  console.log(JSON.stringify({ pmrn: p.pmrn, caseId: op.caseId, start: start.toISOString(), infusionStart: evStart.toISOString(), status: r.status, body: r.body.slice(0,200) }));
})();
