const {Session}=require('./client');
const cases=require('./cases.json');
(async()=>{
  const s=new Session('demo-demo');
  await s.login('admin','admin');
  const c=cases[process.argv[2]||'a'];
  const r=await s.patch(`/api/admin/patients/${c.pmrn}/operations/${c.op.caseId}/classification`,{classification:process.argv[3]||'ELECTIVE'});
  console.log('patch',r.status,r.body.slice(0,120));
})();
