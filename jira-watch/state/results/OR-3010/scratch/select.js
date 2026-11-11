const { req, login } = require("./http");
(async () => {
  const [,, pt, pmrnArg, caseArg, weight = "110 kg", height = "175 cm", tenant] = process.argv; if (tenant) require("./http").tenant = tenant;
  await login();
  let pmrn = pmrnArg, caseId = caseArg;
  if (!pmrn) {
    const p = await req("POST", "/api/admin/patients/", { body: { prmnPrefix: "or3010", dob: "1976-01-15", height, weight, gender: "MALE", genderIdentity: "MALE" } });
    console.log("createPatient", p.status, p.text);
    pmrn = p.json.pmrn;
    const o = await req("POST", `/api/admin/patients/${p.json.uuid}/operations/create`, { body: { startTime: new Date().toISOString(), procedureTypes: [{ id: pt, qualifier: null }] } });
    console.log("createOperation", o.status, o.text.slice(0, 300));
    caseId = o.json.caseId;
  }
  const s = await req("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { body: { medicationIdentifier: "m-vancomycin-iv", timeZone: "America/Chicago" } });
  console.log("selection", s.status);
  if (!s.json) { console.log(s.text.slice(0, 1000)); return; }
  const st = s.json.dosingFormState || {};
  console.log("trackingTabId", st.trackingTabId);
  const routes = st.perRouteState || {};
  for (const [route, rs] of Object.entries(routes)) {
    console.log("route", route, "defaultDose:", JSON.stringify(rs.defaultDose));
    (rs.doseOptions || []).forEach(d => console.log("  option", JSON.stringify(d)));
  }
  console.log("PMRN", pmrn, "CASE", caseId);
  require("fs").writeFileSync("last-selection.json", JSON.stringify(s.json, null, 2));
})().catch(e => { console.error("ERR", e); process.exit(1); });
