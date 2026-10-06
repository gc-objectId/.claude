const a = require("./api.js");
const RULE = "a-incomplete-antibiotic-pathway";
async function ok(r, what) { if (r.status >= 300) throw new Error(`${what} -> ${r.status} ${r.body.slice(0, 300)}`); return r.json; }
async function stage(prefix, procedureTypes) {
  const dob = new Date(); dob.setFullYear(dob.getFullYear() - 45);
  const p = await ok(await a.request("POST", "/api/admin/patients/", { body: { prmnPrefix: prefix, firstName: "Test", lastName: "Patient", dob: dob.toISOString().split("T")[0], height: "170 cm", weight: "70 kg", gender: "MALE", genderIdentity: "MALE" } }), "create patient");
  const o = await ok(await a.request("POST", `/api/admin/patients/${p.uuid}/operations/create`, { body: { procedureTypes: procedureTypes.map((id) => ({ id, qualifier: null })), startTime: new Date().toISOString() } }), "create operation");
  return { pmrn: p.pmrn, uuid: p.uuid, caseId: o.caseId, operationId: o.id };
}
async function bolus(c, medicationId, route, doseAmount, doseUnits = "mg", when = new Date()) {
  return ok(await a.request("POST", `/api/admin/bolus/patient/${c.pmrn}/${c.caseId}`, { body: { medicationId, administrationDate: when.toISOString(), doseAmount, doseUnits, route } }), `bolus ${medicationId} ${route}`);
}
async function event(c, cats = ["PROCEDURE_START"]) {
  return ok(await a.request("POST", "/api/admin/events/category-event", { body: { patientId: c.pmrn, caseId: c.caseId, eventCategories: cats, date: new Date().toISOString(), sourceEventType: "ADMIN_API" } }), "event");
}
async function fired(c, rule = RULE) { return ok(await a.request("GET", `/api/admin/rule/evaluations/fired?caseId=${c.caseId}&ruleIdentifier=${rule}`), "fired"); }
async function notFired(c, rule = RULE) { return ok(await a.request("GET", `/api/admin/rule/evaluations/not-fired?caseId=${c.caseId}&ruleIdentifier=${rule}`), "notFired"); }
async function guidance(c) { return ok(await a.request("GET", `/api/admin/patients/${c.pmrn}/operations/${c.caseId}/antibiotic-candidates`), "guidance"); }
async function jobs(c) { return ok(await a.request("GET", `/api/admin/quartz/jobs?caseId=${c.caseId}`), "jobs"); }
function brief(list) { return list.map((f) => ({ status: f.details && f.details.PATHWAY_STATUS, groups: f.details && f.details.PARTIALLY_GIVEN_GROUPS, prompt: f.prompt && (f.prompt.description || f.prompt.title || "").toString().slice(0, 200) })); }
async function run(label, c, doses) {
  console.log(`\n=== ${label}`, JSON.stringify(c));
  for (const [med, route, amt] of doses) { await bolus(c, med, route, amt); await a.sleep(1500); }
  const j = await jobs(c); console.log("quartz jobs:", JSON.stringify(j.map((x) => ({ name: x.jobName || x.name, group: x.jobGroup || x.group, next: x.nextFireTime })).slice(0, 6)));
  await event(c); await a.sleep(1000);
  const f = await fired(c); console.log("fired", f.length, JSON.stringify(brief(f)));
  console.log("notFired", JSON.stringify((await notFired(c)).map((n) => n.explanation)));
  return c;
}
module.exports = { a, RULE, ok, stage, bolus, event, fired, notFired, guidance, jobs, brief, run };
