const { Client } = require("./http.js");
(async () => {
  const [tenant, pmrn, caseId, med, user, pass] = process.argv.slice(2);
  const c = new Client(tenant);
  await c.login(user || "admin", pass || "admin");
  const r = await c.request("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { body: { medicationIdentifier: med, timeZone: "America/New_York" } });
  if (r.status !== 200) { console.log("STATUS", r.status, r.text.slice(0, 800)); process.exit(2); }
  const st = r.json.dosingFormState || {};
  const out = {};
  for (const [route, s] of Object.entries(st.perRouteState || {})) {
    out[route] = { defaultIndication: s.defaultIndication, indications: Object.fromEntries(Object.entries(s.indicationDoseOptions || {}).map(([k, v]) => [k, v.map(o => (o.calculatedLabel || o.label || (o.doseAmount + " " + o.doseUnits)) + (o.defaultOption ? "*" : ""))])), routeDoseOptions: (s.doseOptions || []).map(o => o.calculatedLabel || o.label || (o.doseAmount + " " + o.doseUnits)) };
  }
  console.log(JSON.stringify({ trackingTabId: st.trackingTabId, routes: out }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
