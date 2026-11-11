const { Client } = require("./http.js");
(async () => {
  const tenant = process.argv[2]; const weight = process.argv[3] || "83 kg";
  const c = new Client(tenant);
  await c.login("admin", "admin");
  const p = await c.request("POST", "/api/admin/patients/", { body: { prmnPrefix: "or3097", firstName: "Hep", lastName: "Arin", dob: "1980-01-01", weight, height: "175 cm", gender: "MALE", genderIdentity: "MALE" } });
  if (p.status !== 200) throw new Error("create patient " + p.status + " " + p.text);
  const op = await c.request("POST", `/api/admin/patients/${p.json.uuid}/operations/create`, { body: { startTime: new Date().toISOString(), procedureTypes: [{ id: "p-angiogram-arm", qualifier: null }] } });
  if (op.status !== 200) throw new Error("create op " + op.status + " " + op.text);
  console.log(JSON.stringify({ pmrn: p.json.pmrn, uuid: p.json.uuid, caseId: op.json.caseId }));
})().catch(e => { console.error(e); process.exit(1); });
