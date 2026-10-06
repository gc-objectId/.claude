const L = require("./lib.js");
(async () => {
  console.log("login", await L.a.login());
  const P1 = await L.stage("V2993P1", ["p-hysterectomy"]); console.log("outcome", (await L.guidance(P1)).outcome);
  await L.run("P1 positive: hysterectomy, metronidazole IV + cefazolin GASTRIC_TUBE -> expect no fire", P1, [["m-metronidazole-iv", "INTRAVENOUS", 500], ["m-cefazolin", "GASTRIC_TUBE", 2000]]);
  const P2 = await L.stage("V2993P2", ["p-hysterectomy"]);
  await L.run("P2 positive: hysterectomy, cefazolin GASTRIC_TUBE only -> expect PARTIALLY_GIVEN missing metronidazole", P2, [["m-cefazolin", "GASTRIC_TUBE", 2000]]);
  const N1 = await L.stage("V2993N1", ["p-hysterectomy"]);
  await L.run("N1 negative: hysterectomy, metronidazole IV + cefazolin TOPICAL -> expect PARTIALLY_GIVEN missing cefazolin", N1, [["m-metronidazole-iv", "INTRAVENOUS", 500], ["m-cefazolin", "TOPICAL", 2000]]);
  const N2 = await L.stage("V2993N2", ["p-hysterectomy"]);
  await L.run("N2 negative: hysterectomy, cefazolin TOPICAL only -> expect NONE_GIVEN", N2, [["m-cefazolin", "TOPICAL", 2000]]);
  console.log("\nCASES", JSON.stringify({ P1, P2, N1, N2 }));
})().catch((e) => { console.log("ERR", e.message); process.exit(1); });
