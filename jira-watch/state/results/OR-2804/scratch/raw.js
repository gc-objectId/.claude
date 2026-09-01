const {req, auth} = require('./lib.js');
const c = require('./case.json');
(async()=>{
  const H = await auth();
  const r = await req('GET', '/api/admin/patients/' + encodeURIComponent(c.pmrn) + '/operations/' + c.caseId + '/antibiotic-candidates', null, H);
  console.log(JSON.stringify(JSON.parse(r.body), null, 1));
})();
