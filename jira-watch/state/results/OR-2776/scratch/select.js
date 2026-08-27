const { request, loadJar } = require('./req');

const TENANT = process.env.TEN || 'mayo-mayo';

async function main() {
  const pmrn = process.argv[2];
  const caseId = process.argv[3];
  const med = process.argv[4];
  await request('GET', '/csrf');
  const x = loadJar()['XSRF-TOKEN'];
  const r = await request('POST', `/api/cds/medication-selection/${pmrn}/${caseId}`, {
    medicationIdentifier: med,
    timeZone: 'America/Chicago',
  }, { 'X-Tenant-Id': TENANT, 'X-XSRF-TOKEN': x });
  if (r.status !== 200) { console.log('STATUS', r.status, r.body.slice(0, 600)); return; }
  const d = JSON.parse(r.body);
  const alerts = (d.evaluationResults || d.results || []);
  console.log('keys=' + Object.keys(d).join(','));
  const list = Array.isArray(alerts) ? alerts : [];
  for (const a of list) {
    console.log('---');
    console.log('rule=' + (a.ruleIdentifier || a.ruleId));
    console.log('needsAction=' + a.needsAction);
    if (a.prompt) {
      console.log('title=' + a.prompt.title);
      console.log('desc=' + JSON.stringify(a.prompt.description));
      console.log('accept=' + a.prompt.acceptText + ' reject=' + a.prompt.rejectText);
    }
  }
  if (!list.length) console.log(JSON.stringify(d).slice(0, 1500));
}
main();
