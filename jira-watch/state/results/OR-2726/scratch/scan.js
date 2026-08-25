const {Session}=require('./client');
const cases=require('./cases.json');
(async()=>{
  const s=new Session('demo-demo');
  console.log('login',(await s.login(process.argv[3],process.argv[4])).status);
  const c=cases[process.argv[2]||'a'];
  const r=await s.post(`/api/cds/medication-selection/${c.pmrn}/${c.op.caseId}`,{medicationIdentifier:'m-cefazolin',timeZone:'America/New_York',isReselection:false});
  console.log('scan',r.status,r.body.slice(0,200));
})();
