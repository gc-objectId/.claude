const { request, login } = require("./client");
const [T, caseId, rule] = process.argv.slice(2);
(async () => {
  await login("admin", "admin");
  const r = await request("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=${rule || ""}`, { tenant: T });
  for (const f of r.json || []) console.log(f.ruleIdentifier, "details:", JSON.stringify(f.details), "compliance:", JSON.stringify(f.complianceResults), "defaultOverride:", JSON.stringify(f.routeDefaultDoseOverride || f.defaultDoseOverride || null).slice(0,200));
  const n = await request("GET", `/api/admin/rule/evaluations/not-fired?caseId=${caseId}&ruleIdentifier=${rule || ""}`, { tenant: T });
  for (const f of n.json || []) console.log("NOT FIRED", f.ruleIdentifier, JSON.stringify(f.details || f.reason || f).slice(0, 300));
})().catch(e => console.log("ERR", e));
