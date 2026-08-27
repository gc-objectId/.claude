const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 54990;
const SCENARIO = path.join(__dirname, 'scenario.json');
const LOG = path.join(__dirname, 'mock-fhir.log');

function logLine(s) {
  fs.appendFileSync(LOG, new Date().toISOString() + ' ' + s + '\n');
}

const patientBundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 1,
  entry: [
    {
      resource: {
        resourceType: 'Patient',
        id: 'MOCKPAT1',
        identifier: [
          { type: { text: 'MC' }, system: 'urn:oid:1.2.840.114350.1.13.451.3.7.5.737384.135000', value: '99001122' },
          { type: { text: 'EXTERNAL' }, system: 'urn:oid:1.2.840.114350.1.13.451.3.7.5.737384.999', value: 'EPICINT1' },
        ],
        name: [{ use: 'official', family: 'Mocktest', given: ['Statuscheck'] }],
        gender: 'female',
        birthDate: '1970-01-01',
      },
    },
  ],
};

function obs(o) {
  const r = {
    resourceType: 'Observation',
    id: o.id,
    status: o.status,
    category: [
      { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] },
    ],
    code: { coding: [{ system: o.system, code: o.code, display: o.display }], text: o.display },
    subject: { reference: 'Patient/MOCKPAT1' },
    effectiveDateTime: o.effective || '2026-08-26T12:00:00Z',
  };
  if (o.valueString !== undefined) r.valueString = o.valueString;
  if (o.valueQuantity !== undefined) r.valueQuantity = o.valueQuantity;
  return { resource: r };
}

function bundle(entries) {
  return { resourceType: 'Bundle', type: 'searchset', total: entries.length, entry: entries };
}

function scenario() {
  return JSON.parse(fs.readFileSync(SCENARIO, 'utf8'));
}

const LOINC = 'http://loinc.org';
const OID = 'urn:oid:1.2.840.114350.1.13.451.3.7.2.768282';

function labEntries(s) {
  return [
    obs({ id: 'lab-k-final', status: s.finalPotassiumStatus, system: LOINC, code: '2823-3', display: 'Potassium', valueQuantity: { value: 4.1, unit: 'mmol/L' } }),
    obs({ id: 'lab-k-cancelled', status: s.cancelledPotassiumStatus, system: LOINC, code: '2823-3', display: 'Potassium', valueString: 'CANCELED' }),
    obs({ id: 'lab-ptt-eie', status: s.eieForPttStatus, system: LOINC, code: '14979-9', display: 'aPTT', valueString: 'SPECIMEN CLOTTED' }),
    obs({ id: 'lab-narrative', status: 'final', system: LOINC, code: '13058-3', display: 'PTT narrative', valueString: s.narrativeText }),
    obs({ id: 'lab-multiword-unit', status: 'final', system: LOINC, code: '2160-0', display: 'Creatinine', valueString: s.multiwordText }),
    obs({ id: 'lab-paragraph', status: 'final', system: LOINC, code: '13059-1', display: 'Interpretation', valueString: 'This test was performed using a method that has not been cleared by the FDA. Results should be interpreted in clinical context.' }),
  ];
}

function latestEntries(s) {
  return [
    obs({ id: 'lat-qtc', status: s.qtcStatus, system: OID, code: '182003', display: 'QTc Interval', valueString: '519' }),
    obs({ id: 'lat-k-cancelled', status: s.cancelledPotassiumStatus, system: LOINC, code: '2823-3', display: 'Potassium', valueQuantity: { value: 9.9, unit: 'mmol/L' } }),
    obs({ id: 'lat-ptt-eie', status: s.eieForPttStatus, system: OID, code: '1910205397', display: 'aPTT', valueString: 'SPECIMEN CLOTTED' }),
  ];
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    logLine(req.method + ' ' + req.url);
    if (req.method === 'POST' && url.pathname.endsWith('/token')) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: 'mock-token', token_type: 'bearer', expires_in: 3600 }));
      });
      return;
    }
    let payload;
    if (url.pathname.endsWith('/Patient')) {
      payload = patientBundle;
    } else if (url.pathname.endsWith('/Observation')) {
      const s = scenario();
      payload = url.searchParams.get('category') === 'laboratory' ? bundle(labEntries(s)) : bundle(latestEntries(s));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end('{"resourceType":"OperationOutcome"}');
      return;
    }
    const out = JSON.stringify(payload);
    res.writeHead(200, { 'Content-Type': 'application/fhir+json', 'Content-Length': Buffer.byteLength(out) });
    res.end(out);
  })
  .listen(PORT, '0.0.0.0', () => logLine('mock fhir listening on ' + PORT));
