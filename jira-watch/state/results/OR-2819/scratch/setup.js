const { login, req } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
(async () => {
  const { jar } = await login("admin", "admin");
  async function mk(prefix) {
    const p = await req(jar, "POST", "/api/admin/patients/", { json: { prmnPrefix: prefix, firstName: "Loop", lastName: prefix }, headers: T });
    const pd = JSON.parse(p.body);
    const o = await req(jar, "POST", `/api/admin/patients/${pd.uuid}/operations/create`, {
      json: { startTime: new Date(Date.now() + 3600000).toISOString(), procedureTypes: [{ id: "p-appendectomy", qualifier: null }] }, headers: T });
    return { patient: pd, opStatus: o.status, op: o.body };
  }
  console.log(JSON.stringify(await mk("A"), null, 1));
  console.log(JSON.stringify(await mk("B"), null, 1));
})();
