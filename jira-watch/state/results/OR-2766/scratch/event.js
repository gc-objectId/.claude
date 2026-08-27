const {req, loginAdmin, xsrf} = require("./client");
const T = { "X-Tenant-Id": "mayo-mayo" };
function h() { return Object.assign({}, T, { "X-XSRF-TOKEN": xsrf() }); }
const [pmrn, caseId, cats, dateIso] = process.argv.slice(2);
(async () => {
  await loginAdmin();
  const r = await req("POST", "/api/admin/events/category-event",
    { sourceEventType: "OR2766_VALIDATION", eventCategories: cats.split(","), patientId: pmrn, caseId, date: dateIso }, h());
  console.log("event", r.status, r.body.slice(0, 400));
})();
