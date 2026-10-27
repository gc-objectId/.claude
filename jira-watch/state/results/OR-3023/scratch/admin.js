const http = require('http');
const port = 64811;
const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); }
function call(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
    const h = { 'Cookie': cookieHeader(), 'Content-Length': Buffer.byteLength(payload), ...headers };
    if (jar['XSRF-TOKEN']) h['X-XSRF-TOKEN'] = jar['XSRF-TOKEN'];
    const req = http.request({ host: 'localhost', port, path, method, headers: h }, res => {
      (res.headers['set-cookie'] || []).forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1); });
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject); req.end(payload);
  });
}
(async () => {
  const [,, action, ...args] = process.argv;
  await call('GET', '/csrf');
  const login = await call('POST', '/api/login/basic', 'username=admin&password=admin', { 'Content-Type': 'application/x-www-form-urlencoded' });
  console.log('login', login.status);
  await call('GET', '/csrf');
  const tenant = { 'X-Tenant-Id': 'demo-demo', 'Content-Type': 'application/json' };
  if (action === 'create-patient') {
    const r = await call('POST', '/api/admin/patients/', { prmnPrefix: 'or3023', firstName: 'Loop', lastName: 'Validate' }, tenant);
    console.log(r.status, r.body);
  } else if (action === 'send-notification' || action === 'generate-notification') {
    const [pmrn, clientMedicationId] = args;
    const r = await call('POST', `/api/simulation/medication-administration/${action}`, {
      username: 'INTERFACE', clientMedicationId, pmrn, encounterCSN: 'CSN-OR3023', medicationOrderId: 'ORD-OR3023',
      administrationDate: new Date().toISOString(), notificationType: 'GIVEN', isEdit: false,
    }, tenant);
    console.log(action, r.status, r.body.slice(0, 400).replace(/\n/g, ' '));
  } else if (action === 'get') {
    const r = await call('GET', args[0], null, tenant);
    console.log(r.status, r.body.slice(0, 600));
  }
})();
