const {Session}=require('./client');
const cases=require('./cases.json');
(async()=>{
  const s=new Session('demo-demo');
  const l=await s.login(process.argv[3],process.argv[4]);
  console.log('login',l.status);
  const c=cases[process.argv[2]||'b'];
  const r=await s.post('/api/admin/events/category-event',{sourceEventType:'ValidationProbe',eventCategories:['INDUCTION_START'],patientId:c.pmrn,caseId:c.op.caseId,date:new Date().toISOString()});
  console.log('event',r.status,r.body.slice(0,120));
})();
