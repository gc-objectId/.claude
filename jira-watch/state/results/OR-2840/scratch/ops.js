const { Client } = require('./client');
const T='demo-demo';
const H={'X-Tenant-Id':T};
const [cmd, pmrn, caseId, arg] = process.argv.slice(2);
(async()=>{
  const c=new Client(); await c.login('admin','admin');
  if (cmd==='glucose') {
    const r=await c.post(`/api/admin/observations/patient/${pmrn}/case/${caseId}`,{body:{type:'GLUCOSE',value:'180',units:'mg/dL',date:arg},headers:H});
    console.log('addGlucose',r.status,r.body);
  } else if (cmd==='delglucose') {
    const r=await c.del(`/api/admin/observations/patient/${pmrn}`,{headers:H});
    console.log('deleteAllObs',r.status,r.body);
  } else if (cmd==='listobs') {
    const r=await c.get(`/api/admin/observations/patient/${pmrn}/`,{headers:H});
    console.log('obs',r.status,r.body);
  } else if (cmd==='stop') {
    const r=await c.post('/api/admin/events/category-event',{body:{sourceEventType:'or2840-validate',eventCategories:['CLOSE_APP'],patientId:pmrn,caseId:caseId,date:arg||new Date().toISOString()},headers:H});
    console.log('close-app',r.status,r.body);
  } else if (cmd==='startmon') {
    const r=await c.post('/api/admin/events/category-event',{body:{sourceEventType:'or2840-validate',eventCategories:['START_MONITORING'],patientId:pmrn,caseId:caseId,date:arg||new Date().toISOString()},headers:H});
    console.log('start-monitoring',r.status,r.body);
  }
})();
