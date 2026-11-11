const c = require("./client");
const fs = require("fs");
// usage: node mgb.js <caseId(ORL id)> <eventId 60=InRoom 70=AnesStart 80=ProcStart> <"Event Name"> <ISO instant e.g. 2026-11-10T15:00:00Z> [hospital=DEMO]
const [caseId, eventId, eventName, instant, hospital = "DEMO"] = process.argv.slice(2);
let xml = fs.readFileSync(__dirname + "/mgb-template.xml", "utf8");
const rep = (id, val) => { xml = xml.replace(new RegExp(`(<ID>${id}</ID>\\s*<IDType>External</IDType>\\s*<DisplayName>)[^<]*`), `$1${val}`); };
rep("OR_EVENT_ID", eventId); rep("OR_EVENT_NAME", eventName); rep("OR_NEW_INSTANT", instant);
rep("HOSPITAL", hospital); rep("OR_HOSPITAL", hospital); rep("LOCATION_NAME", "DEMO OR 1"); rep("OR_LOCATION_NAME", "DEMO OR 1");
rep("PHS_TIME_STAMP", "2026-Nov-10@10:00:00");
xml = xml.replace(/<TimeGenerated>[^<]*/, `<TimeGenerated>${instant}`);
xml = xml.replace(/(<PrimaryEntity>\s*<Type>ORL<\/Type>\s*<ID>)[^<]*/, `$1${caseId}`);
(async () => {
  const r = await c.request("POST", "/api/integration/mgb/event", { body: xml, form: true, headers: { "Content-Type": "application/xml" } });
  console.log(r.status, r.body.slice(0, 200));
})();
