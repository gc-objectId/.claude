// usage: node fire.js <pmrn> <caseId>  -> fires ERAS_OPERATION_END, prints a-eras-antiemetics fired/not-fired rows
const { execFileSync } = require("child_process");
const { req, login } = require("./client.js");
const T = "demo-demo";
const sql = s => execFileSync("docker", ["exec", "-i", "orci-loop-or-2983-postgres-1", "psql", "-U", "orci", "-d", "orci", "-At"], { input: s }).toString().trim();
(async () => {
  const [pmrn, caseId] = process.argv.slice(2);
  await login("admin", "admin");
  const ma = await req("GET", `/api/admin/patients/${pmrn}/operations/${caseId}/medication-administrations`, { tenant: T });
  console.log("med-admins seen by app:", ma.status, (() => { try { return JSON.parse(ma.body).map(m => m.medicationName || m.medicationIdentifier || JSON.stringify(m).slice(0, 80)); } catch { return ma.body.slice(0, 200); } })());
  const r = await req("POST", "/api/admin/events/category-event", { tenant: T, body: { sourceEventType: "manual", eventCategories: ["ERAS_OPERATION_END"], patientId: pmrn, caseId, date: new Date().toISOString() } });
  console.log("event:", r.status, r.body.slice(0, 100));
  await new Promise(r => setTimeout(r, 3000));
  console.log("FIRED:\n" + sql(`set search_path to "${T}"; select f.rule_identifier, f.prompt::text from rule_fired_results f join rule_execution_contexts c on c.id=f.rule_execution_context_id join operations o on o.id=c.operation_id where o.case_id='${caseId}' and f.rule_identifier='a-eras-antiemetics';`));
  console.log("NOT FIRED:\n" + sql(`set search_path to "${T}"; select n.rule_identifier, n.explanation from rule_not_fired_results n join rule_execution_contexts c on c.id=n.rule_execution_context_id join operations o on o.id=c.operation_id where o.case_id='${caseId}' and n.rule_identifier='a-eras-antiemetics';`));
})().catch(e => { console.error(e.message); process.exit(1); });
