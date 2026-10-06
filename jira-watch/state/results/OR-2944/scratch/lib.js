const a = require("./api.js");
const RULE = "a-incomplete-antibiotic-pathway";
async function ok(r, what) { if (r.status >= 300) throw new Error(`${what} -> ${r.status} ${r.body.slice(0, 300)}`); return r.json; }
async function stage(prefix, procedureTypes) {
  const dob = new Date(); dob.setFullYear(dob.getFullYear() - 45);
  const p = await ok(await a.request("POST", "/api/admin/patients/", { body: { prmnPrefix: prefix, firstName: "Test", lastName: "Patient", dob: dob.toISOString().split("T")[0], height: "170 cm", weight: "70 kg", gender: "MALE", genderIdentity: "MALE" } }), "create patient");
  const o = await ok(await a.request("POST", `/api/admin/patients/${p.uuid}/operations/create`, { body: { procedureTypes: procedureTypes.map((id) => ({ id, qualifier: null })), startTime: new Date().toISOString() } }), "create operation");
  return { pmrn: p.pmrn, uuid: p.uuid, caseId: o.caseId };
}
async function bolus(c, medicationId, doseAmount, doseUnits = "mg", when = new Date()) {
  return ok(await a.request("POST", `/api/admin/bolus/patient/${c.pmrn}/${c.caseId}`, { body: { medicationId, administrationDate: when.toISOString(), doseAmount, doseUnits, route: "INTRAVENOUS" } }), `bolus ${medicationId}`);
}
async function event(c, cats = ["PROCEDURE_START"]) {
  return ok(await a.request("POST", "/api/admin/events/category-event", { body: { patientId: c.pmrn, caseId: c.caseId, eventCategories: cats, date: new Date().toISOString(), sourceEventType: "ADMIN_API" } }), "event");
}
async function fired(c, rule = RULE) { return ok(await a.request("GET", `/api/admin/rule/evaluations/fired?caseId=${c.caseId}&ruleIdentifier=${rule}`), "fired"); }
async function notFired(c, rule = RULE) { return ok(await a.request("GET", `/api/admin/rule/evaluations/not-fired?caseId=${c.caseId}&ruleIdentifier=${rule}`), "notFired"); }
async function guidance(c) { return ok(await a.request("GET", `/api/admin/patients/${c.pmrn}/operations/${c.caseId}/antibiotic-candidates`), "guidance"); }
function brief(list) { return list.map((f) => ({ created: f.createdDate, status: f.details && f.details.PATHWAY_STATUS, groups: f.details && f.details.PARTIALLY_GIVEN_GROUPS, prompt: f.prompt && (f.prompt.description || f.prompt.title || JSON.stringify(f.prompt)).toString().slice(0, 300), explanation: f.explanation })); }
module.exports = { a, RULE, ok, stage, bolus, event, fired, notFired, guidance, brief };
