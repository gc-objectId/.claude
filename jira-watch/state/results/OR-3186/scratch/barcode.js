const { req, login } = require("./client");
const [,, tenant, patientId, caseId] = process.argv;
(async () => {
  console.log("loopuser login", (await login("loopuser", "LoopValidate1!")).status);
  const r = await req("POST", `/api/cds/user-barcode-mappings/${patientId}/${caseId}`, { body: JSON.stringify({ barcode: "OR3186-BARCODE-1", medicationIdentifier: "g-acetaminophen" }), headers: { "X-Tenant-Id": tenant } });
  console.log("POST user-barcode-mappings", r.status, r.body.slice(0, 200));
})();
