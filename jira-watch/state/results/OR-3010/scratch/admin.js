const { req, login } = require("./http");
(async () => {
  const [,, pmrn, caseId, tab, amount = "1.75"] = process.argv;
  await login();
  const now = new Date(); const tz = "America/Chicago";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(now).filter(p => p.type !== "literal").map(p => [p.type, parseInt(p.value)]));
  const body = { medicationIdentifier: "m-vancomycin-iv", ndc: "7257280101", adminMonth: parts.month, adminDay: parts.day, adminYear: parts.year, adminHours: parts.hour % 24, adminMinutes: parts.minute, timeZone: tz, doseUnits: "g", doseAmount: Number(amount), concentrations: [], route: "INTRAVENOUS", trackingTabId: tab };
  const r = await req("POST", `/api/patient/${pmrn}/${caseId}/medication-administration`, { body });
  console.log("medAdmin", r.status, r.text.slice(0, 400));
  await new Promise(res => setTimeout(res, 3000));
  const f = await req("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=w-default-dose-adjustment`);
  console.log("fired", f.status);
  (f.json || []).forEach(x => console.log(JSON.stringify({ id: x.id, created: x.createdDate, weightType: x.details && x.details.WEIGHT_TYPE, compliance: x.complianceResults })));
})().catch(e => { console.error(e); process.exit(1); });
