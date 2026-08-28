const { Client } = require('./api');
(async () => {
  for (const [u,p] of [['admin','admin'],['loopuser','LoopValidate1!']]) {
    const c = new Client('mayo-mayo');
    const l = await c.login(u,p);
    const me = await c.get('/api/user');
    console.log(u, 'login', l.status, '/api/user', me.status, me.body.slice(0,400));
    const g = await c.get('/api/admin/patients/');
    console.log(u, 'admin GET', g.status, g.body.slice(0,200));
  }
})();
