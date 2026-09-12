const { request, login } = require("./client");
const E = process["env"];
const T = E.TENANT || "demo-demo";
const TZ = "America/New_York";
async function setup(label, type, code, reaction = "Anaphylaxis") {
  const dob = new Date(); dob.setFullYear(dob.getFullYear() - 45);
  const p = await request("POST", "/api/admin/patients/", { tenant: T, body: { prmnPrefix: label, firstName: "Test", lastName: "Patient", dob: dob.toISOString().split("T")[0], height: "170 cm", weight: "70 kg", gender: "MALE", genderIdentity: "MALE" } });
  if (p.status >= 400) throw new Error("createPatient " + p.status + " " + p.text);
  const { pmrn, uuid } = p.json;
  const o = await request("POST", `/api/admin/patients/${uuid}/operations/create`, { tenant: T, body: { procedureTypes: [{ id: "p-gastro-uncomplicated", qualifier: null }], startTime: new Date().toISOString() } });
  if (o.status >= 400) throw new Error("createOperation " + o.status + " " + o.text);
  const caseId = o.json.caseId;
  let allergy = null;
  if (type && code && type !== "NONE") {
    const q = new URLSearchParams({ caseId, type, identifier: code, reaction });
    const a = await request("POST", `/api/admin/patients/${pmrn}/allergies?${q}`, { tenant: T });
    if (a.status >= 400) throw new Error("addAllergy " + a.status + " " + a.text);
    allergy = a.json;
  }
  const l = await request("POST", "/api/app-launch", { tenant: T, body: { patientId: pmrn, caseId } });
  return { pmrn, uuid, caseId, allergy, launch: l.status };
}
async function select(pmrn, caseId, medicationIdentifier) {
  const r = await request("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { tenant: T, body: { medicationIdentifier, timeZone: TZ, isReselection: false } });
  if (r.status >= 400) return { status: r.status, text: r.text.slice(0, 500) };
  const results = (r.json.results || []).map((x) => ({ rule: x.ruleId, needsAction: x.needsAction, title: x.prompt && x.prompt.title, description: x.prompt && x.prompt.description, explanation: x.explanation }));
  return { status: r.status, allergyRule: results.filter((x) => x.rule === "a-general-allergy"), fired: results.filter((x) => x.needsAction).map((x) => x.rule) };
}
(async () => {
  await login(E.USER_ || "admin", E.PASS_ || "admin");
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "setup") console.log(JSON.stringify(await setup(...args)));
  else if (cmd === "select") console.log(JSON.stringify(await select(...args), null, 1));
  else if (cmd === "flow") {
    const [label, type, code, ...meds] = args;
    const s = await setup(label, type, code);
    console.log("SETUP", JSON.stringify(s));
    for (const m of meds) console.log("SELECT", m, JSON.stringify(await select(s.pmrn, s.caseId, m)));
  } else if (cmd === "get") { const r = await request("GET", args[0], { tenant: T }); console.log(r.status, r.text.slice(0, 3000)); }
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
