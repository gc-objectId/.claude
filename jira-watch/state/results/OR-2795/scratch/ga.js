const { req, login, setTenant } = require('./client');
(async () => {
  setTenant('demo-demo');
  await login('admin', 'admin');
  const res = await req('GET', '/api/admin/patients/PMRN-GA-1/insulin-daily-dose');
  console.log('HTTP', res.status);
  console.log(res.body.slice(0, 600));
})();
