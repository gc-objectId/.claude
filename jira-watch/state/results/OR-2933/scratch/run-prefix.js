const S = require("./stage");
const J = JSON.stringify; const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const slim = (c) => { const j = JSON.parse(c.body); return { outcome: j.outcome, recommended: j.recommended.map(o => ({ drugs: o.medicationCandidates.map(m => m.medicationCategory), mrsaAdjusted: o.mrsaAdjusted })) }; };
const cand2 = async (c) => { await S.candidates(c.pmrn, c.caseId); return J(slim(await S.candidates(c.pmrn, c.caseId))); };
async function fired(caseId, rule) { const r = await S.req("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=${rule}`, { headers: S.T }); return JSON.parse(r.body).map(x => ({ rule: x.ruleIdentifier, status: x.details && x.details.PATHWAY_STATUS, mrsa: x.details && x.details.MRSA_ADJUSTED_OPTION_RECOMMENDED, groups: x.details && (x.details.ANTIBIOTIC_GROUPS || x.details.PARTIALLY_GIVEN_GROUPS) })); }
(async () => {
  await S.login("admin", "admin");
  const tag = process.argv[2] || "x";
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const c = await S.stage({ prefix: tag + "sel", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  console.log("case", J(c));
  console.log("candidates:", await cand2(c));
  console.log("select vanco:", J((await S.select(c.pmrn, c.caseId, "m-vancomycin-iv")).results.map(r => r.ruleId)));
  const e = await S.stage({ prefix: tag + "evt", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  console.log("event case", J(e), J(await S.event(e.pmrn, e.caseId, ["PROCEDURE_START"])));
  await sleep(4000);
  console.log("incomplete-pathway fired:", J(await fired(e.caseId, "a-incomplete-antibiotic-pathway")));
  require("fs").writeFileSync(__dirname + `/${tag}-cases.json`, J({ c, e }));
})().catch(e => console.error("FAIL", e));
