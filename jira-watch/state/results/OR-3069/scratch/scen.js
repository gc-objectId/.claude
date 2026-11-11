const A = require("./api.js");
const T = "mayo-mayo";
const MED = "m-cefazolin", NDC = "1445";
async function selectCef(s, tenant = T) {
  const sel = await A.req("POST", `/api/cds/medication-selection/${s.pmrn}/${s.caseId}`, { tenant, body: { medicationIdentifier: MED, timeZone: "UTC" } });
  if (sel.status !== 200) { console.log("  selection FAILED", sel.status, sel.text.slice(0, 400)); return null; }
  const dfs = sel.json.dosingFormState || {};
  const iv = dfs.perRouteState && dfs.perRouteState.INTRAVENOUS;
  const def = iv && (iv.doseOptions || []).find(o => o.defaultOption);
  const rel = (sel.json.results || []).filter(r => /cefazolin|default-dose|early-redose/.test(r.ruleIdentifier || "")).map(r => ({ rule: r.ruleIdentifier, needsAction: r.needsAction, CRCL: r.details && r.details.CRCL, CASE: r.details && r.details.DEFAULT_DOSE_CASE, expl: (r.explanation || "").slice(0, 100) }));
  console.log("  selection ok tab=", dfs.trackingTabId, "IV default=", JSON.stringify(def), "results:", JSON.stringify(rel));
  return dfs.trackingTabId;
}
async function document(s, tab, amount, units, when, extra = {}, tenant = T) {
  const r = await A.req("POST", `/api/patient/${s.pmrn}/${s.caseId}/medication-administration`, { tenant, body: { medicationIdentifier: MED, ndc: NDC, doseAmount: amount, doseUnits: units, route: "INTRAVENOUS", concentrations: [], trackingTabId: tab, ...A.dateFieldsPublic(when), ...extra } });
  console.log(`  document ${amount} ${units} -> ${r.status} ${r.status !== 200 ? r.text.slice(0, 300) : ""}`);
  return r;
}
async function report(s, tenant = T) {
  for (const rule of ["w-cefazolin-default-dose", "w-default-dose-adjustment"]) {
    const f = await A.fired(tenant, s.caseId, rule);
    for (const x of (f || [])) console.log(`  FIRED ${rule} id=${x.id} mode=${x.evaluationMode} compliance=${JSON.stringify((x.complianceResults||[]).map(c=>c.label+"="+c.compliant))} default=${JSON.stringify(x.routeDefaultDoseOverride)}`);
  }
  const e = await A.fired(tenant, s.caseId, "a-antibiotic-early-redose"); const n = await A.notFired(tenant, s.caseId, "a-antibiotic-early-redose");
  console.log(`  early-redose fired=${(e||[]).length} CRCL=${JSON.stringify((e||[]).map(x=>x.details&&x.details.CRCL))} notFired=${(n||[]).length} CRCL=${JSON.stringify((n||[]).map(x=>x.details&&x.details.CRCL))}`);
}
module.exports = { selectCef, document, report, T, MED, NDC };
