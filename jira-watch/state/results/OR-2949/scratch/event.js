const c = require("./client.js");
const [pmrn, caseId, cats] = process.argv.slice(2);
(async () => {
  await c.login();
  const r = await c.request("POST", "/api/admin/events/category-event", { headers: { "X-Tenant-Id": "demo-demo" }, body: { sourceEventType: "manual", eventCategories: cats.split(","), patientId: pmrn, caseId, date: new Date().toISOString() } });
  console.log("event", r.status, r.body.slice(0, 200));
})().catch(e => { console.error("ERR", e); process.exit(1); });
