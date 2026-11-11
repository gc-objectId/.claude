const { req, login } = require("./http.js");
async function stage(tenant, { weight, height = "180 cm", dob = "1980-01-01", gender = "MALE", prefix = "or3069" }) {
  const p = await req("POST", "/api/admin/patients/", { tenant, body: { prmnPrefix: prefix, weight, height, dob, gender, genderIdentity: gender } });
  if (p.status !== 200) throw new Error("createPatient " + p.status + " " + p.text.slice(0, 300));
  const o = await req("POST", `/api/admin/patients/${p.json.uuid}/operations/create`, { tenant, body: { startTime: new Date().toISOString(), procedureTypes: [] } });
  if (o.status !== 200) throw new Error("createOperation " + o.status + " " + o.text.slice(0, 300));
  return { pmrn: p.json.pmrn, uuid: p.json.uuid, caseId: o.json.caseId, op: o.json };
}
function dateFields(d) {
  return { timeZone: "UTC", adminYear: d.getUTCFullYear(), adminMonth: d.getUTCMonth() + 1, adminDay: d.getUTCDate(), adminHours: d.getUTCHours(), adminMinutes: d.getUTCMinutes() };
}
async function doseCheck(tenant, pmrn, caseId, { med = "m-bupivacaine-liposome", ndc = "6525013309", amount, units = "mg", route = "NERVE_BLOCK", when = new Date() }) {
  const r = await req("POST", `/api/cds/medication-dose/${pmrn}/${caseId}`, { tenant, body: { medicationIdentifier: med, ndc, doseAmount: amount, doseUnits: units, route, concentrations: [], ...dateFields(when) } });
  return r;
}
async function priorBolus(tenant, pmrn, caseId, { med = "m-bupivacaine-liposome", amount, units = "mg", route = "NERVE_BLOCK", when }) {
  return req("POST", `/api/admin/bolus/patient/${pmrn}/${caseId}`, { tenant, body: { medicationId: med, administrationDate: when.toISOString(), doseAmount: amount, doseUnits: units, route } });
}
async function fired(tenant, caseId, rule) {
  const r = await req("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=${rule}`, { tenant });
  return r.json;
}
async function notFired(tenant, caseId, rule) {
  const r = await req("GET", `/api/admin/rule/evaluations/not-fired?caseId=${caseId}&ruleIdentifier=${rule}`, { tenant });
  return r.json;
}
function summarize(r) {
  const alerts = (r.json && r.json.alerts) || [];
  return { status: r.status, alertCount: alerts.length, alerts: alerts.map(a => ({ rule: a.ruleIdentifier, title: a.title, text: (a.text || a.message || "").toString().slice(0, 300) })) , raw: r.status !== 200 ? r.text.slice(0, 400) : undefined };
}
module.exports = { stage, doseCheck, priorBolus, fired, notFired, summarize, login, req };
module.exports.dateFieldsPublic = dateFields;
