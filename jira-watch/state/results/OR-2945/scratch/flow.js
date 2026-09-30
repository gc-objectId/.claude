const { makeClient } = require("./client.js");
const T = { "X-Tenant-Id": "demo-demo" };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function admin() { const c = makeClient(); if ((await c.login("admin", "admin")) !== 200) throw new Error("admin login"); return c; }
async function user() { const c = makeClient(); if ((await c.login("loopuser", "LoopValidate1!")) !== 200) throw new Error("user login"); return c; }
async function stage(glucose = "220") {
  const a = await admin();
  const dob = new Date(); dob.setFullYear(dob.getFullYear() - 55);
  const p = await a.req("POST", "/api/admin/patients/", { headers: T, body: { prmnPrefix: "INS2945", firstName: "Test", lastName: "Patient", dob: dob.toISOString().split("T")[0], height: "170 cm", weight: "70 kg", gender: "MALE", genderIdentity: "MALE" } });
  if (p.status !== 200) throw new Error("patient " + p.status + " " + p.text);
  const op = await a.req("POST", `/api/admin/patients/${p.json.uuid}/operations/create`, { headers: T, body: { procedureTypes: [{ id: "p-gastro-uncomplicated", qualifier: null }], startTime: new Date().toISOString() } });
  if (op.status !== 200) throw new Error("op " + op.status + " " + op.text);
  const obs = await a.req("POST", `/api/admin/observations/patient/${p.json.pmrn}/case/${op.json.caseId}`, { headers: T, body: { type: "GLUCOSE", value: glucose, units: "mg/dL", date: new Date(Date.now() - 5 * 60000).toISOString() } });
  if (obs.status !== 200) throw new Error("obs " + obs.status + " " + obs.text);
  console.log(JSON.stringify({ pmrn: p.json.pmrn, uuid: p.json.uuid, caseId: op.json.caseId }));
}
async function read(caseId, trackingId) {
  const a = await admin();
  const r = await a.req("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=w-insulin-default-dose`, { headers: T });
  if (r.status !== 200) throw new Error("fired " + r.status + " " + r.text);
  const rows = r.json.filter(x => !trackingId || (x.trackingId === trackingId || JSON.stringify(x).includes(trackingId)));
  for (const x of rows) console.log(JSON.stringify({ id: x.id, trackingId: x.trackingId ?? x.ruleExecutionContext?.trackingId, routeDefaultDoseOverride: x.routeDefaultDoseOverride, complianceResults: x.complianceResults }));
  return rows;
}
async function dose(pmrn, caseId, route, amount, minutesAgo = 0) {
  const u = await user();
  const sel = await u.req("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { headers: T, body: { medicationIdentifier: "m-insulin-regular", timeZone: "America/New_York" } });
  if (sel.status !== 200) throw new Error("selection " + sel.status + " " + sel.text.slice(0, 500));
  const tab = sel.json.trackingTabId;
  const ins = (sel.json.results || []).find(x => x.ruleId === "w-insulin-default-dose");
  console.log("selection tab", tab, "insulin routeDefaultDoseOverride", JSON.stringify(ins && ins.routeDefaultDoseOverride));
  const now = new Date(new Date(Date.now() - Number(minutesAgo) * 60000).toLocaleString("en-US", { timeZone: "America/New_York" }));
  const body = { medicationIdentifier: "m-insulin-regular", medicationName: "Insulin Regular", ndc: "00000003891", doseAmount: String(amount), doseUnits: "units", concentrations: [{ rawAmount: "1", unit: "units/mL", amount: 1 }], route, timeZone: "America/New_York", adminMonth: String(now.getMonth() + 1), adminDay: String(now.getDate()), adminYear: String(now.getFullYear()), adminHours: String(now.getHours()), adminMinutes: String(now.getMinutes()), trackingTabId: tab };
  const d = await u.req("POST", `/api/patient/${pmrn}/${caseId}/medication-administration`, { headers: T, body });
  console.log("dose POST", d.status, d.text.slice(0, 300));
  await sleep(3000);
  await read(caseId, tab);
}
(async () => {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "stage") await stage(args[0]);
  else if (cmd === "dose") await dose(...args);
  else if (cmd === "read") await read(...args);
})().catch(e => { console.log("ERR", e.message || e); process.exit(1); });
