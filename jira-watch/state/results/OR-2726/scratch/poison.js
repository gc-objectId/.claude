const {cli}=require('./redis');
const K='antibiotic-resolution-v2/tenant:demo-demo/op:01a0353f-87fe-75a9-ba56-0ca9cca127ca';
const F='01a0353c-8588-77f4-b051-bde6784a551a';
const mode=process.argv[2];
const raw=cli(['HGET',K,F]).replace(/\n$/,'');
const inner=JSON.parse(raw);
const res=JSON.parse(inner);
if(mode==='hit'){
  res.preferred=[res.protocol.procedureProtocols[0].candidates[2]];
} else if(mode==='precondition'){
  res.protocol.agreed=false;
} else { throw new Error('mode?'); }
const out=JSON.stringify(JSON.stringify(res));
cli(['-x','HSET',K,F], out);
cli(['EXPIRE',K,'86400']);
console.log('wrote',mode,'preferred step=',res.preferred.map(p=>p.stepNumber),'agreed=',res.protocol.agreed);
