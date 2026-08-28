const fs = require('fs');
const path = require('path');
const OID = 'urn:oid:1.2.840.114350.1.13.451.3.7.2.768282';
const LOINC = 'http://loinc.org';
const EFF = '2026-08-20T10:00:00-05:00';

function obs(id, system, code, display, value, status = 'final', extra = {}) {
  const codings = [{ system, code, display }];
  if (system !== LOINC) codings.push({ system: LOINC, code: 'X-' + code, display });
  return Object.assign({
    resourceType: 'Observation', id, status,
    code: { coding: codings, text: display },
    effectiveDateTime: EFF
  }, value, extra);
}

const mgbPositive = [
  obs('mgb-creat-range', LOINC, '2160-0', 'Creatinine',
      { valueRange: { low: { value: 1.0, unit: 'mg/dL' }, high: { value: 5.0, unit: 'mg/dL' } } }),
  obs('mgb-k-ratio', LOINC, '2823-3', 'Potassium',
      { valueRatio: { numerator: { value: 4.2, unit: 'mmol' }, denominator: { value: 1, unit: 'L' } } }),
  obs('mgb-height-comparator', LOINC, '8302-2', 'Body height',
      { valueQuantity: { comparator: '>', value: 180, unit: 'cm' } }),
  obs('mgb-weight-string', LOINC, '29463-7', 'Body weight',
      { valueString: '70.5 kg' })
];

const mgbNegative = [
  obs('mgb-creat-ratio-nodenom', LOINC, '2160-0', 'Creatinine',
      { valueRatio: { numerator: { value: 1, unit: 'mg/dL' } } }),
  obs('mgb-k-range-nounits', LOINC, '2823-3', 'Potassium',
      { valueRange: { low: { value: 3.5 }, high: { value: 5.0 } } }),
  obs('mgb-height-range-inches', LOINC, '8302-2', 'Body height',
      { valueRange: { low: { value: 70, unit: 'in' }, high: { value: 72, unit: 'in' } } }),
  obs('mgb-weight-cancelled', LOINC, '29463-7', 'Body weight',
      { valueQuantity: { value: 70, unit: 'kg' } }, 'cancelled')
];

const mayoPositive = [
  obs('mayo-egfr-comparator', LOINC, '98979-8', 'eGFR',
      { valueQuantity: { comparator: '<', value: 15, unit: 'mL/min/1.73m2' } }),
  obs('mayo-glucose-range', OID, '1911200034', 'Glucose',
      { valueRange: { low: { value: 60, unit: 'mg/dL' }, high: { value: 70, unit: 'mg/dL' } } }),
  obs('mayo-ptt-ratio', OID, '1910205397', 'PTT',
      { valueRatio: { numerator: { value: 1 }, denominator: { value: 16 } } }),
  obs('mayo-k-string', LOINC, '2823-3', 'Potassium',
      { valueString: '4.2 mmol/L' }),
  obs('mayo-weight-quantity', LOINC, '29463-7', 'Body weight',
      { valueQuantity: { value: 70, unit: 'kg' } })
];

const mayoNegative = [
  obs('mayo-egfr-range-empty', LOINC, '98979-8', 'eGFR', { valueRange: {} }),
  obs('mayo-k-ratio-nodenom', LOINC, '2823-3', 'Potassium',
      { valueRatio: { numerator: { value: 4.2, unit: 'mmol' } } }),
  obs('mayo-glucose-cancelled', OID, '1911200034', 'Glucose',
      { valueQuantity: { value: 200, unit: 'mg/dL' } }, 'cancelled'),
  obs('mayo-qtc-preliminary', OID, '182003', 'QTc',
      { valueQuantity: { value: 500, unit: 'ms' } }, 'preliminary'),
  obs('mayo-weight-range-lb', LOINC, '29463-7', 'Body weight',
      { valueRange: { low: { value: 150, unit: 'lb' }, high: { value: 160, unit: 'lb' } } })
];

const out = { 'mgb-positive': mgbPositive, 'mgb-negative': mgbNegative,
              'mayo-positive': mayoPositive, 'mayo-negative': mayoNegative };
for (const [name, data] of Object.entries(out)) {
  fs.writeFileSync(path.join(__dirname, 'scenarios', name + '.json'), JSON.stringify(data, null, 2));
}
console.log('wrote', Object.keys(out).join(', '));
