const {req,login}=require('./client');
const T='demo-demo';
(async()=>{
  await login('admin','admin',T);
  const p = await req('POST','/api/admin/patients/',{tenant:T,body:{prmnPrefix:'last2',firstName:'Big',lastName:'Block',weight:'150 kg',height:'175 cm',gender:'MALE'}});
  const pat=JSON.parse(p.body);
  const patch = await req('PATCH','/api/admin/patients/'+encodeURIComponent(pat.pmrn),{tenant:T,body:{gender:'non-binary'}});
  console.log('patch', patch.status, patch.body.slice(0,300));
  const op = await req('POST','/api/admin/patients/'+pat.uuid+'/operations/create',{tenant:T,body:{startTime:new Date(Date.now()-60*60000).toISOString(),procedureTypes:[{id:'p-appendectomy',qualifier:null}]}});
  const o=JSON.parse(op.body);
  require('fs').writeFileSync('case.json', JSON.stringify({pmrn:pat.pmrn,uuid:pat.uuid,caseId:o.caseId}));
  console.log(JSON.stringify({pmrn:pat.pmrn,caseId:o.caseId}));
})();
