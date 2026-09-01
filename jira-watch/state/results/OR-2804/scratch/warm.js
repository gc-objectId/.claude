const {req, auth} = require('./lib.js');
const c = require('./case.json');
(async()=>{
  const H = await auth(process.argv[3], process.argv[4]);
  if (process.argv[2]) {
    const r0 = await req('PATCH','/api/admin/patients/'+encodeURIComponent(c.pmrn)+'/operations/'+c.caseId+'/acuity',{acuity: process.argv[2]==='null'?null:process.argv[2]},H);
    console.log('acuity set ->', JSON.parse(r0.body).acuity);
  }
  const r = await req('POST','/api/cds/app-launch/'+encodeURIComponent(c.pmrn)+'/'+c.caseId, {timeZone:'America/Chicago'}, H);
  console.log('app-launch', r.status, r.body.slice(0,200));
})();
