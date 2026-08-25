const fs = require('fs');
const { req, login } = require('./api.js');
(async () => {
  const tenant = 'mayo-mayo';
  console.error('login', (await login('admin', 'admin', tenant)).status);
  const raw = fs.readFileSync(process.argv[2], 'utf8');
  const r = await req('POST', '/api/admin/hl7-inbound-messages/send', { rawMessage: raw }, { 'X-Tenant-Id': tenant });
  console.log(r.status, r.body.slice(0, 500));
})().catch(e => { console.error(e); process.exit(1); });
