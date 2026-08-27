const {request,login}=require('./api');
const cmd = process.argv[2] || 'GET_OBSERVATIONS_LAST_24_HRS';
(async()=>{
  await login('admin','admin');
  const r=await request('POST','/api/admin/integration-harness/mayo-mayo/'+cmd,
    {headers:{'X-Tenant-Id':'mayo-mayo'}, body:{pmrn:'99001122'}});
  console.log(r.status);
  try { console.log(JSON.stringify(JSON.parse(r.body),null,1)); } catch(e){ console.log(r.body); }
})();
