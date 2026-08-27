const { Client } = require('./client');
const T='demo-demo';
(async()=>{
  const c=new Client(); await c.login('admin','admin');
  const H={'X-Tenant-Id':T};
  let r=await c.post('/api/admin/patients/',{body:{prmnPrefix:'or2840b',firstName:'Glu',lastName:'Window',dob:'1958-03-03'},headers:H});
  const p=JSON.parse(r.body); const pmrn=p.pmrn, uuid=p.uuid;
  console.log('pmrn',pmrn,'uuid',uuid);
  r=await c.post(`/api/admin/patients/${pmrn}/conditions`,{body:{conditionId:'c-diabetes-mellitus',tags:['DIABETES'],onsetDate:'2020-01-01T00:00:00Z'},headers:H});
  console.log('condition',r.status);
  r=await c.post(`/api/admin/patients/${uuid}/operations/create`,{body:{startTime:null,procedureTypes:[{id:'p-appendectomy',qualifier:null}]},headers:H});
  console.log('operation',r.status);
  const op=JSON.parse(r.body);
  console.log('CASEID',op.caseId,'status startTime',op.startTime);
})();
