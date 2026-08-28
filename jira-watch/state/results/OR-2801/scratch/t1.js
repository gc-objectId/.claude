const { Client } = require('./api');
(async () => {
  const c = new Client();
  const r = await c.login('admin', 'admin');
  console.log('login', r.status, r.body.slice(0, 300));
  const t = await c.get('/api/tenants');
  console.log('tenants', t.status, t.body.slice(0, 800));
})();
