const { req, login, jar } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
const J = (o) => JSON.stringify(o);
async function stage({ prefix, procedure, mrsa, allergies = [] }) {
  const p = JSON.parse((await req("POST", "/api/admin/patients/", { body: J({ prmnPrefix: prefix, dob: "1980-01-01" }), headers: T })).body);
  const op = JSON.parse((await req("POST", `/api/admin/patients/${p.uuid}/operations/create`,
    { body: J({ startTime: new Date().toISOString(), procedureTypes: [{ id: procedure, qualifier: null }] }), headers: T })).body);
  const caseId = op.caseId;
  for (const m of mrsa) {
    const r = await req("POST", `/api/admin/observations/patient/${p.pmrn}/case/${caseId}`,
      { body: J({ type: "MRSA_INFECTION", value: m.value, units: null, date: m.date }), headers: T });
    console.log("obs", r.status, r.body.slice(0, 200));
  }
  for (const a of allergies) {
    const r = await req("POST", `/api/admin/patients/${p.pmrn}/allergies?caseId=${caseId}&type=MEDICATION&identifier=${a}&reaction=ANAPHYLAXIS`, { body: "", headers: T });
    console.log("allergy", a, r.status, r.body.slice(0, 200));
  }
  return { pmrn: p.pmrn, uuid: p.uuid, caseId };
}
async function candidates(pmrn, caseId) {
  const r = await req("GET", `/api/admin/patients/${pmrn}/operations/${caseId}/antibiotic-candidates`, { headers: T });
  return { status: r.status, body: r.body };
}
async function select(pmrn, caseId, med) {
  const r = await req("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { body: J({ medicationIdentifier: med, timeZone: "America/New_York" }), headers: T });
  let j; try { j = JSON.parse(r.body); } catch { return { status: r.status, body: r.body.slice(0, 300) }; }
  return { status: r.status, results: (j.results || []).map(x => ({ ruleId: x.ruleId, fired: x.fired ?? x.status, mrsa: x.details && x.details.MRSA_ADJUSTED_OPTION_RECOMMENDED, citations: (x.citations || []).map(c => c.id || c.citationId || c.title) })) , raw: j };
}
async function event(pmrn, caseId, cats) {
  const r = await req("POST", "/api/admin/events/category-event", { body: J({ sourceEventType: "debugger", eventCategories: cats, patientId: pmrn, caseId, date: new Date().toISOString() }), headers: T });
  return { status: r.status, body: r.body.slice(0, 200) };
}
async function bolus(pmrn, caseId, med) {
  const r = await req("POST", `/api/admin/bolus/patient/${pmrn}/${caseId}`, { body: J({ medicationId: med, administrationDate: new Date().toISOString(), doseAmount: "1", doseUnits: "g", route: "INTRAVENOUS", concentrationOptionIndex: 0 }), headers: T });
  return { status: r.status, body: r.body.slice(0, 300) };
}
module.exports = { stage, candidates, select, event, bolus, login, req, T };
