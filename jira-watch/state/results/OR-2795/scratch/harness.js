const { req, login, setTenant } = require('./client');
const [tenant, command] = process.argv.slice(2);
(async () => {
  setTenant(tenant);
  await login('admin', 'admin');
  const res = await req('POST', `/api/admin/integration-harness/${tenant}/${command}`,
    { body: JSON.stringify({ pmrn: '30001006705' }) });
  console.log('HTTP', res.status);
  try { console.log(JSON.stringify(JSON.parse(res.body), null, 2)); }
  catch (e) { console.log(res.body.slice(0, 1000)); }
})();
