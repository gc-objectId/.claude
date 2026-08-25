const {Session} = require('./client');
const cases = require('./cases.json');
const which = process.argv[2] || 'b';
const cat = process.argv[3] || 'INDUCTION_START';
(async () => {
  const s = new Session('demo-demo');
  await s.login('admin','admin');
  const c = cases[which];
  const r = await s.post('/api/admin/events/category-event', {
    sourceEventType: 'ValidationProbe',
    eventCategories: [cat],
    patientId: c.pmrn,
    caseId: c.op.caseId,
    date: new Date().toISOString()
  });
  console.log('event', which, cat, r.status, r.body.slice(0,200));
})();
