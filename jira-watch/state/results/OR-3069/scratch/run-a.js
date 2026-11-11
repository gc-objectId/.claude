const A = require("./api.js"); const S = require("./scen.js");
(async () => {
  await A.login();
  const weight = process.argv[2] || "130 kg"; const withPrior = process.argv[3] !== "noprior"; const giveAmount = Number(process.argv[4] || 2); const giveUnits = process.argv[5] || "g"; const tenant = process.argv[6] || S.T;
  const start = new Date(Date.now() - 2 * 3600e3);
  const p = await A.req("POST", "/api/admin/patients/", { tenant, body: { prmnPrefix: "or3069", weight, height: "180 cm", dob: "1980-01-01", gender: "MALE", genderIdentity: "MALE" } });
  if (p.status !== 200) throw new Error("createPatient " + p.status + " " + p.text.slice(0, 300));
  const o = await A.req("POST", `/api/admin/patients/${p.json.uuid}/operations/create`, { tenant, body: { startTime: start.toISOString(), procedureTypes: [] } });
  if (o.status !== 200) throw new Error("createOperation " + o.status + " " + o.text.slice(0, 300));
  const s = { pmrn: p.json.pmrn, uuid: p.json.uuid, caseId: o.json.caseId };
  console.log("staged", JSON.stringify(s), "tenant", tenant, "weight", weight, "start", start.toISOString());
  if (withPrior) {
    const b = await A.priorBolus(tenant, s.pmrn, s.caseId, { med: S.MED, amount: 3, units: "g", route: "INTRAVENOUS", when: new Date(start.getTime() + 5 * 60e3) });
    console.log("  prior bolus ->", b.status, b.status !== 200 ? b.text.slice(0, 300) : "");
  }
  const tab = await S.selectCef(s, tenant); if (!tab) process.exit(1);
  await S.document(s, tab, giveAmount, giveUnits, new Date(), {}, tenant);
  await new Promise(r => setTimeout(r, 2500));
  await S.report(s, tenant);
})().catch(e => { console.error("ERR", e); process.exit(1); });
