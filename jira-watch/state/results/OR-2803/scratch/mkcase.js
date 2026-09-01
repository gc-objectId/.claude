const c = require('./client');
const T = {'X-Tenant-Id':'mayo-mayo'};
const [label, ageStr] = process.argv.slice(2);
const age = parseInt(ageStr, 10);
(async()=>{
  await c.login('admin','admin');
  await c.req('GET','/api/csrf',undefined,T);
  const post = (p,b)=>c.req('POST',p,b,Object.assign({'X-XSRF-TOKEN':c.xsrf()},T));
  const dob = new Date(); dob.setFullYear(dob.getFullYear()-age);
  const p = await post('/api/admin/patients/', {prmnPrefix:label, firstName:label, lastName:'Pancreas', dob: dob.toISOString().slice(0,10), height:'180 cm', weight:'80 kg'});
  if (p.status!==200) { console.log('createPatient FAILED', p.status, p.body.slice(0,500)); return; }
  const pat = JSON.parse(p.body);
  const op = await post(`/api/admin/patients/${pat.uuid}/operations/create`, {startTime: new Date().toISOString(), procedureTypes:[{id:'p-pancreatectomy'}]});
  if (op.status!==200) { console.log('createOperation FAILED', op.status, op.body.slice(0,500)); return; }
  const o = JSON.parse(op.body);
  console.log(JSON.stringify({label, age, pmrn: pat.pmrn, patientUuid: pat.uuid, caseId: o.caseId, operationId: o.operationId}));
})();
