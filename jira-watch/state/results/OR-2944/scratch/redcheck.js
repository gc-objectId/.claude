const L = require("./lib.js");
const NO = "a-known-procedure-no-antibiotic", MISSING = "a-known-procedure-missing-antibiotic";
(async () => {
  console.log("login", await L.a.login());
  console.log("\n=== RED: lockout scenario under pre-fix classes (p-colorectal)");
  const R = await L.stage("V2944RED", ["p-colorectal"]);
  await L.event(R);
  console.log("after 1st start: NO fired", (await L.fired(R, NO)).length, "MISSING fired", (await L.fired(R, MISSING)).length, "merged fired", (await L.fired(R)).length);
  await L.bolus(R, "m-cefazolin", 2000);
  await L.event(R);
  const m = await L.fired(R, MISSING);
  console.log("after partial dose + 2nd start: NO fired", (await L.fired(R, NO)).length, "MISSING fired", m.length, JSON.stringify(L.brief(m)), "merged fired", (await L.fired(R)).length);
  console.log("notFired NO", JSON.stringify((await L.notFired(R, NO)).map((n) => n.explanation)), "notFired MISSING", JSON.stringify((await L.notFired(R, MISSING)).map((n) => n.explanation)));

  console.log("\n=== OLD A: p-gastroduodenal nothing given");
  const A = await L.stage("V2944OA", ["p-gastroduodenal"]); await L.event(A);
  console.log("NO fired", (await L.fired(A, NO)).length, "MISSING fired", (await L.fired(A, MISSING)).length);
  console.log("\n=== OLD B: p-colorectal cefazolin only");
  const B = await L.stage("V2944OB", ["p-colorectal"]); await L.bolus(B, "m-cefazolin", 2000); await L.event(B);
  console.log("NO fired", (await L.fired(B, NO)).length, "MISSING fired", (await L.fired(B, MISSING)).length);
  console.log("\nCASES", JSON.stringify({ R, A, B }));
})().catch((e) => { console.log("ERR", e.message); process.exit(1); });
