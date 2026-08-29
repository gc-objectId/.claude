const c = require('./client');
const T = {'X-Tenant-Id':'mayo-mayo'};
async function post(path, body){ return c.req('POST', path, body, Object.assign({'X-XSRF-TOKEN':c.xsrf()}, T)); }
async function get(path){ return c.req('GET', path, undefined, T); }
(async()=>{
  await c.login('admin','admin');
  await c.req('GET','/api/csrf',undefined,T);
  const dobLow = new Date(); dobLow.setFullYear(dobLow.getFullYear()-40);
  const p = await post('/api/admin/patients/', {prmnPrefix:'lowrisk', firstName:'Low', lastName:'RiskPt', dob: dobLow.toISOString().slice(0,10), height:'180 cm', weight:'70 kg'});
  console.log('createPatient', p.status, p.body);
  const pat = JSON.parse(p.body);
  const start = new Date(Date.now()+3600*1000);
  const op = await post(`/api/admin/patients/${pat.uuid}/operations/create`, {startTime: start.toISOString(), procedureTypes:[{id:'p-pancreatectomy'}]});
  console.log('createOperation', op.status, op.body.slice(0,800));
})();
