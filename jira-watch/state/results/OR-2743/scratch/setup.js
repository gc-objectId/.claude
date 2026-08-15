const c = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
const PMRN = "patient-2", CASE = "10001";
const ago = m => new Date(Date.now() - m * 60000).toISOString();

(async () => {
  await c.login("admin", "admin");
  const body = {
    medicationId: "m-insulin-regular",
    medAdminId: null,
    route: "INTRAVENOUS",
    concentrationOptionIndex: 0,
    events: [
      { eventType: "START", eventDate: ago(180), rateAmount: "1.0", rateUnits: "units/hr", doseAmount: "1.0", doseUnits: "units" }
    ]
  };
  const r = await c.req("POST", `/api/admin/infusion/patient/${PMRN}/${CASE}`, body, T);
  console.log("infusion", r.status, r.body.slice(0, 500));
})();
