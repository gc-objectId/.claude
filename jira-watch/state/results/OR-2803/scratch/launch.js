const c = require('./client'); const T={'X-Tenant-Id':'mayo-mayo'};
const [pmrn, caseId] = process.argv.slice(2);
(async()=>{
  await c.login('loopuser','LoopValidate1!'); await c.req('GET','/api/csrf',undefined,T);
  const r = await c.req('POST', `/api/cds/app-launch/${pmrn}/${caseId}`, {timeZone:'America/Chicago'}, Object.assign({'X-XSRF-TOKEN':c.xsrf()},T));
  console.log('app-launch', caseId, 'status', r.status, r.status===200 ? 'ok' : r.body.slice(0,600));
})();
