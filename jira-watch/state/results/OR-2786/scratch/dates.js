const c = require("./client");
const [tenant, pmrn, caseId, startTime] = process.argv.slice(2);
(async () => { await c.login();
  const r = await c.request("PUT", `/api/admin/patients/${encodeURIComponent(pmrn)}/operations/${caseId}/dates`, { body: { startTime }, headers: { "X-Tenant-Id": tenant } });
  console.log("dates", r.status, r.body.slice(0, 120)); })();
