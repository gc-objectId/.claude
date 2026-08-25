const {Session} = require('./client');
const cases = require('./cases.json');
const which = process.argv[2]||'a';
(async()=>{
  const s=new Session('demo-demo');
  await s.login('admin','admin');
  const c=cases[which];
  const r=await s.get(`/api/admin/patients/${c.pmrn}/operations/${c.op.caseId}/antibiotic-candidates`);
  console.log('candidates',which,r.status,r.body);
})();
