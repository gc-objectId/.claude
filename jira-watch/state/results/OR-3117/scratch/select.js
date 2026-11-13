const { request, login } = require("./client");
const [T, pmrn, caseId, med] = process.argv.slice(2);
(async () => {
  await login("admin", "admin");
  const sel = await request("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { tenant: T, body: { medicationIdentifier: med || "m-vancomycin-iv", timeZone: "America/Chicago" } });
  const j = sel.json || {};
  console.log("selection", sel.status, "rules:", JSON.stringify((j.results || []).map(r => r.ruleId)));
  const dfs = j.dosingFormState || {};
  console.log("trackingTabId", dfs.trackingTabId);
  for (const [route, st] of Object.entries(dfs.perRouteState || {})) {
    console.log(route, "doseOptions:", JSON.stringify((st.doseOptions || []).map(o => ({ amt: o.doseAmount, unit: o.doseUnits, calc: o.calculatedDoseAmount, calcUnit: o.calculatedDoseUnits, def: o.defaultOption }))));
    console.log(route, "citations:", JSON.stringify((st.citations || []).map(c => c.citation && c.citation.id)));
  }
  const f = await request("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=w-vancomycin`, { tenant: T });
  for (const x of f.json || []) console.log("FIRED", x.ruleIdentifier, "CRCL=", x.details && x.details.CRCL, "BAND=", x.details && x.details.CLEARANCE_BAND, "MIN=", x.details && x.details.MIN_DOSE_VALUE, x.details && x.details.MIN_DOSE_UNIT, "MAX=", x.details && x.details.MAX_DOSE_VALUE, x.details && x.details.MAX_DOSE_UNIT, "compliance:", JSON.stringify(x.complianceResults), "tracking:", x.ruleExecutionContext && x.ruleExecutionContext.trackingId);
  require("fs").writeFileSync(`sel-${caseId}.json`, JSON.stringify({ pmrn, caseId, trackingTabId: dfs.trackingTabId, sel: j }, null, 1));
})().catch(e => console.log("ERR", e));
