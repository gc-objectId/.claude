const {req, login} = require('./api');
const T = {'X-Tenant-Id':'mayo-mayo'};
const CR = '\r';
function msg({mrn, csn, caseNum, acuity, withAis, ctrl}) {
  const segs = [
`MSH|^~\\&|EPIC^SIU_SURGICAL_UDP|RORMC|RST|OR_CASE_FILE|20260828120000|IDMPROD30410088|SIU^S14^SIU_S12|${ctrl}|P|2.5.1`,
`SCH||${caseNum}|||||||3420|S|^^^20260901070000|||||||||30410088^SILBERNICK^ZACHARY^THOMAS^^^^^PERSONID^^^^PERSONID|||||Sch^Scheduled^SCHEDULING^In Fac^Arrived^PROGRESS`,
`ZCS|BEFORE|N|ORSCH_S14`,
`PID|1||${mrn}^^^MC^MC||ACUITYHL7^TESTPATIENT||19900101|F||C|30 BIRCH^^ROCHESTER^MN^55901^USA^L||(507)789-7896^P^H^^^507^7897896||ENG|S||${csn}||||N||||||USA||N`,
`PV1||OS|ROEIMAINOR^ROEI OR POOL ROOM^ROEIORP-CY^RORMC^^^^^RST ROEI MAIN OR^^DEPID|${acuity}||||12956732^WASIF^NABIL^^^^^^PERID^^^^PERID~1002274^WASIF^NABIL^^^^^^PROVID^^^^PROVID~1922215383^WASIF^NABIL^^^^^^NPI^^^^NPI||CRS|||||||15378748^PALRAJ^RAJ^^^^^^PERID^^^^PERID~1004924^PALRAJ^RAJ^^^^^^PROVID^^^^PROVID~1225203201^PALRAJ^RAJ^^^^^^NPI^^^^NPI||${csn}|||||||||||||||||||||||||||||||1000442005`,
`OBX|1|TS|CASE_END_TIME|2|20260901075700||||||F`,
`OBX|2|TS|CASE_START_TIME|3|20260901070000||||||F`,
`OBX|3|ST|SchedulingStatus|4|Scheduled||||||F`,
`OBX|4|ST|OR_ROOM|8|OR 49||||||F`,
`OBX|5|NM|SURG_CSN|12|${csn}||||||F|||20260901`,
`RGS|1||1`,
  ];
  if (withAis) {
    segs.push(`AIS|1||1758^CESAREAN SECTION|20260901071500|900|S|1680|S|||General^General|N/A^N/A`);
    segs.push(`NTE|1||CESAREAN SECTION|Procedure Description`);
  }
  segs.push(`AIL|1||^RM OR 49 ROEI 01 303^^ROEIOR`);
  segs.push(`AIP|1||30340275^KHAN^SIDRAH^^^^^^PERID^^^^PERID~1793712^KHAN^SIDRAH^^^^^^PROVID^^^^PROVID~1598111080^KHAN^SIDRAH^^^^^^NPI^^^^NPI|1.1^Primary|CRS|20260901071500|900|S|1920|S`);
  return segs.join(CR) + CR;
}
async function send(opts) {
  const r = await req('POST','/api/admin/hl7-inbound-messages/send', {rawMessage: msg(opts)}, T);
  return r;
}
module.exports = { send, msg };
if (require.main === module) {
  (async()=>{
    await login('admin','admin');
    const args = JSON.parse(process.argv[2]);
    const r = await send(args);
    console.log(r.status, r.body.replace(/\r/g,' | ').slice(0,400));
  })();
}
