const L = require("./lib.js");
(async () => {
  console.log("login", await L.a.login());
  console.log("\n=== A: NONE_GIVEN positive (p-gastroduodenal, nothing given)");
  const A = await L.stage("V2944A", ["p-gastroduodenal"]);
  console.log("case", A, "outcome", (await L.guidance(A)).outcome);
  await L.event(A);
  const Af = await L.fired(A); console.log("fired", Af.length, JSON.stringify(L.brief(Af), null, 1));
  console.log("rawKeys", Af[0] && Object.keys(Af[0]), "details", Af[0] && JSON.stringify(Af[0].details).slice(0, 600));

  console.log("\n=== B: PARTIALLY_GIVEN positive (p-colorectal, cefazolin only)");
  const B = await L.stage("V2944B", ["p-colorectal"]);
  console.log("case", B, "outcome", (await L.guidance(B)).outcome);
  await L.bolus(B, "m-cefazolin", 2000);
  await L.event(B);
  const Bf = await L.fired(B); console.log("fired", Bf.length, JSON.stringify(L.brief(Bf), null, 1));
  console.log("notFired", JSON.stringify((await L.notFired(B)).map((n) => n.explanation)));

  console.log("\n=== C: negative — complete option (p-colorectal, cefazolin + metronidazole)");
  const C = await L.stage("V2944C", ["p-colorectal"]);
  await L.bolus(C, "m-cefazolin", 2000); await L.bolus(C, "m-metronidazole-iv", 500);
  await L.event(C);
  console.log("fired", (await L.fired(C)).length, "notFired", JSON.stringify((await L.notFired(C)).map((n) => n.explanation)));

  console.log("\n=== D: shared lockout — NONE_GIVEN fires, then partial dose + second PROCEDURE_START must abstain");
  const D = await L.stage("V2944D", ["p-colorectal"]);
  await L.event(D);
  let Df = await L.fired(D); console.log("after 1st start: fired", Df.length, Df.map((f) => f.details && f.details.PATHWAY_STATUS));
  await L.bolus(D, "m-cefazolin", 2000);
  await L.event(D);
  Df = await L.fired(D); console.log("after partial dose + 2nd start: fired", Df.length, Df.map((f) => f.details && f.details.PATHWAY_STATUS));
  console.log("notFired", JSON.stringify((await L.notFired(D)).map((n) => n.explanation)));
  console.log("\nCASES", JSON.stringify({ A, B, C, D }));
})().catch((e) => { console.log("ERR", e.message); process.exit(1); });
