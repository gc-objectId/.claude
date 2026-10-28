const S = require("./stage");
const J = JSON.stringify;
async function notFired(caseId, rule) { const r = await S.req("GET", `/api/admin/rule/evaluations/not-fired?caseId=${caseId}&ruleIdentifier=${rule}&limit=3`, { headers: S.T }); return JSON.parse(r.body).map(x => ({ rule: x.ruleIdentifier, explanation: x.explanation, at: x.createdDate })); }
const slim = (c) => { const j = JSON.parse(c.body); return { outcome: j.outcome, recommended: j.recommended.map(o => ({ drugs: o.medicationCandidates.map(m => m.medicationCategory), mrsaAdjusted: o.mrsaAdjusted })) }; };
(async () => {
  await S.login("admin", "admin");
  const pos = { pmrn: "mrsapos-fake-f033200d-4c7e-4e5a-941a-59b349c7556d", caseId: "06946" };
  console.log("explanations: wrong-antibiotic on positive case:", J(await notFired(pos.caseId, "a-known-procedure-wrong-antibiotic")));
  console.log("explanations: incomplete-pathway on non-MRSA cefazolin-given case:", J(await notFired("18953", "a-incomplete-antibiotic-pathway")));
  console.log("\n## DATA FLIP: add later MRSA Negative to positive case");
  const r = await S.req("POST", `/api/admin/observations/patient/${pos.pmrn}/case/${pos.caseId}`, { body: J({ type: "MRSA_INFECTION", value: "MRSA Negative", units: null, date: new Date().toISOString() }), headers: S.T });
  console.log("obs", r.status, r.body);
  console.log("candidates (re-resolved):", J(slim(await S.candidates(pos.pmrn, pos.caseId))));
  console.log("select vanco:", J((await S.select(pos.pmrn, pos.caseId, "m-vancomycin-iv")).results));
  console.log("\n## REVERT: delete all observations, re-add positive");
  const d = await S.req("DELETE", `/api/admin/observations/patient/${pos.pmrn}`, { headers: S.T });
  console.log("delete", d.status);
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const r2 = await S.req("POST", `/api/admin/observations/patient/${pos.pmrn}/case/${pos.caseId}`, { body: J({ type: "MRSA_INFECTION", value: "MRSA Positive", units: null, date: ago(1) }), headers: S.T });
  console.log("obs", r2.status, r2.body);
  const obs = await S.req("GET", `/api/admin/observations/patient/${pos.pmrn}/`, { headers: S.T });
  console.log("observations now:", obs.body.slice(0, 300));
  console.log("candidates (re-resolved):", J(slim(await S.candidates(pos.pmrn, pos.caseId))));
  console.log("select vanco:", J((await S.select(pos.pmrn, pos.caseId, "m-vancomycin-iv")).results));
})().catch(e => console.error("FAIL", e));
