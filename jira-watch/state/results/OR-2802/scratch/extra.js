const { req, login } = require('./cli');
const T = 'demo-demo';
async function mkCase(prefix, procs) {
  const p = JSON.parse((await req('POST', '/api/admin/patients/', { tenant: T, body: { prmnPrefix: prefix } })).body);
  const op = JSON.parse((await req('POST', `/api/admin/patients/${p.uuid}/operations/create`, { tenant: T, body: { startTime: new Date(Date.now()+3600e3).toISOString(), procedureTypes: procs.map(id=>({id,qualifier:null})) } })).body);
  return { pmrn: p.pmrn, caseId: op.caseId };
}
async function probe(label, c) {
  const r = await req('GET', `/api/admin/patients/${c.pmrn}/operations/${c.caseId}/antibiotic-candidates`, { tenant: T });
  const d = JSON.parse(r.body);
  console.log(label, '| caseId', c.caseId, '| outcome:', d.outcome, '| recommended:', JSON.stringify(d.recommended.map(o=>o.medicationCandidates.map(m=>m.medicationCategory))));
  return d;
}
(async () => {
  await login('admin','admin',T);
  const a = await mkCase('cov-opt-mixed', ['p-gastro-uncomplicated','p-arthroscopy-knee']);
  await probe('mixed noProph + knee ', a);
  const b = await mkCase('cov-opt-both', ['p-gastro-uncomplicated','p-gastrostomy-tube-changes']);
  await probe('both noProph        ', b);
  const c = await mkCase('cov-narrow-wide', ['p-appendectomy','p-arthroscopy-knee']);
  await probe('appy(CFZ+MTZ)+knee  ', c);
  require('fs').writeFileSync(__dirname+'/extra-cases.json', JSON.stringify({a,b,c},null,2));
})();
