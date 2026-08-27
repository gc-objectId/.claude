const {req, loginAdmin, xsrf} = require("./client");
const T = { "X-Tenant-Id": "mayo-mayo" };
function h() { return Object.assign({}, T, { "X-XSRF-TOKEN": xsrf() }); }
const [pmrn, caseId, adminIso] = process.argv.slice(2);
(async () => {
  await loginAdmin();
  const r = await req("POST", `/api/admin/bolus/patient/${pmrn}/${caseId}`,
    { medicationId: "m-insulin-regular", administrationDate: adminIso, doseAmount: "5", doseUnits: "units", route: "INTRAVENOUS" }, h());
  console.log("bolus", r.status, r.body.slice(0, 300));
})();
