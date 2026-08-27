const { req, login } = require('./client');
(async () => {
  const l = await login('admin', 'admin');
  console.log('login', l.status);
  const me = await req('GET', '/api/user/me');
  console.log('me', me.status, me.body.slice(0, 300));
})();
