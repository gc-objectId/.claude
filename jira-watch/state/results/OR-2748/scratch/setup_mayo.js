const {req,login}=require('./client');
const T='mayo-mayo';
(async()=>{
  await login('admin','admin',T);
  const p = await req('POST','/api/admin/patients/',{tenant:T,body:{prmnPrefix:'last',firstName:'Tall',lastName:'Heavy',weight:'120 kg',height:'198 cm',gender:'MALE'}});
  console.log('patient', p.status, p.body.slice(0,300));
  if (p.status!==200) return;
  const pat=JSON.parse(p.body);
  const pts = await req('GET','/api/admin/procedure-types',{tenant:T});
  const op = await req('POST','/api/admin/patients/'+pat.uuid+'/operations/create',{tenant:T,body:{startTime:new Date(Date.now()-60*60000).toISOString(),procedureTypes:[]}});
  console.log('op', op.status, op.body.slice(0,300));
  if(op.status!==200) return;
  const o=JSON.parse(op.body);
  require('fs').writeFileSync('case_mayo.json', JSON.stringify({pmrn:pat.pmrn,uuid:pat.uuid,caseId:o.caseId}));
  console.log(JSON.stringify({pmrn:pat.pmrn,caseId:o.caseId}));
})();
