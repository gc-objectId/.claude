const { Client } = require('./client');
const T='demo-demo';
const pmrn=process.argv[2], caseId=process.argv[3];
(async()=>{
  const c=new Client(); await c.login('admin','admin');
  const H={'X-Tenant-Id':T};
  const r=await c.post('/api/admin/events/category-event',{body:{sourceEventType:'or2840-validate',eventCategories:['START_MONITORING'],patientId:pmrn,caseId:caseId,date:new Date().toISOString()},headers:H});
  console.log('start-monitoring',r.status,r.body);
})();
