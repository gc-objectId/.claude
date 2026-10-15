const { makeClient } = require("./client");
const { pmrn, caseId } = require("./case.json");
(async () => {
  const c = makeClient("demo-demo");
  await c.login("loopuser", "LoopValidate1!");
  const barcode = process.argv[2];
  const r = await c.request("POST", `/api/cds/medication-selection/${encodeURIComponent(pmrn)}/${encodeURIComponent(caseId)}`, { body: { barcode, timeZone: "America/New_York", isReselection: false } });
  const j = JSON.parse(r.body);
  const ctx = j.context || {};
  console.log(r.status, JSON.stringify({ medication: ctx.medication && (ctx.medication.medicationIdentifier || ctx.medication.identifier || ctx.medication.name), medicationSelection: ctx.medicationSelection && { ndc: ctx.medicationSelection.ndc, ndcPattern: ctx.medicationSelection.ndcPattern, barcode: ctx.medicationSelection.barcode }, medicationIdentifier: ctx.medicationIdentifier, ndc: ctx.ndc, isScanned: ctx.isScanned }));
})();
