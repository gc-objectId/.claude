function msg({ mcid, caseId, pmrn, event, senderId, senderName, anesRows, csn }) {
  const [sf, sg, sm] = senderName;
  const lines = [
    `MSH|^~\\&|EPIC^SIU_SURGICAL|ROSMC|RST|Timing|20260608161953|${senderId}|SIU^S14^SIU_S12|${mcid}|T|2.5.1`,
    `SCH||${caseId}|||||||3900|S|^^^20260608140500|||||||||${senderId}^${sf}^${sg}^${sm}^^^^^PERSONID^^^^PERSONID|||||Unposted^Unposted^SCHEDULING^In Fac^Arrived^PROGRESS`,
    `ZCS|AFTER|N|ORSCH_S14^${event}`,
    `PID|||${pmrn}^^^MC^MC||GUIDEDOR^TEST^${pmrn.slice(-2)}||19700427|M|GUIDEDOR^TEST^${pmrn.slice(-2)}||3275 FLOWER HILL ST^^MINNETONKA^MN^55343^USA^L|||||S||${csn}|||Guided-OR^Jodi|||||||||N`,
    `ZPD`,
    `PD1|||RST MCH SAINT MARYS CAMPUS^^101000|||||||||N|20260608`,
    `PV1||OO|ROMBMAINOR^ROMB OR POOL ROOM^IY^ROSMC^^^^^RST ROMB MAIN OR^^DEPID|Elec||||||BMSO|||||||11728183^CIMA^ROBERT^R^^^^^PERID^^^^PERID||${csn}|||||||||||||||||||||||||||||||1000721798`,
    `OBX|1|TS|CASE_CANCEL_DATE|1`,
    `OBX|2|TS|CASE_END_TIME|2|20260608151000`,
    `OBX|3|TS|CASE_START_TIME|3|20260608140500`,
    `OBX|4|ST|SchedulingStatus|4|Scheduled`,
    `OBX|5|ST|CASE_TYPE|5|1`,
    `OBX|6|TS|CLEANUP_TIME|6|10`,
    `OBX|7|ST|COMBO_CASE_FLAG|7|4693`,
    `OBX|8|ST|OR_ROOM|8|OR 105`,
    `OBX|9|TS|PROJECTED_END_TIME|9|20260608165400`,
    `OBX|10|TS|PROJECTED_START_TIME|10|20260608154900`,
    `OBX|11|TS|SETUP_TIME|11|20`,
    `OBX|12|NM|SURG_CSN|12|${csn}`,
    `OBX|13|DTM|${event}|In|20260608161900`,
    `DG1|1|I10|R10.9^Unspecified abdominal pain^I10|Unspecified abdominal pain||^105;ORC`,
    `RGS|1||1`,
    `AIS|1||4693^EXPLORATORY LAPAROTOMY|20260608142500|1200|S||S|||General^General`,
    `NTE|1||EXPLORATORY LAPAROTOMY|Procedure Comments`,
    `AIL|1||^RM OR 105 ROMB 01 516^^ROMBOR`,
    `AIP|1||12517712^BOUGHEY^JUDY^C^^^^^PERID^^^^PERID|1.1^Primary||20260608142500|1200|S||S`,
    `AIP|2|||4.20^Circulator||20260608140500||S||S`,
    `AIP|3|||4.150^Scrub Person||20260608140500||S||S`,
  ];
  let n = 4;
  for (const r of anesRows) {
    const p = r.personId
      ? `${r.personId}^${r.family}^${r.given}^^^^^^PERID^^^^PERID~10${r.personId}^${r.family}^${r.given}^^^^^^PROVID^^^^PROVID`
      : '';
    lines.push(`AIP|${n}||${p}|${r.role}||20260608140500||S||S`);
    n++;
  }
  return lines.join('\r');
}
module.exports = { msg };
