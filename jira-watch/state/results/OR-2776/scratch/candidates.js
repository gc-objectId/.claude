const { request } = require('./req');

const TENANT = process.env.TEN || 'mayo-mayo';

async function main() {
  const pmrn = process.argv[2];
  const caseId = process.argv[3];
  const r = await request('GET', `/api/admin/patients/${pmrn}/operations/${caseId}/antibiotic-candidates`, null, { 'X-Tenant-Id': TENANT });
  if (r.status !== 200) { console.log('STATUS', r.status, r.body.slice(0, 300)); return; }
  const d = JSON.parse(r.body);
  const rec = (d.recommended || []).map(o => `step${o.stepNumber}:` + o.medicationCandidates.map(m => m.medicationCategory).join('+')).join(' | ');
  const procs = (d.procedures || []).map(p => `${p.procedure.procedureId}[${(p.pathways || []).map(w => w.notation + (w.appliesToCase ? '' : '(scoped-out)')).join(' ; ') || 'none'}]`).join('  ');
  console.log('outcome=' + d.outcome);
  console.log('recommended=' + (rec || '(none)'));
  console.log('contraindicated=' + JSON.stringify(d.contraindicated));
  console.log('configured=' + procs);
}
main();
