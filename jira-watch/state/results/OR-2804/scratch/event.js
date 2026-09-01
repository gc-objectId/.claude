const {req, auth} = require('./lib.js');
const c = require('./case.json');
(async()=>{
  const H = await auth();
  const r = await req('POST','/api/admin/events/category-event', {
    sourceEventType:'MANUAL', eventCategories:[process.argv[2] || 'INDUCTION_START'],
    patientId: c.pmrn, caseId: c.caseId, date: new Date().toISOString()
  }, H);
  console.log('event', r.status, r.body.slice(0,200));
})();
