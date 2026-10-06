const L = require("./lib.js");
(async () => {
  console.log("login", await L.a.login());
  const R1 = await L.stage("V2993R1", ["p-hysterectomy"]);
  await L.run("R1 RED (pre-fix class): hysterectomy, metronidazole IV + cefazolin GASTRIC_TUBE -> old code should fire PARTIALLY_GIVEN missing cefazolin", R1, [["m-metronidazole-iv", "INTRAVENOUS", 500], ["m-cefazolin", "GASTRIC_TUBE", 2000]]);
  const R2 = await L.stage("V2993R2", ["p-hysterectomy"]);
  await L.run("R2 RED (pre-fix class): hysterectomy, cefazolin GASTRIC_TUBE only -> old code should fire NONE_GIVEN and schedule no redose job", R2, [["m-cefazolin", "GASTRIC_TUBE", 2000]]);
  console.log("\nCASES", JSON.stringify({ R1, R2 }));
})().catch((e) => { console.log("ERR", e.message); process.exit(1); });
