const {req, auth} = require('./lib.js');
(async()=>{
  const H = await auth();
  let r = await req('POST','/api/admin/patients/',{prmnPrefix:'or2804', firstName:'Acu', lastName:'Test', weight:'70 kg', height:'170 cm'}, H);
  const p = JSON.parse(r.body);
  console.log('patient', p.pmrn, p.uuid);
  r = await req('POST','/api/admin/patients/' + p.uuid + '/operations/create', {startTime: new Date(Date.now()+3600e3).toISOString(), procedureTypes:[{id:'p-cesarean-delivery', qualifier:null}]}, H);
  console.log('createOp', r.status, r.body.slice(0,600));
  const op = JSON.parse(r.body);
  require('fs').writeFileSync('case.json', JSON.stringify({pmrn:p.pmrn, uuid:p.uuid, caseId: op.caseId}, null, 2));
})();
