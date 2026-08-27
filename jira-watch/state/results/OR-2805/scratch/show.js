const j=JSON.parse(require('fs').readFileSync(process.argv[2]||'sel-out.json'));
const rs=j.dosingFormState.perRouteState.INTRAVENOUS;
console.log('--- doseOptions ---');
(rs.doseOptions||[]).forEach(o=>console.log(JSON.stringify({amt:o.calculatedDoseAmount, pre:o.preroundedDoseAmount, def:o.defaultOption, dose:o.doseAmount, units:o.doseUnits, calc:o.weightBasedDoseCalculation})));
console.log('--- defaultDose ---', JSON.stringify(rs.defaultDose||rs.defaultDoseOption||null));
console.log('--- rule results ---');
(j.results||[]).forEach(r=>{ if((r.ruleIdentifier||'').includes('sugammadex')||JSON.stringify(r).includes('sugammadex')) console.log(JSON.stringify(r).slice(0,1200)); });
