const { req, login, T } = require("./client");
const H = 3600 * 1000;
const iso = (hoursAgo) => new Date(Date.now() - hoursAgo * H).toISOString();
async function infusion(pmrn, caseId, events) {
  const r = await req("POST", `/api/admin/infusion/patient/${pmrn}/${caseId}`, { headers: T, body: { medicationId: "m-heparin", route: "INTRAVENOUS", events } });
  console.log("infusion", r.status, r.body.slice(0, 200));
}
const START = (h, rate) => ({ eventType: "START", eventDate: iso(h), rateAmount: rate, rateUnits: "mL/hr", doseAmount: null, doseUnits: null });
const STOP = (h) => ({ eventType: "STOP", eventDate: iso(h), rateAmount: null, rateUnits: null, doseAmount: null, doseUnits: null });
const SCENARIOS = {
  positive: [[START(11, "5"), STOP(5)], [START(12, "8"), STOP(10)]],
  negative: [[START(20, "5"), STOP(8)], [START(24, "8"), STOP(22)]],
};
async function stage(name) {
  const p = await req("POST", "/api/admin/patients/", { headers: T, body: { prmnPrefix: `OR3020${name.toUpperCase()}`, firstName: "Test", lastName: "Patient", dob: "1970-01-01", height: "170 cm", weight: "80 kg", gender: "MALE", genderIdentity: "MALE" } });
  console.log("patient", p.status, p.body.slice(0, 200));
  const { pmrn, uuid } = JSON.parse(p.body);
  const o = await req("POST", `/api/admin/patients/${uuid}/operations/create`, { headers: T, body: { procedureTypes: [{ id: "p-gastro-uncomplicated", qualifier: null }], startTime: new Date().toISOString() } });
  console.log("operation", o.status, o.body.slice(0, 200));
  const { caseId } = JSON.parse(o.body);
  for (const ev of SCENARIOS[name]) { await infusion(pmrn, caseId, ev); await new Promise(r => setTimeout(r, 1500)); }
  console.log("STAGED", name, pmrn, caseId);
}
async function launch(pmrn, caseId) {
  const r = await req("POST", `/api/cds/app-launch/${pmrn}/${caseId}`, { headers: T, body: { timeZone: "America/New_York" } });
  console.log("launch", r.status);
  try { const j = JSON.parse(r.body); console.log("alerts:", JSON.stringify((j.alerts || []).map(a => ({ rule: a.ruleIdentifier, title: a.title, description: a.description })), null, 1)); } catch { console.log(r.body.slice(0, 500)); }
}
async function results(caseId) {
  for (const kind of ["fired", "not-fired"]) {
    const r = await req("GET", `/api/admin/rule/evaluations/${kind}?caseId=${caseId}&ruleIdentifier=a-preop-ptt`, { headers: T });
    console.log(kind, r.status, r.body.slice(0, 1500));
  }
}
(async () => {
  const [cmd, ...a] = process.argv.slice(2);
  console.log("login", await login("admin", "admin"));
  if (cmd === "stage") await stage(a[0]);
  else if (cmd === "launch") await launch(a[0], a[1]);
  else if (cmd === "results") await results(a[0]);
})().catch(e => { console.error(e); process.exit(1); });
