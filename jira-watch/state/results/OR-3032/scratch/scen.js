const L = require("./last.js");
const RULE = "a-local-anesthetic-max-dose-save";
async function select(T, s) {
  const sel = await L.req("POST", `/api/cds/medication-selection/${s.pmrn}/${s.caseId}`, { tenant: T, body: { medicationIdentifier: "m-bupivacaine-liposome", timeZone: "UTC" } });
  if (sel.status !== 200) { console.log("  selection FAILED", sel.status, sel.text.slice(0, 300)); return null; }
  const dfs = sel.json.dosingFormState || {};
  const lastResults = (sel.json.results || []).filter(r => /last|local-anesthetic/.test(r.ruleIdentifier || "")).map(r => ({ rule: r.ruleIdentifier, needsAction: r.needsAction, expl: (r.explanation || "").slice(0, 160), MAX: r.details && (r.details.NERVE_BLOCK_MAX_DOSE_MG || r.details.MAX_DOSE_MG), BASIS: r.details && (r.details.NERVE_BLOCK_MAX_DOSE_BASIS || r.details.MAX_DOSE_BASIS) }));
  console.log("  selection ok tab=", dfs.trackingTabId, "maxDose=", JSON.stringify(dfs.maxDose || (dfs.perRouteState && dfs.perRouteState.NERVE_BLOCK && dfs.perRouteState.NERVE_BLOCK.maxDose)), "LAST results:", JSON.stringify(lastResults));
  return dfs.trackingTabId;
}
async function dose(T, s, tab, amount, label) {
  const d = new Date();
  const r = await L.req("POST", `/api/cds/medication-dose/${s.pmrn}/${s.caseId}`, { tenant: T, body: { medicationIdentifier: "m-bupivacaine-liposome", ndc: "6525013309", doseAmount: amount, doseUnits: "mg", route: "NERVE_BLOCK", concentrations: [], trackingTabId: tab, timeZone: "UTC", adminYear: d.getUTCFullYear(), adminMonth: d.getUTCMonth() + 1, adminDay: d.getUTCDate(), adminHours: d.getUTCHours(), adminMinutes: d.getUTCMinutes() } });
  const sum = L.summarize(r);
  console.log(`  ${label} ${amount} mg -> status ${sum.status} alerts=${sum.alertCount} ${JSON.stringify(sum.alerts)} ${sum.raw || ""}`);
  return r;
}
async function lastFired(T, s) {
  const f = await L.fired(T, s.caseId, RULE);
  const x = (f || [])[0];
  if (x) console.log("  latest FIRED:", JSON.stringify({ MAX_DOSE_MG: x.details.MAX_DOSE_MG, MAX_DOSE_BASIS: x.details.MAX_DOSE_BASIS, MAX_DOSE_MG_PER_KG: x.details.MAX_DOSE_MG_PER_KG, WEIGHT_TYPE: x.details.WEIGHT_TYPE, PATIENT_WEIGHT: x.details.PATIENT_WEIGHT, REMAINING: x.details.REMAINING_ALLOWED_DOSE, PRIOR: x.details.HAS_PRIOR_LOCAL_ANESTHETIC_DOSES, SCALES: x.details.CALCULATION_SCALES_WITH_WEIGHT, CALC: x.details.EXPANDED_CALCULATION }));
  const nf = await L.notFired(T, s.caseId, RULE);
  console.log("  notFired explanations:", JSON.stringify((nf || []).map(e => e.explanation)));
}
module.exports = { select, dose, lastFired, L };
