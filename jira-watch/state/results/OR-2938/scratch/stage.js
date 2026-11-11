const { request, login } = require("./api");
const fs = require("fs");
const MIN = 60000;
function iso(d) { return new Date(d).toISOString(); }
async function stage(opts) {
  const { label, opStartOffsetMin = -120, infusions = [], boluses = [], creatinine = null, ebl = [{ value: "1600", offsetMin: -10 }], fire = true } = opts;
  const now = Date.now();
  const opStart = now + opStartOffsetMin * MIN;
  const p = await request("POST", "/api/admin/patients/", { prmnPrefix: "ebl-" + label, weight: "75 kg", height: "175 cm", dob: "1980-01-01", gender: "MALE", genderIdentity: "MALE" });
  if (p.status !== 200) throw new Error("create patient " + p.status + " " + JSON.stringify(p.body));
  const pmrn = p.body.pmrn.value || p.body.pmrn; const uuid = p.body.uuid.value || p.body.uuid;
  const o = await request("POST", `/api/admin/patients/${uuid}/operations/create`, { startTime: iso(opStart), procedureTypes: [{ id: "p-angiogram-arm" }] });
  if (o.status !== 200) throw new Error("create op " + o.status + " " + JSON.stringify(o.body));
  const caseId = o.body.caseId; const opUuid = o.body.id;
  const l = await request("POST", "/api/app-launch", { patientId: pmrn, caseId, forceLaunch: true });
  console.log(`[${label}] pmrn=${pmrn} caseId=${caseId} opUuid=${opUuid} opStart=${iso(opStart)} launch=${l.status}`);
  if (creatinine) {
    const c = await request("POST", `/api/admin/observations/patient/${pmrn}/case/${caseId}`, { type: "CREATININE", value: creatinine, units: "mg/dL", date: iso(opStart - 60 * MIN) });
    console.log(`[${label}] CREATININE ${creatinine} mg/dL -> ${c.status}`);
  }
  for (const b of boluses) {
    const r = await request("POST", `/api/admin/bolus/patient/${pmrn}/${caseId}`, { medicationId: b.medicationId, administrationDate: iso(opStart + b.offsetFromOpStartMin * MIN), doseAmount: "2", doseUnits: "g", route: "INTRAVENOUS", concentrationOptionIndex: 0 });
    console.log(`[${label}] bolus ${b.medicationId} @${iso(opStart + b.offsetFromOpStartMin * MIN)} -> ${r.status} ${typeof r.body === "string" ? r.body : JSON.stringify(r.body).slice(0, 200)}`);
  }
  for (const inf of infusions) {
    const events = inf.events.map(e => ({ eventType: e.type, eventDate: iso(opStart + e.offsetFromOpStartMin * MIN), rateAmount: e.type === "STOP" ? null : "250", rateUnits: e.type === "STOP" ? null : "ml/hr", doseAmount: e.type === "STOP" ? null : "1000", doseUnits: e.type === "STOP" ? null : "mg" }));
    const r = await request("POST", `/api/admin/infusion/patient/${pmrn}/${caseId}`, { medicationId: inf.medicationId, events, route: "INTRAVENOUS", concentrationOptionIndex: 0 });
    console.log(`[${label}] infusion ${inf.medicationId} ${JSON.stringify(events.map(e => e.eventType + "@" + e.eventDate))} -> ${r.status} ${typeof r.body === "string" ? r.body : JSON.stringify(r.body).slice(0, 200)}`);
  }
  const ma = await request("GET", `/api/admin/patients/${pmrn}/operations/${caseId}/medication-administrations`);
  console.log(`[${label}] med-admins (${ma.status}):`, JSON.stringify(ma.body).slice(0, 600));
  for (const e of ebl) {
    const r = await request("POST", `/api/admin/observations/patient/${pmrn}/case/${caseId}`, { type: "EBL", value: e.value, units: "mL", date: iso(now + e.offsetMin * MIN) });
    console.log(`[${label}] EBL ${e.value} @${iso(now + e.offsetMin * MIN)} -> ${r.status}`);
  }
  if (fire) {
    const f = await request("POST", "/api/admin/events/category-event", { sourceEventType: "validation", eventCategories: ["EBL_UPDATED"], patientId: pmrn, caseId, date: iso(now) });
    console.log(`[${label}] fire EBL_UPDATED -> ${f.status} ${f.body}`);
    await new Promise(r => setTimeout(r, 1500));
    await report(label, caseId);
  }
  const rec = { label, pmrn, uuid, caseId, opUuid, opStart: iso(opStart) };
  fs.appendFileSync(__dirname + "/cases.jsonl", JSON.stringify(rec) + "\n");
  return rec;
}
async function fireAgain(rec) {
  const f = await request("POST", "/api/admin/events/category-event", { sourceEventType: "validation", eventCategories: ["EBL_UPDATED"], patientId: rec.pmrn, caseId: rec.caseId, date: iso(Date.now()) });
  console.log(`[${rec.label}] re-fire EBL_UPDATED -> ${f.status} ${f.body}`);
  await new Promise(r => setTimeout(r, 1500));
  await report(rec.label, rec.caseId);
}
async function report(label, caseId) {
  const fired = await request("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=a-ebl-antibiotic-redose-reminder`);
  const nf = await request("GET", `/api/admin/rule/evaluations/not-fired?caseId=${caseId}&ruleIdentifier=a-ebl-antibiotic-redose-reminder`);
  console.log(`[${label}] FIRED (${fired.status}) count=${Array.isArray(fired.body) ? fired.body.length : "?"}:`, JSON.stringify((fired.body || []).map(x => ({ rule: x.ruleIdentifier, prompt: x.prompt || x.message || x.title, details: x.details && { CRCL: x.details.CRCL, CUMULATIVE_EBL: x.details.CUMULATIVE_EBL, EBL_THRESHOLD: x.details.EBL_THRESHOLD, SHOW_RENAL_WARNING: x.details.SHOW_RENAL_WARNING, THRESHOLD_MULTIPLE: x.details.THRESHOLD_MULTIPLE }, created: x.createdDate }))));
  console.log(`[${label}] NOT-FIRED (${nf.status}) count=${Array.isArray(nf.body) ? nf.body.length : "?"}:`, JSON.stringify((nf.body || []).map(x => ({ rule: x.ruleIdentifier, explanation: x.explanation || x.reason, created: x.createdDate }))).slice(0, 800));
}
module.exports = { stage, fireAgain, report, login };
if (require.main === module) {
  (async () => {
    await login();
    const scenario = process.argv[2];
    const scenarios = {
      positive: { label: "pos", infusions: [{ medicationId: "m-vancomycin-iv", events: [{ type: "START", offsetFromOpStartMin: 90 }] }] },
      pos_prelookback: { label: "poslb", infusions: [{ medicationId: "m-vancomycin-iv", events: [{ type: "START", offsetFromOpStartMin: -30 }, { type: "STOP", offsetFromOpStartMin: 30 }] }] },
      neg_cefazolin: { label: "negcef", infusions: [{ medicationId: "m-cefazolin", events: [{ type: "START", offsetFromOpStartMin: 90 }] }] },
      neg_outside_lookback: { label: "neglb", infusions: [{ medicationId: "m-vancomycin-iv", events: [{ type: "START", offsetFromOpStartMin: -90 }, { type: "RATE_CHANGE", offsetFromOpStartMin: 100 }] }] },
      neg_stop_only: { label: "negstop", infusions: [{ medicationId: "m-vancomycin-iv", events: [{ type: "STOP", offsetFromOpStartMin: 90 }] }] },
      renal_pos: { label: "renpos", creatinine: "3.0", infusions: [{ medicationId: "m-vancomycin-iv", events: [{ type: "START", offsetFromOpStartMin: 90 }] }] },
      renal_neg: { label: "renneg", creatinine: "3.0", boluses: [{ medicationId: "m-cefazolin", offsetFromOpStartMin: 60 }], infusions: [{ medicationId: "m-vancomycin-iv", events: [{ type: "START", offsetFromOpStartMin: -90 }, { type: "RATE_CHANGE", offsetFromOpStartMin: 100 }] }] },
      red: { label: "red", infusions: [{ medicationId: "m-vancomycin-iv", events: [{ type: "START", offsetFromOpStartMin: 90 }] }] },
    };
    if (scenario === "refire") { await fireAgain(JSON.parse(process.argv[3])); return; }
    if (scenario === "report") { await report("rpt", process.argv[3]); return; }
    await stage(scenarios[scenario]);
  })().catch(e => { console.error("FAIL", e); process.exit(1); });
}
