// usage: node stage.js <code|-> <RXNORM|SNOMED> <prefix> [medicationIdentifier...]
const { makeSession } = require("./client");
(async () => {
  const [code, type, prefix, ...meds] = process.argv.slice(2);
  const admin = makeSession();
  console.log("admin login", await admin.login("admin", "admin"));
  const p = await admin.request("POST", "/api/admin/patients/", { body: { prmnPrefix: prefix, firstName: prefix, lastName: "Or2791" } });
  console.log("patient", p.status, JSON.stringify(p.body));
  const { pmrn, uuid } = p.body;
  const op = await admin.request("POST", `/api/admin/patients/${uuid}/operations/create`, { body: { startTime: new Date().toISOString(), procedureTypes: [{ id: "p-hernia-repair", qualifier: null }] } });
  console.log("operation", op.status, JSON.stringify(op.body).slice(0, 300));
  const caseId = op.body.caseId;
  if (code !== "-") {
    const a = await admin.request("POST", `/api/admin/patients/${pmrn}/allergies?caseId=${caseId}&type=${type}&identifier=${code}&reaction=HIVES`);
    console.log("allergy", a.status, JSON.stringify(a.body));
  }
  const user = makeSession();
  console.log("user login", await user.login("loopuser", "LoopValidate1!"));
  for (const med of meds) {
    const sel = await user.request("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { body: { medicationIdentifier: med, timeZone: "UTC" } });
    const results = Array.isArray(sel.body?.results) ? sel.body.results : [];
    const allergy = results.filter((r) => r.ruleId === "a-general-allergy" || (r.ruleIdentifier === "a-general-allergy"));
    console.log(`select ${med}`, sel.status, "keys:", Object.keys(sel.body || {}).join(","), "\n  rules:", results.map((r) => r.ruleId || r.ruleIdentifier).join(","), "\n  allergy:", JSON.stringify(allergy).slice(0, 800));
  }
  console.log("PMRN", pmrn, "UUID", uuid, "CASE", caseId);
})().catch((e) => { console.error(e); process.exit(1); });
