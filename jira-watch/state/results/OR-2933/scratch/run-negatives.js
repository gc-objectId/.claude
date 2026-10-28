const S = require("./stage");
const slim = (c) => { const j = JSON.parse(c.body); return { outcome: j.outcome, recommended: j.recommended.map(o => ({ drugs: o.medicationCandidates.map(m => m.medicationCategory), mrsaAdjusted: o.mrsaAdjusted })), contraindicated: j.contraindicated }; };
const sel = (r) => r.results;
(async () => {
  await S.login("admin", "admin");
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const cases = {};
  cases.noMrsa = await S.stage({ prefix: "nomrsa", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [] });
  cases.laterNeg = await S.stage({ prefix: "laterneg", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(3) }, { value: "MRSA Negative", date: ago(1) }] });
  cases.stale = await S.stage({ prefix: "stale", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(9) }] });
  cases.orStep = await S.stage({ prefix: "orstep", procedure: "p-laparoscopic", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  cases.cefMetro = await S.stage({ prefix: "cefmetro", procedure: "p-appendectomy", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  cases.vancoAllergy = await S.stage({ prefix: "vancoalg", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }], allergies: ["m-vancomycin-iv"] });
  cases.vancoLinezAllergy = await S.stage({ prefix: "vanclinalg", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }], allergies: ["m-vancomycin-iv", "m-linezolid-iv"] });
  cases.allThree = await S.stage({ prefix: "allthree", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }], allergies: ["m-vancomycin-iv", "m-linezolid-iv", "m-daptomycin-iv"] });
  for (const [k, c] of Object.entries(cases)) {
    console.log("\n##", k, c.pmrn, c.caseId);
    console.log("  candidates:", JSON.stringify(slim(await S.candidates(c.pmrn, c.caseId))));
    console.log("  select vanco:", JSON.stringify(sel(await S.select(c.pmrn, c.caseId, "m-vancomycin-iv"))));
  }
})().catch(e => console.error("FAIL", e));
