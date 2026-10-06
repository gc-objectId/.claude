const L = require("./lib.js");
(async () => {
  console.log("login", await L.a.login());
  const E = await L.stage("V2944POST", ["p-colorectal"]);
  await L.event(E);
  console.log("after 1st start: merged fired", (await L.fired(E)).map((f) => f.details.PATHWAY_STATUS), "old-missing fired", (await L.fired(E, "a-known-procedure-missing-antibiotic")).length);
  await L.bolus(E, "m-cefazolin", 2000); await L.event(E);
  console.log("after partial dose + 2nd start: merged fired", (await L.fired(E)).map((f) => f.details.PATHWAY_STATUS), "notFired", JSON.stringify((await L.notFired(E)).map((n) => n.explanation)), "old-missing fired", (await L.fired(E, "a-known-procedure-missing-antibiotic")).length);
  console.log("CASE", JSON.stringify(E));
})().catch((e) => { console.log("ERR", e.message); process.exit(1); });
