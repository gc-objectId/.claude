const fs = require("fs");
const { loginAdmin, sendHl7 } = require("./client");

const BASE = fs.readFileSync(
  "/Users/ryanducharme/dev/worktrees/OR-2678-mayo-parse-out-asa/mayo-client-integration/src/test/resources/hl7/rormc-siu-s14-before.hl7",
  "utf8"
);

function build({ caseId, pmrn, zcs }) {
  let m = BASE.replace(/\r?\n/g, "\r").trimEnd();
  m = m.replace("SCH||183820|", `SCH||${caseId}|`);
  m = m.replace("11201809^^^MC^MC", `${pmrn}^^^MC^MC`);
  m = m.replace("ZCS|BEFORE|N|ORSCH_S14", zcs);
  if (!m.includes(`SCH||${caseId}|`)) throw new Error("caseId not substituted");
  if (!m.includes(`${pmrn}^^^MC^MC`)) throw new Error("pmrn not substituted");
  if (!m.includes(zcs)) throw new Error("zcs not substituted");
  return m + "\r";
}

const scenarios = JSON.parse(process.argv[2]);

(async () => {
  const l = await loginAdmin();
  if (l.status !== 200) throw new Error("login failed " + l.status);
  for (const s of scenarios) {
    const raw = build(s);
    const res = await sendHl7(raw);
    console.log(`${s.name}\tcase=${s.caseId}\tpmrn=${s.pmrn}\tzcs="${s.zcs}"\tHTTP ${res.status}\t${res.body.slice(0, 200)}`);
  }
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
