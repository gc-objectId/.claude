// usage: node select.js <pmrn> <caseId> [medicationIdentifier...]
const { makeSession } = require("./client");
(async () => {
  const [pmrn, caseId, ...meds] = process.argv.slice(2);
  const user = makeSession();
  console.log("user login", await user.login("loopuser", "LoopValidate1!"));
  for (const med of meds) {
    const sel = await user.request("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { body: { medicationIdentifier: med, timeZone: "UTC" } });
    const results = Array.isArray(sel.body?.results) ? sel.body.results : [];
    const allergy = results.filter((r) => r.ruleId === "a-general-allergy");
    console.log(`select ${med}`, sel.status, typeof sel.body === "string" ? sel.body.slice(0,200) : "", "\n  rules:", results.map((r) => r.ruleId).join(",") || "(none)", "\n  allergy allergen:", allergy.map(a => a.details?.ALLERGY_ALLERGEN).join(",") || "(none)", allergy[0]?.prompt?.title ? "title=" + allergy[0].prompt.title : "");
  }
})().catch((e) => { console.error(e); process.exit(1); });
