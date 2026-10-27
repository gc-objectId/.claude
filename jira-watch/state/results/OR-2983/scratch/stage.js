// usage: node stage.js <label> <medId1> <medId2> ...  -> creates ERAS case, inserts bolus admins, prints pmrn|caseId|patientUuid|opUuid
const { execFileSync } = require("child_process");
const { req, login } = require("./client.js");
const T = "demo-demo";
const sql = s => execFileSync("docker", ["exec", "-i", "orci-loop-or-2983-postgres-1", "psql", "-U", "orci", "-d", "orci", "-At", "-v", "ON_ERROR_STOP=1"], { input: s }).toString().trim();
(async () => {
  const [label, ...medIds] = process.argv.slice(2);
  await login("admin", "admin");
  const p = await req("POST", "/api/admin/patients/", { tenant: T, body: { prmnPrefix: label, firstName: "Eras", lastName: label } });
  if (p.status !== 200) throw new Error("patient " + p.status + " " + p.body);
  const { pmrn, uuid } = JSON.parse(p.body);
  const start = new Date(Date.now() - 2 * 3600e3).toISOString();
  const o = await req("POST", `/api/admin/patients/${uuid}/operations/create`, { tenant: T, body: { startTime: start, procedureTypes: [{ id: "p-hysterectomy" }] } });
  if (o.status !== 200) throw new Error("op " + o.status + " " + o.body);
  const op = JSON.parse(o.body);
  const opRow = sql(`select id, eras_operation from "${T}".operations where case_id='${op.caseId}'`).split("|");
  let i = 0;
  for (const medId of medIds) {
    i++;
    const adminAt = new Date(Date.now() - (90 - i * 10) * 60e3).toISOString();
    sql(`set search_path to "${T}";
      insert into medication_orders (id, created_date, last_modified_date, patient_id, operation_id, medication_administration_type, ordering_provider_specialties, deleted)
        values (gen_random_uuid(), now(), now(), '${uuid}', '${opRow[0]}', 'BOLUS', '[]', false);
      insert into medication_administrations (id, created_date, last_modified_date, patient_id, operation_id, medication_id, medication_order_id, administration_date, dose_amount, dose_units, route, source_type, codings, concentrations, deleted)
        select gen_random_uuid(), now(), now(), '${uuid}', '${opRow[0]}', '${medId}', mo.id, '${adminAt}', 4, 'mg', 'INTRAVENOUS', 'APPLICATION', '[]', '[]', false
        from medication_orders mo where mo.patient_id='${uuid}' and mo.operation_id='${opRow[0]}' order by created_date desc limit 1;`);
  }
  console.log([pmrn, op.caseId, uuid, opRow[0], "eras=" + opRow[1]].join("|"));
})().catch(e => { console.error(e.message); process.exit(1); });
