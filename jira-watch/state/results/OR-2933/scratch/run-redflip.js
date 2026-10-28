const S = require("./stage");
const J = JSON.stringify;
const slim = (c) => { const j = JSON.parse(c.body); return { outcome: j.outcome, recommended: j.recommended.map(o => ({ drugs: o.medicationCandidates.map(m => m.medicationCategory), mrsaAdjusted: o.mrsaAdjusted })) }; };
const cand2 = async (c) => { await S.candidates(c.pmrn, c.caseId); return J(slim(await S.candidates(c.pmrn, c.caseId))); };
const sel = async (c) => J((await S.select(c.pmrn, c.caseId, "m-vancomycin-iv")).results.map(r => r.ruleId));
(async () => {
  await S.login("admin", "admin");
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const c = await S.stage({ prefix: "redflip", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  console.log("case", J(c));
  console.log("BEFORE  candidates:", await cand2(c)); console.log("BEFORE  select vanco:", await sel(c));
  const r = await S.req("POST", `/api/admin/observations/patient/${c.pmrn}/case/${c.caseId}`, { body: J({ type: "MRSA_INFECTION", value: "MRSA Negative", units: null, date: new Date().toISOString() }), headers: S.T });
  console.log("\nFLIP: later MRSA Negative added", r.status);
  console.log("FLIPPED candidates:", await cand2(c)); console.log("FLIPPED select vanco:", await sel(c));
  console.log("\nREVERT: delete all observations, re-add positive", (await S.req("DELETE", `/api/admin/observations/patient/${c.pmrn}`, { headers: S.T })).status,
    (await S.req("POST", `/api/admin/observations/patient/${c.pmrn}/case/${c.caseId}`, { body: J({ type: "MRSA_INFECTION", value: "MRSA Positive", units: null, date: ago(1) }), headers: S.T })).status);
  console.log("REVERTED candidates:", await cand2(c)); console.log("REVERTED select vanco:", await sel(c));
  require("fs").writeFileSync(__dirname + "/redflip-case.json", J(c));
})().catch(e => console.error("FAIL", e));
