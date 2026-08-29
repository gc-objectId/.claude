const {req, login} = require('./api');
const T = {'X-Tenant-Id':'mayo-mayo'};
async function makeCase(label, acuity) {
  const p = JSON.parse((await req('POST','/api/admin/patients/',{prmnPrefix:'ACU'+label,firstName:'Acuity',lastName:label},T)).body);
  const op = await req('POST',`/api/admin/patients/${p.uuid}/operations/create`,
    {startTime:new Date(Date.now()+3600e3).toISOString(), procedureTypes:[{id:'p-cesarean-delivery'}]}, T);
  const o = JSON.parse(op.body);
  if (acuity) {
    const a = await req('PATCH',`/api/admin/patients/${p.pmrn}/operations/${o.caseId}/acuity`,{acuity}, T);
    console.log(label,'acuity patch', a.status, JSON.parse(a.body).acuity);
  }
  console.log(label, 'pmrn', p.pmrn, 'caseId', o.caseId, 'procs', JSON.stringify(o.procedureTypes||o.procedures||null).slice(0,200));
  return {label, pmrn:p.pmrn, caseId:o.caseId};
}
(async()=>{
  await login('admin','admin');
  const cases = [];
  cases.push(await makeCase('ELECTIVE','ELECTIVE'));
  cases.push(await makeCase('URGENT','URGENT'));
  cases.push(await makeCase('NOACUITY',null));
  cases.push(await makeCase('NONURGENT','NON_URGENT'));
  require('fs').writeFileSync(__dirname+'/cases.json', JSON.stringify(cases,null,2));
})();
