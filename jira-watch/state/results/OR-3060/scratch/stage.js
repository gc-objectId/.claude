const c = require("./client.js");
const { execSync } = require("child_process");
function sql(q) { return execSync(`docker exec -i orci-loop-or-3060-postgres-1 psql -U orci -d orci -At -c ${JSON.stringify(q)}`).toString().trim(); }
async function stage(tenant, label, { conditionId, tags, dob = "1951-01-01" }) {
  const p = await c.request("POST", "/api/admin/patients/", { tenant, body: { prmnPrefix: label, firstName: label, lastName: "Loop", dob, weight: "80 kg", height: "175 cm", gender: "MALE", genderIdentity: "MALE" } });
  if (p.status !== 200) throw new Error("patient " + p.status + " " + p.text);
  const { pmrn, uuid } = p.json;
  const op = await c.request("POST", `/api/admin/patients/${uuid}/operations/create`, { tenant, body: { startTime: new Date().toISOString(), procedureTypes: [{ id: "p-appendectomy", qualifier: null }] } });
  if (op.status !== 200) throw new Error("op " + op.status + " " + op.text);
  const caseId = op.json.caseId;
  if (conditionId) {
    const cond = await c.request("POST", `/api/admin/patients/${pmrn}/conditions`, { tenant, body: { conditionId, tags, onsetDate: "2020-01-01T00:00:00Z" } });
    if (cond.status !== 201) throw new Error("cond " + cond.status + " " + cond.text);
  }
  sql(`insert into "${tenant}".patient_observations (id, created_date, last_modified_date, effective_time, patient_id, code, code_system, observation_name, observation_value, type, observation_units, deleted) values (gen_random_uuid(), now(), now(), now() - interval '5 minutes', '${uuid}', '2345-7', 'LOINC', 'Glucose', '200', 'GLUCOSE', 'mg/dL', false)`);
  return { tenant, label, pmrn, uuid, caseId };
}
async function select(f) {
  const r = await c.request("POST", `/api/cds/medication-selection/${f.pmrn}/${f.caseId}`, { tenant: f.tenant, body: { medicationIdentifier: "m-insulin-regular", timeZone: "America/Chicago" } });
  if (r.status !== 200) return { status: r.status, text: r.text.slice(0, 400) };
  const sc = r.json?.dosingFormState?.perRouteState?.SUBCUTANEOUS?.doseOptions?.filter(o => o.defaultOption).map(o => o.label || o.rawLabel || JSON.stringify(o));
  const fired = await c.request("GET", `/api/admin/rule/evaluations/fired?caseId=${f.caseId}&ruleIdentifier=w-insulin-default-dose`, { tenant: f.tenant });
  const latest = (fired.json || [])[0];
  return { status: r.status, scDefault: sc, firedCount: (fired.json || []).length, details: latest?.details, scOverride: latest?.routeDefaultDoseOverride?.SUBCUTANEOUS?.rawLabel ?? latest?.routeDefaultDoseOverride?.SUBCUTANEOUS };
}
module.exports = { stage, select, sql };
if (require.main === module) (async () => {
  console.log("login", await c.login("admin", "admin"));
  const fx = {};
  fx.mayoT2 = await stage("mayo-mayo", "mayoT2", { conditionId: "c-type-2-diabetes-mellitus", tags: ["DIABETES_TYPE_2"] });
  fx.mayoNone = await stage("mayo-mayo", "mayoNone", {});
  fx.mayoT1 = await stage("mayo-mayo", "mayoT1", { conditionId: "c-type-1-diabetes-mellitus", tags: ["DIABETES_TYPE_1"] });
  fx.demoT2 = await stage("demo-demo", "demoT2", { conditionId: "c-type-2-diabetes-mellitus", tags: ["DIABETES_TYPE_2"] });
  require("fs").writeFileSync(__dirname + "/fixtures.json", JSON.stringify(fx, null, 2));
  for (const [k, f] of Object.entries(fx)) console.log(k, f.pmrn, f.caseId, JSON.stringify(await select(f)));
})().catch(e => { console.log("ERR", e.message); process.exit(1); });
