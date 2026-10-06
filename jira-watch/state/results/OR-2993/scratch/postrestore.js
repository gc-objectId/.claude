const L = require("./lib.js");
(async () => {
  console.log("login", await L.a.login());
  const P3 = await L.stage("V2993P3", ["p-hysterectomy"]);
  await L.run("P3 post-restore: hysterectomy, cefazolin GASTRIC_TUBE only -> expect PARTIALLY_GIVEN missing metronidazole + cefazolin redose job", P3, [["m-cefazolin", "GASTRIC_TUBE", 2000]]);
  const P4 = await L.stage("V2993P4", ["p-hysterectomy"]);
  await L.run("P4 post-restore: hysterectomy, metronidazole IV + cefazolin GASTRIC_TUBE -> expect no fire", P4, [["m-metronidazole-iv", "INTRAVENOUS", 500], ["m-cefazolin", "GASTRIC_TUBE", 2000]]);
  console.log("\nCASES", JSON.stringify({ P3, P4 }));
})().catch((e) => { console.log("ERR", e.message); process.exit(1); });
