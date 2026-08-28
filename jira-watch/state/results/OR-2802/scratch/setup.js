const { req, login } = require('./cli');
const T = 'demo-demo';
async function mkCase(prefix, procs) {
  const p = await req('POST', '/api/admin/patients/', { tenant: T, body: { prmnPrefix: prefix, firstName: 'Cov', lastName: prefix } });
  const pat = JSON.parse(p.body);
  const op = await req('POST', `/api/admin/patients/${pat.uuid}/operations/create`, {
    tenant: T,
    body: { startTime: new Date(Date.now() + 3600e3).toISOString(), procedureTypes: procs.map(id => ({ id, qualifier: null })) }
  });
  return { pmrn: pat.pmrn, uuid: pat.uuid, op: op.status === 200 ? JSON.parse(op.body) : op.body };
}
(async () => {
  await login('admin', 'admin', T);
  const positive = await mkCase('cov-pos', ['p-colorectal', 'p-arthroscopy-knee']);
  const negative = await mkCase('cov-neg', ['p-arthroscopy-knee', 'p-eus-fna-cystic-lesion']);
  console.log(JSON.stringify({ positive: { pmrn: positive.pmrn, caseId: positive.op.caseId, procs: positive.op.procedureTypes } , negative: { pmrn: negative.pmrn, caseId: negative.op.caseId } }, null, 2));
  require('fs').writeFileSync(__dirname + '/cases.json', JSON.stringify({ positive: { pmrn: positive.pmrn, caseId: positive.op.caseId, opId: positive.op.id }, negative: { pmrn: negative.pmrn, caseId: negative.op.caseId, opId: negative.op.id } }, null, 2));
})();
