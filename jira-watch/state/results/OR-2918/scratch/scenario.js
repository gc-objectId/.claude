const { req, login } = require("./http.js");
const RULE = "a-eras-antiemetics";
const [T, PROC, label, ...meds] = process.argv.slice(2); // meds: identifier:hoursAgo[:route]
const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString();
(async () => {
  console.log("login", await login());
  let r = await req("POST", "/api/admin/patients/", { tenant: T, body: { prmnPrefix: "or2918-" + label, firstName: "Eras", lastName: label, dob: "1970-01-01", height: "170 cm", weight: "80 kg", gender: "MALE", genderIdentity: "MALE" } });
  const { pmrn, uuid } = JSON.parse(r.body);
  r = await req("POST", `/api/admin/patients/${uuid}/operations/create`, { tenant: T, body: { procedureTypes: [{ id: PROC, qualifier: null }], startTime: hoursAgo(3) } });
  const op = JSON.parse(r.body);
  console.log("case", op.caseId, "eras", op.erasOperation, "pmrn", pmrn);
  for (const m of meds) {
    const [id, h, route = "INTRAVENOUS"] = m.split(":");
    r = await req("POST", `/api/admin/bolus/patient/${pmrn}/${op.caseId}`, { tenant: T, body: { medicationId: id, administrationDate: hoursAgo(+h), doseAmount: "4", doseUnits: "mg", route } });
    console.log("bolus", id, h + "h ago", r.status, r.status >= 300 ? r.body.slice(0, 200) : "");
  }
  r = await req("POST", "/api/admin/events/category-event", { tenant: T, body: { sourceEventType: "ADMIN_API", eventCategories: ["ERAS_OPERATION_END"], patientId: pmrn, caseId: op.caseId, date: new Date().toISOString() } });
  console.log("event", r.status, r.body.slice(0, 200));
  for (const kind of ["fired", "not-fired"]) {
    r = await req("GET", `/api/admin/rule/evaluations/${kind}?caseId=${op.caseId}&ruleIdentifier=${RULE}`, { tenant: T });
    const list = JSON.parse(r.body);
    console.log(kind, list.length);
    for (const e of list) console.log("  ", JSON.stringify({ explanation: e.explanation, details: e.details && { NUM_ANTIEMETICS: e.details.NUM_ANTIEMETICS }, prompt: e.prompt && (e.prompt.description || JSON.stringify(e.prompt)).replace(/<[^>]+>/g, " ").slice(0, 400) }));
  }
  console.log("CASE_ID=" + op.caseId, "PMRN=" + pmrn);
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
