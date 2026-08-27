const { request, loadJar } = require('./req');
async function main() {
  const [pmrn, caseId, allergen, reaction] = process.argv.slice(2);
  await request('GET', '/csrf');
  const x = loadJar()['XSRF-TOKEN'];
  const q = `caseId=${caseId}&type=ALLERGEN&identifier=${encodeURIComponent(allergen)}&reaction=${encodeURIComponent(reaction)}`;
  const r = await request('POST', `/api/admin/patients/${pmrn}/allergies?${q}`, '', { 'X-Tenant-Id': 'mayo-mayo', 'X-XSRF-TOKEN': x, 'Content-Type': 'application/json' });
  console.log('ALLERGY', r.status, r.body.slice(0, 300));
}
main();
