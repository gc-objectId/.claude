const {Session} = require('./client');
(async () => {
  const s = new Session('demo-demo');
  console.log('login', (await s.login('admin','admin')).status);
  const mk = async (prefix, procId) => {
    const p = await s.post('/api/admin/patients/', {prmnPrefix: prefix, firstName:'Cache', lastName:'Test', weight:'80 kg', height:'175 cm'});
    const pj = JSON.parse(p.body);
    const op = await s.post(`/api/admin/patients/${pj.uuid}/operations/create`, {
      startTime: new Date(Date.now()+3600000).toISOString(),
      procedureTypes: [{id: procId, qualifier: null}]
    });
    console.log(prefix, p.status, op.status, op.body.slice(0,400));
    return {pmrn: pj.pmrn, uuid: pj.uuid, op: JSON.parse(op.body)};
  };
  const a = await mk('CACHEA', 'p-appendectomy');
  const b = await mk('CACHEB', 'p-hernia-repair');
  require('fs').writeFileSync('cases.json', JSON.stringify({a,b},null,2));
})();
