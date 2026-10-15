const c = require("./client.js");
const [pmrn, caseId, medId] = process.argv.slice(2);
(async () => {
  console.log("user login", await c.login("loopuser", "LoopValidate1!"));
  const T = { "X-Tenant-Id": "demo-demo" };
  const sel = await c.request("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { headers: T, body: { medicationIdentifier: medId, timeZone: "UTC", isReselection: false } });
  const sj = JSON.parse(sel.body);
  console.log("selection", sel.status, "tabId", sj.trackingTabId, "rules", (sj.results || []).filter(r => r.needsAction).map(r => r.ruleId));
  const d = new Date(Date.now() - 5 * 60 * 1000);
  const body = { medicationIdentifier: medId, ndc: null, adminMonth: d.getUTCMonth() + 1, adminDay: d.getUTCDate(), adminYear: d.getUTCFullYear(), adminHours: d.getUTCHours(), adminMinutes: d.getUTCMinutes(), timeZone: "UTC", doseUnits: "g", doseAmount: 2, concentrations: [], route: "INTRAVENOUS", selectedIndication: null, trackingTabId: sj.trackingTabId };
  const r = await c.request("POST", `/api/patient/${pmrn}/${caseId}/medication-administration`, { headers: T, body });
  console.log("medadmin", r.status, r.body.slice(0, 300));
})().catch(e => { console.error("ERR", e); process.exit(1); });
