const { request, login } = require("./client");
const T = process.argv[2] || "mayo-mayo";
const creat = process.argv[3] || "1.0";
const weight = process.argv[4] || "80 kg";
const dob = process.argv[5] || "1966-01-01";
const gender = process.argv[6] || "MALE";
const proc = process.argv[7] || "p-cholecystectomy";
(async () => {
  await login("admin", "admin");
  const p = await request("POST", "/api/admin/patients/", { tenant: T, body: { prmnPrefix: "V", firstName: "Vanco", lastName: "Test" + Date.now() % 10000, dob, height: "180 cm", weight, gender, genderIdentity: gender } });
  console.log("patient", p.status, p.text);
  const { pmrn, uuid } = p.json;
  const now = new Date();
  const op = await request("POST", `/api/admin/patients/${uuid}/operations/create`, { tenant: T, body: { startTime: now.toISOString(), procedureTypes: [{ id: proc, qualifier: null }] } });
  console.log("operation", op.status, op.text.slice(0, 300));
  const caseId = op.json.caseId;
  const obs = await request("POST", `/api/admin/observations/patient/${pmrn}/case/${caseId}`, { tenant: T, body: { type: "CREATININE", value: creat, units: "mg/dL", date: new Date(now.getTime() - 3600e3).toISOString() } });
  console.log("creatinine", obs.status, obs.text.slice(0, 200));
  const launch = await request("POST", "/api/app-launch", { tenant: T, body: { patientId: pmrn, caseId, forceLaunch: true } });
  console.log("launch", launch.status, launch.text.slice(0, 300));
  require("child_process").execSync(`docker exec orci-loop-or-3117-redis-1 valkey-cli -a g76!s4z --no-auth-warning del patients/${T}/${pmrn}`);
  const sel = await request("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { tenant: T, body: { medicationIdentifier: "m-vancomycin-iv", timeZone: "America/Chicago" } });
  console.log("selection", sel.status);
  const j = sel.json || {};
  console.log("rules:", JSON.stringify((j.results || []).map(r => ({ id: r.ruleId || r.ruleIdentifier, type: r.type }))));
  const dfs = j.dosingFormState || {};
  console.log("trackingTabId", dfs.trackingTabId);
  for (const [route, st] of Object.entries(dfs.perRouteState || {})) {
    console.log(route, "doseOptions:", JSON.stringify((st.doseOptions || []).map(o => ({ amt: o.doseAmount, unit: o.doseUnits, calc: o.calculatedDoseAmount, calcUnit: o.calculatedDoseUnits, def: o.defaultOption, weightType: o.weightType }))));
    console.log(route, "citations:", JSON.stringify(st.citations || st.doseCitations || null).slice(0, 400));
  }
  require("fs").writeFileSync(`last-${T}.json`, JSON.stringify({ pmrn, uuid, caseId, trackingTabId: dfs.trackingTabId, sel: j }, null, 1));
})().catch(e => console.log("ERR", e));
