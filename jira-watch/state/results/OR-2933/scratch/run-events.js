const S = require("./stage");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function fired(caseId, rule) { const r = await S.req("GET", `/api/admin/rule/evaluations/fired?caseId=${caseId}&ruleIdentifier=${rule}`, { headers: S.T }); return JSON.parse(r.body).map(x => ({ rule: x.ruleIdentifier, status: x.details && x.details.PATHWAY_STATUS, mrsa: x.details && x.details.MRSA_ADJUSTED_OPTION_RECOMMENDED, groups: x.details && (x.details.ANTIBIOTIC_GROUPS || x.details.PARTIALLY_GIVEN_GROUPS), citations: x.citations, keys: Object.keys(x) })); }
async function notFired(caseId, rule) { const r = await S.req("GET", `/api/admin/rule/evaluations/not-fired?caseId=${caseId}&ruleIdentifier=${rule}`, { headers: S.T }); return JSON.parse(r.body).map(x => ({ rule: x.ruleIdentifier, reason: x.reason || x.abstainReason || x.message, keys: Object.keys(x) })); }
(async () => {
  await S.login("admin", "admin");
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const pos = { pmrn: "mrsapos-fake-f033200d-4c7e-4e5a-941a-59b349c7556d", caseId: "06946" };
  console.log("not-fired wrong-antibiotic on positive case:", JSON.stringify(await notFired(pos.caseId, "a-known-procedure-wrong-antibiotic")));
  console.log("raw citations cefMetro dapto:", JSON.stringify((await S.select("cefmetro-fake-8c6e696a-547c-46ce-9504-657a1049c427", "20481", "m-daptomycin-iv")).raw.results.map(r => ({ ruleId: r.ruleId, citations: r.citations, keys: Object.keys(r) }))));
  console.log("\n## PROCEDURE_START, MRSA positive, nothing given:", JSON.stringify(await S.event(pos.pmrn, pos.caseId, ["PROCEDURE_START"])));
  await sleep(4000);
  console.log(JSON.stringify(await fired(pos.caseId, "a-incomplete-antibiotic-pathway"), null, 1));
  const given = await S.stage({ prefix: "mrsagiven", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  console.log("\n## bolus cefazolin on MRSA case", given.caseId, JSON.stringify(await S.bolus(given.pmrn, given.caseId, "m-cefazolin")));
  await sleep(2000);
  console.log("PROCEDURE_START:", JSON.stringify(await S.event(given.pmrn, given.caseId, ["PROCEDURE_START"])));
  await sleep(4000);
  console.log(JSON.stringify(await fired(given.caseId, "a-incomplete-antibiotic-pathway"), null, 1));
  const neg = await S.stage({ prefix: "nomrsagiven", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [] });
  console.log("\n## bolus cefazolin on non-MRSA case", neg.caseId, JSON.stringify(await S.bolus(neg.pmrn, neg.caseId, "m-cefazolin")));
  await sleep(2000);
  console.log("PROCEDURE_START:", JSON.stringify(await S.event(neg.pmrn, neg.caseId, ["PROCEDURE_START"])));
  await sleep(4000);
  console.log("fired:", JSON.stringify(await fired(neg.caseId, "a-incomplete-antibiotic-pathway")));
  console.log("not-fired:", JSON.stringify(await notFired(neg.caseId, "a-incomplete-antibiotic-pathway")));
})().catch(e => console.error("FAIL", e));
