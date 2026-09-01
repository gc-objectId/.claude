const {req, auth} = require('./lib.js');
const c = require('./case.json');
function msg(acuity) {
  return [
    'MSH|^~\\&|EPIC^SIU_SURGICAL_UDP|RORMC|RST|OR_CASE_FILE|20260831120000|IDMPROD30410088|SIU^S14^SIU_S12|OR2804' + Date.now() + '|P|2.5.1',
    'SCH||' + c.caseId + '|||||||3420|S|^^^20260901070000|||||||||30410088^SILBERNICK^ZACHARY^THOMAS^^^^^PERSONID^^^^PERSONID|||||Sch^Scheduled^SCHEDULING^In Fac^Arrived^PROGRESS',
    'ZCS|BEFORE|N|ORSCH_S14',
    'PID|1||' + c.pmrn + '^^^MC^MC||TEST^ACU||19900101|F||C|30 BIRCH^^ROCHESTER^MN^55901^USA^L',
    'PV1||OS|ROEIMAINOR^ROEI OR POOL ROOM^ROEIORP-CY^RORMC^^^^^RST ROEI MAIN OR^^DEPID|' + acuity + '||||||CRS',
    'OBX|1|ST|SchedulingStatus|4|Scheduled||||||F',
    'RGS|1||1',
    'AIL|1||^RM OR 49 ROEI 01 303^^ROEIOR'
  ].join('\r') + '\r';
}
(async()=>{
  const H = await auth();
  const raw = msg(process.argv[2]);
  const r = await req('POST','/api/admin/hl7-inbound-messages/send', {rawMessage: raw}, H);
  console.log('send', r.status, r.body.slice(0,400).replace(/\r/g,' | '));
})();
