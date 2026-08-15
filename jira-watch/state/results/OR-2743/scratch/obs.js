const c = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
const PMRN = "patient-2", CASE = "10001";
const ago = m => new Date(Date.now() - m * 60000).toISOString();

async function addObs(type, value, units, whenMinAgo) {
  const r = await c.req("POST", `/api/admin/observations/patient/${PMRN}/case/${CASE}`,
    { type, value, units, date: ago(whenMinAgo) }, T);
  console.log("obs", type, JSON.stringify(value), r.status, r.body.slice(0, 200));
}
module.exports = { addObs, c, T, PMRN, CASE, ago };
if (require.main === module) {
  (async () => {
    await c.login("admin", "admin");
    const [type, value, units, when] = process.argv.slice(2);
    await addObs(type, value, units || null, Number(when || 0));
  })();
}
