const { Client } = require('./api');
(async () => {
  const c = new Client();
  const r = await c.get('/csrf');
  console.log('csrf', r.status, r.body.slice(0,300));
  console.log('cookies', c.jar);
})();
