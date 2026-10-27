const fs = require("fs");
const { login, sendHl7 } = require("./http");
const [,, pmrn, stamp, ctrl, seq = "3", orderId = "2222006473532"] = process.argv;
const raw = fs.readFileSync("/Users/ryanducharme/dev/worktrees/OR-3027-compliance-lookup-with-a/mayo-client-integration/src/test/resources/hl7/rormc-ras-acetaminophen.hl7", "utf8")
  .replace(/\r?\n/g, "\r").replace(/\r+$/, "")
  .replace("11282019", pmrn).replace("|78665|", `|${ctrl}|`)
  .replace(/20260512143800/g, stamp).replace(/20260512143853/g, stamp)
  .replace("RXA|0|3|", `RXA|0|${seq}|`).replace("2222006473532", orderId);
fs.writeFileSync(`payload-${ctrl}.hl7`, raw);
(async () => {
  await login();
  const r = await sendHl7(raw);
  console.log("send", r.status, r.body.slice(0, 400));
})().catch(e => console.log("ERR", e));
