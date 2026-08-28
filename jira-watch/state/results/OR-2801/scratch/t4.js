const { Client } = require('./api');
(async () => {
  const c = new Client('mayo-mayo');
  await c.login('admin','admin');
  console.log('cookie XSRF', c.jar['XSRF-TOKEN']);
  console.log('body token', c.csrfBody);
  // try body token
  c.useBodyToken = true;
  let r = await c.post('/api/admin/patients/', {prmnPrefix:'x'});
  console.log('with body token', r.status, r.body.slice(0,150));
  // try cookie token
  c.useBodyToken = false;
  r = await c.post('/api/admin/patients/', {prmnPrefix:'x'});
  console.log('with cookie token', r.status, r.body.slice(0,150));
})();
