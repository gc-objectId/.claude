const { Client } = require("./http.js");
(async () => {
  const [pmrn, caseId] = process.argv.slice(2);
  const c = new Client("demo-demo"); await c.login("admin", "admin");
  const e = await c.request("POST", "/api/admin/events/category-event", { body: { sourceEventType: "manual", eventCategories: ["CLOSE_APP"], patientId: pmrn, caseId, date: new Date().toISOString() } });
  console.log("close", e.status, e.text.slice(0, 80));
  const f = await c.request("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=a-incomplete-antibiotic-pathway`);
  console.log("compliance", JSON.stringify((f.json || []).map(r => r.complianceResults)));
})().catch(e => { console.error(e); process.exit(1); });
