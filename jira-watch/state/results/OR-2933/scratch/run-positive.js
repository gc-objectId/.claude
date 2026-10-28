const S = require("./stage");
(async () => {
  console.log("login", (await S.login("admin", "admin")).status);
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const c = await S.stage({ prefix: "mrsapos", procedure: "p-elective-cerebrospinal-fluid-shunting", mrsa: [{ value: "MRSA Positive", date: ago(1) }] });
  console.log("case", c);
  const cand = await S.candidates(c.pmrn, c.caseId);
  console.log("candidates", cand.status, cand.body);
  console.log("select vanco", JSON.stringify(await S.select(c.pmrn, c.caseId, "m-vancomycin-iv"), (k, v) => k === "raw" ? undefined : v, 1));
})().catch(e => console.error("FAIL", e));
