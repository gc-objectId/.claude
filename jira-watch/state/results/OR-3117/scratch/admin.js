const { request, login } = require("./client");
const [T, pmrn, caseId, trackingTabId, amount, unit, ndc, backMin] = process.argv.slice(2);
(async () => {
  await login("admin", "admin");
  const now = new Date(Date.now() - (+(backMin || 0)) * 60000); const tz = "America/Chicago";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(now).map(p => [p.type, p.value]));
  const body = { medicationIdentifier: "m-vancomycin-iv", ndc: ndc || "7257280101", adminMonth: +parts.month, adminDay: +parts.day, adminYear: +parts.year, adminHours: +parts.hour % 24, adminMinutes: +parts.minute, timeZone: tz, doseUnits: unit || "g", doseAmount: +amount, concentrations: [], route: "INTRAVENOUS", trackingTabId };
  const r = await request("POST", `/api/patient/${pmrn}/${caseId}/medication-administration`, { tenant: T, body });
  console.log("admin", r.status, r.text.slice(0, 300));
  await new Promise(res => setTimeout(res, 2500));
  const f = await request("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=w-vancomycin`, { tenant: T });
  for (const x of f.json || []) console.log("FIRED", x.id, "BAND=", x.details && x.details.CLEARANCE_BAND, "CRCL=", x.details && x.details.CRCL, "compliance:", JSON.stringify(x.complianceResults));
})().catch(e => console.log("ERR", e));
