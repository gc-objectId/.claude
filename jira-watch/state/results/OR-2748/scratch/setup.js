const {req,login}=require('./client');
const T='demo-demo';
(async()=>{
  await login('admin','admin',T);
  const p = await req('POST','/api/admin/patients/',{tenant:T,body:{prmnPrefix:'last',firstName:'Tall',lastName:'Heavy',weight:'200 kg',height:'213 cm',gender:'MALE'}});
  const pat = JSON.parse(p.body);
  const op = await req('POST','/api/admin/patients/'+pat.uuid+'/operations/create',{tenant:T,body:{startTime:new Date(Date.now()-60*60000).toISOString(),procedureTypes:[{id:'p-appendectomy',qualifier:null}]}});
  console.log('op', op.status, op.body.slice(0,400));
  const opDto = JSON.parse(op.body);
  console.log(JSON.stringify({pmrn:pat.pmrn, uuid:pat.uuid, caseId:opDto.caseId}));
  require('fs').writeFileSync('case.json', JSON.stringify({pmrn:pat.pmrn, uuid:pat.uuid, caseId:opDto.caseId}));
})();
