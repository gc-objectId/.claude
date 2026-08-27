const {req, loginAdmin, xsrf} = require("./client");
const T = { "X-Tenant-Id": "mayo-mayo" };
function h() { return Object.assign({}, T, { "X-XSRF-TOKEN": xsrf() }); }
(async () => {
  await loginAdmin();
  const p = await req("POST", "/api/admin/patients/", { prmnPrefix: "or2766", firstName: "Glu", lastName: "Check" }, h());
  console.log("createPatient", p.status, p.body);
  if (p.status !== 200) return;
  const pat = JSON.parse(p.body);
  const start = new Date(Date.now() - 30 * 60 * 1000);
  const op = await req("POST", `/api/admin/patients/${pat.uuid}/operations/create`,
    { startTime: start.toISOString(), procedureTypes: [{ id: "p-appendectomy", qualifier: null }] }, h());
  console.log("createOperation", op.status, op.body);
})();
