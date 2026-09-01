const {req,login,csrf} = require('./http.js');
const T = {'X-Tenant-Id':'mayo-mayo'};
(async()=>{
  await login('admin','admin');
  let tok = await csrf();
  const H = Object.assign({'X-XSRF-TOKEN':tok}, T);
  let r = await req('POST','/api/admin/patients/',{prmnPrefix:'or2804', firstName:'Acu', lastName:'Test', weight:'70 kg', height:'170 cm'}, H);
  console.log('createPatient', r.status, r.body);
  const p = JSON.parse(r.body);
  r = await req('POST',`/api/admin/patients/${p.uuid}/operations/create`, {startTime: new Date(Date.now()+3600e3).toISOString(), procedureTypes:[{id:'p-cesarean-delivery', qualifier:null}]}, H);
  console.log('createOp', r.status, r.body.slice(0,800));
})();
