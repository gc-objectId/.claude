const { Client } = require('./client');
const T='demo-demo';
const H={'X-Tenant-Id':T};
const prefix=process.argv[2]||'or2840c';
(async()=>{
  const c=new Client(); await c.login('admin','admin');
  let r=await c.post('/api/admin/patients/',{body:{prmnPrefix:prefix,firstName:'Glu',lastName:'Red',dob:'1955-07-07'},headers:H});
  const p=JSON.parse(r.body); const pmrn=p.pmrn, uuid=p.uuid;
  r=await c.post(`/api/admin/patients/${pmrn}/conditions`,{body:{conditionId:'c-diabetes-mellitus',tags:['DIABETES'],onsetDate:'2020-01-01T00:00:00Z'},headers:H});
  r=await c.post(`/api/admin/patients/${uuid}/operations/create`,{body:{startTime:null,procedureTypes:[{id:'p-appendectomy',qualifier:null}]},headers:H});
  const op=JSON.parse(r.body);
  console.log(JSON.stringify({pmrn,uuid,caseId:op.caseId}));
})();
