const c = require("./client");
const { execSync } = require("child_process");
const T = { "X-Tenant-Id": "demo-demo" };
const PMRN = "patient-2", CASE = "10001";
const iso = m => new Date(Date.now() - m * 60000).toISOString();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function clearEgfr() {
  const r = await c.req("GET", `/api/admin/observations/patient/${PMRN}/`, null, T);
  for (const o of JSON.parse(r.body).filter(o => o.type === "EGFR")) {
    await c.req("DELETE", `/api/admin/observations/patient/${PMRN}/observation/${o.id}`, null, T);
  }
}
async function setEgfr(value) {
  await clearEgfr();
  if (value === "__none__") return;
  const r = await c.req("POST", `/api/admin/observations/patient/${PMRN}/case/${CASE}`,
    { type: "EGFR", value: value, units: "mL/min/1.73m2", date: iso(200) }, T);
  console.log("  set eGFR =", JSON.stringify(value), "->", r.status);
}
async function postGlucose(v) {
  const r = await c.req("POST", `/api/admin/observations/patient/${PMRN}/case/${CASE}`,
    { type: "GLUCOSE", value: String(v), units: "mg/dL", date: iso(0) }, T);
  return r.status;
}
function latestFired() {
  const out = execSync(`docker exec orci-loop-or-2743-postgres-1 psql -U orci -d orci -t -A -c "select details::text from \\"demo-demo\\".rule_fired_results where rule_identifier='a-adjust-insulin-infusion-rate' order by created_date desc limit 1;"`).toString().trim();
  return out;
}
function firedCount() {
  return Number(execSync(`docker exec orci-loop-or-2743-postgres-1 psql -U orci -d orci -t -A -c "select count(*) from \\"demo-demo\\".rule_fired_results where rule_identifier='a-adjust-insulin-infusion-rate';"`).toString().trim());
}
async function run(label, egfr, glucose) {
  console.log("---", label, "---");
  const before = firedCount();
  await setEgfr(egfr);
  await postGlucose(glucose);
  await sleep(2500);
  const after = firedCount();
  console.log("  fired rows:", before, "->", after, after > before ? "(RULE FIRED)" : "(NO NEW ALERT)");
  const d = latestFired();
  try {
    const j = JSON.parse(d);
    console.log("  EXPANDED_CALCULATION:", j.EXPANDED_CALCULATION);
  } catch (e) { console.log("  raw:", d.slice(0, 300)); }
}
module.exports = { run, setEgfr, postGlucose, firedCount, latestFired, c };
if (require.main === module) {
  (async () => {
    await c.login("admin", "admin");
    const cases = JSON.parse(process.argv[2]);
    for (const [label, egfr, glucose] of cases) await run(label, egfr, glucose);
  })();
}
