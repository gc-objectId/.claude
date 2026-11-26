const { makeClient } = require("./http");
(async () => {
  const c = makeClient();
  await c.login("admin", "admin");
  const info = await c.call("GET", "/api/user-info");
  console.log("user-info", info.status, JSON.stringify(info.json).slice(0, 400));
  const tenant = "demo-demo";
  const p = await c.mutate("POST", "/api/admin/patients/", { headers: { "X-Tenant-Id": tenant }, body: {
    prmnPrefix: "OR3242", firstName: "Test", lastName: "Patient", dob: "1981-05-05", height: "175 cm", weight: "80 kg", gender: "MALE", genderIdentity: "MALE" } });
  console.log("create patient", p.status, p.text.slice(0, 300));
  const uuid = p.json && p.json.uuid;
  const o = await c.mutate("POST", `/api/admin/patients/${uuid}/operations/create`, { headers: { "X-Tenant-Id": tenant }, body: {
    procedureTypes: [{ id: "p-gastro-uncomplicated", qualifier: null }], startTime: new Date().toISOString() } });
  console.log("create operation", o.status, o.text.slice(0, 300));
  const list = await c.call("GET", `/api/admin/patients?client_id=${tenant}&size=5`);
  console.log("list", list.status, list.text.slice(0, 400));
})().catch((e) => { console.error("ERR", e); process.exit(1); });
