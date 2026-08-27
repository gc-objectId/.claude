const {req, login} = require('./client');
const T = {'X-Tenant-Id': 'mayo-mayo'};

// HL7 wall-clock stamps parse as America/Chicago (UTC-5 in August).
function hl7(instantIso) {
  const d = new Date(new Date(instantIso).getTime() - 5*3600*1000);
  const p = n => String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

function build({pmrn, orderId, seq, ts, amount, units='mL', erx='1222',
                name='BUPIVACAINE (PF) 0.25 % (2.5 MG/ML) INJECTION SOLUTION', route='nerv'}) {
  const t = hl7(ts);
  return [
    `MSH|^~\\&|EPIC^RAS_GENERIC|RORMC|RST||${t}|1395|RAS^O17|${Math.floor(Math.random()*900000+100000)}|P|2.5.1`,
    `PID|||${pmrn}^^^MC^MC||LAST^VALIDATE^A||19600401|F`,
    `PV1||IP|ROEI93^REI9302^302-P^RORMC^^^^^RST ROEI 09 3^^DEPID`,
    `ORC|RE|${orderId}^EPC|||||||${t}|`,
    `RXA|0|${seq}|${t}||${erx}^${name}^ERX|${amount}|${units}|||15573354^STERRETT^FAHREN^E^^^^^PERID^^^^PERID|ROEI93||||||||||Given||${t}`,
    `RXR|${route}^route`,
  ].join('\r');
}

async function send(msg) {
  await login();
  const r = await req('POST', '/api/admin/hl7-inbound-messages/send', {rawMessage: msg}, T);
  return r;
}

module.exports = {build, send, hl7};

if (require.main === module) {
  const cfg = JSON.parse(process.argv[2]);
  const msg = build(cfg);
  console.log(msg.replace(/\r/g, '\n'));
  send(msg).then(r => console.log('SEND', r.status, r.body.slice(0,300)));
}
