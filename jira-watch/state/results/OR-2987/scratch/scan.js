const { makeClient } = require("./client");
const { pmrn, caseId } = require("./case.json");
(async () => {
  const c = makeClient("demo-demo");
  const l = await c.login("loopuser", "LoopValidate1!");
  for (const barcode of process.argv.slice(2)) {
    const r = await c.request("POST", `/api/cds/medication-selection/${encodeURIComponent(pmrn)}/${encodeURIComponent(caseId)}`, { body: { barcode, timeZone: "America/New_York", isReselection: false } });
    let summary = r.body.slice(0, 400);
    try { const j = JSON.parse(r.body); summary = JSON.stringify({ medication: j.medication && (j.medication.medicationIdentifier || j.medication.identifier || j.medication.name), ndc: j.ndc, keys: Object.keys(j).slice(0, 12) }); } catch {}
    console.log(JSON.stringify(barcode), "->", r.status, summary);
  }
})();
