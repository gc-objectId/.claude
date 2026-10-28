const S = require("./stage");
const slim = (c) => { const j = JSON.parse(c.body); return { outcome: j.outcome, recommended: j.recommended.map(o => ({ drugs: o.medicationCandidates.map(m => m.medicationCategory), mrsaAdjusted: o.mrsaAdjusted })), contraindicated: j.contraindicated }; };
(async () => {
  await S.login("admin", "admin");
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const cases = {};
  cases.orStep = await S.stage({ prefix: "orstep", procedure: "p-ent-clean-placement-of-prosthesis", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  cases.cefGentOrCef = await S.stage({ prefix: "cefgent", procedure: "p-clean-with-entry-into-urinary-tract", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  cases.cefMetro = await S.stage({ prefix: "cefmetro", procedure: "p-appendectomy", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  cases.vancoAllergy = await S.stage({ prefix: "vancoalg", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }], allergies: ["m-vancomycin-iv"] });
  cases.vancoLinezAllergy = await S.stage({ prefix: "vanclinalg", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }], allergies: ["m-vancomycin-iv", "m-linezolid-iv"] });
  cases.allThree = await S.stage({ prefix: "allthree", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }], allergies: ["m-vancomycin-iv", "m-linezolid-iv", "m-daptomycin-iv"] });
  cases.unknownText = await S.stage({ prefix: "unknowntxt", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "Pending", date: ago(1) }] });
  for (const [k, c] of Object.entries(cases)) {
    console.log("\n##", k, c.pmrn, c.caseId);
    console.log("  candidates:", JSON.stringify(slim(await S.candidates(c.pmrn, c.caseId))));
    for (const m of ["m-vancomycin-iv", "m-daptomycin-iv"]) console.log("  select", m, JSON.stringify((await S.select(c.pmrn, c.caseId, m)).results));
  }
})().catch(e => console.error("FAIL", e));
