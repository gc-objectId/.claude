const { request, loadJar } = require('./req');

const TENANT = process.env.TEN || 'mayo-mayo';

async function csrf() {
  await request('GET', '/csrf');
  return loadJar()['XSRF-TOKEN'];
}

async function main() {
  const x = await csrf();
  const H = { 'X-Tenant-Id': TENANT, 'X-XSRF-TOKEN': x };
  const procs = JSON.parse(process.argv[2]);
  const p = await request('POST', '/api/admin/patients/', { prmnPrefix: 'or2776', firstName: 'Whipple', lastName: 'Combo' }, H);
  console.log('PATIENT', p.status, p.body);
  if (p.status !== 200) return;
  const pat = JSON.parse(p.body);
  const start = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace('Z', '');
  const o = await request('POST', `/api/admin/patients/${pat.uuid}/operations/create`, {
    startTime: start,
    procedureTypes: procs,
  }, H);
  console.log('OPERATION', o.status, o.body);
}
main();
