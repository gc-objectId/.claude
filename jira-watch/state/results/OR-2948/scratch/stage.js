const { Client } = require("./http.js");
(async () => {
  const tag = process.argv[2]; const procs = process.argv[3].split(",");
  const c = new Client("demo-demo");
  await c.login("admin", "admin");
  const p = await c.request("POST", "/api/admin/patients/", { body: { prmnPrefix: tag, firstName: "Loop", lastName: tag, dob: "1980-01-01", weight: "80 kg", height: "175 cm", gender: "FEMALE", genderIdentity: "FEMALE" } });
  if (p.status !== 200) throw new Error("create patient " + p.status + " " + p.text);
  const op = await c.request("POST", `/api/admin/patients/${p.json.uuid}/operations/create`, { body: { startTime: new Date().toISOString(), procedureTypes: procs.map(id => ({ id, qualifier: null })) } });
  if (op.status !== 200) throw new Error("create op " + op.status + " " + op.text);
  const l = await c.request("POST", "/api/app-launch", { body: { patientId: p.json.pmrn, caseId: op.json.caseId, forceLaunch: true } });
  console.log(JSON.stringify({ pmrn: p.json.pmrn, uuid: p.json.uuid, caseId: op.json.caseId, launch: l.status, launchAlerts: (l.json && l.json.alerts) ? l.json.alerts.length : l.text.slice(0, 120) }));
})().catch(e => { console.error(e); process.exit(1); });
