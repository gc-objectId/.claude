const A = require("./api.js"); const S = require("./scen.js");
(async () => {
  await A.login();
  const marker = process.argv[2];
  const s = { pmrn: "or3069-fake-63ed0c3f-f9f4-4893-adc7-8dc28c9c3934", caseId: "70974" };
  const when = new Date("2026-11-10T17:10:00Z");
  const extra = marker ? { selectedIndication: marker } : {};
  await S.document(s, "01a1c670-37f2-7fed-9e45-a051114b4dd4", 2, "g", when, extra);
  await new Promise(r => setTimeout(r, 2000));
})().catch(e => { console.error("ERR", e); process.exit(1); });
