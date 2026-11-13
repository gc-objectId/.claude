const { Client } = require("./http.js");
(async () => {
  const [pmrn, caseId, mode] = process.argv.slice(2);
  const c = new Client("demo-demo");
  await c.login("admin", "admin");
  if (mode !== "read") {
    const e = await c.request("POST", "/api/admin/events/category-event", { body: { sourceEventType: "manual", eventCategories: ["PROCEDURE_START"], patientId: pmrn, caseId, date: new Date().toISOString() } });
    console.log("event", e.status, e.text.slice(0, 100));
  }
  const f = await c.request("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=a-incomplete-antibiotic-pathway`);
  const n = await c.request("GET", `/api/admin/rule/evaluations/not-fired?caseId=${caseId}&ruleIdentifier=a-incomplete-antibiotic-pathway`);
  console.log("FIRED", f.status, JSON.stringify((f.json || []).map(r => ({ title: r.prompt && r.prompt.title, description: r.prompt && r.prompt.description, details: r.details && { PATHWAY_STATUS: r.details.PATHWAY_STATUS } })), null, 1));
  console.log("NOT_FIRED", n.status, JSON.stringify((n.json || []).map(r => ({ reason: r.reason || r.explanation || r.description, raw: Object.keys(r) }))));
})().catch(e => { console.error(e); process.exit(1); });
