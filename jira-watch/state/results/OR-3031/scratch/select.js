const { Session } = require("./client");
const fs = require("fs");
const T = { "X-Tenant-Id": "demo-demo" };
const c = JSON.parse(fs.readFileSync(__dirname + "/case.json"));
const label = process.argv[2] || "select";
function summarize(body) {
  const out = [];
  const walk = (o, path) => {
    if (o && typeof o === "object") {
      if (typeof o.ruleIdentifier === "string" || typeof o.ruleId === "string") out.push(o);
      for (const k of Object.keys(o)) walk(o[k], path + "." + k);
    }
  };
  walk(body, "");
  return out;
}
(async () => {
  const u = new Session();
  console.log("user login", await u.login("loopuser", "LoopValidate1!"));
  let r = await u.req("POST", "/api/app-launch", { headers: T, body: { patientId: c.pmrn, caseId: c.caseId } });
  console.log("app-launch", r.status, r.body.slice(0, 150));
  r = await u.req("POST", `/api/cds/medication-selection/${c.pmrn}/${c.caseId}`, { headers: T, body: { medicationIdentifier: "m-bupivacaine", timeZone: "America/New_York" } });
  console.log("selection", r.status);
  fs.writeFileSync(`${__dirname}/selection-${label}.json`, r.body);
  const body = JSON.parse(r.body);
  const rules = summarize(body);
  for (const x of rules) console.log("RULE", x.ruleIdentifier || x.ruleId, JSON.stringify(x).slice(0, 1500));
  const flat = r.body;
  console.log("contains ', adjusted for:' =", flat.includes(", adjusted for:") || flat.includes(",</b> adjusted for:"));
  console.log("contains '. Adjust for:' =", flat.includes(".</b> Adjust for:"));
})().catch((e) => { console.error(e); process.exit(1); });
