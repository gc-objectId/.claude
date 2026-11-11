const c = require("./client");
// usage: node siu.js <caseId> <pmrn> <"Event Name"> <yyyyMMddHHmmss> [ctrlId]
const [caseId, pmrn, eventName, ts, ctrl] = process.argv.slice(2);
const mshTs = ts; const ctrlId = ctrl || String(Date.now()).slice(-8);
const segs = [
`MSH|^~\\&|EPIC^SIU_SURGICAL|ROSMC|RST|Timing|${mshTs}|1455|SIU^S14^SIU_S12|${ctrlId}|T|2.5.1`,
`SCH||${caseId}|||||||3900|S|^^^20261110110500|||||||||1455^MAYO OPTIME^PERIOP^NURSE^^^^^PERSONID^^^^PERSONID|||||Unposted^Unposted^SCHEDULING^Proc^Procedure^PROGRESS`,
`ZCS|AFTER|N|ORSCH_S14^${eventName}`,
`PID|||${pmrn}^^^MC^MC||GUIDED-OR^LOOP^TEST||19660427|M|GUIDEDOR^LOOP^TEST||319 GUADALUPE CT^^JORDAN^MN^55352^USA^L||(555)887-3564^P^M^^^555^8873564|||||2000002730437||||||||||||N`,
`ZPD`,
`PD1|||RST MCH SAINT MARYS CAMPUS^^101000|||||||||N|20261110`,
`PV1||OO|ROMBMAINOR^ROMB OR POOL ROOM^BO^ROSMC^^^^^RST ROMB MAIN OR^^DEPID|Elec||||||OES|||||||11728183^CIMA^ROBERT^R^^^^^PERID^^^^PERID||2000002730437|||||||||||||||||||||||||||||||1000721822`,
`OBX|1|TS|CASE_END_TIME|2|20261110121000`,
`OBX|2|TS|CASE_START_TIME|3|20261110110500`,
`OBX|3|ST|OR_ROOM|8|OR 201`,
`OBX|4|DTM|${eventName}|In|${ts}`,
`RGS|1||1`,
`AIS|1||4693^EXPLORATORY LAPAROTOMY|20261110112500|1200|S||S|||General^General`,
`AIL|1||^RM OR 201 ROMB 01 515^^ROMBOR`,
`AIP|1||12956732^WASIF^NABIL^^^^^^PERID^^^^PERID|1.1^Primary||20261110112500|1200|S||S`,
`AIP|4|||2.10^Anesthesiologist||20261110110500||S||S`,
];
(async () => {
  await c.login();
  const r = await c.sendHl7("mayo-mayo", segs.join("\r"));
  console.log(r.status, r.body.slice(0, 400));
})();
