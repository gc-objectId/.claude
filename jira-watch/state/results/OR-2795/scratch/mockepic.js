const http = require('http');
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const LOG = path.join(DIR, 'mock.log');

function log(line) {
  fs.appendFileSync(LOG, new Date().toISOString() + ' ' + line + '\n');
}
function activeScenario() {
  try { return fs.readFileSync(path.join(DIR, 'active'), 'utf8').trim(); } catch (e) { return 'positive'; }
}
function bundle(entries) {
  return JSON.stringify({
    resourceType: 'Bundle', type: 'searchset', total: entries.length,
    entry: entries.map(r => ({ fullUrl: 'urn:uuid:' + (r.id || 'x'), resource: r }))
  });
}
function patient(vendor) {
  const id = vendor === 'mayo' ? 'MAYOPT1' : 'MGBPT1';
  return {
    resourceType: 'Patient', id,
    identifier: [
      { system: vendor === 'mayo'
          ? 'urn:oid:1.2.840.114350.1.13.451.3.7.5.737384.135000'
          : 'urn:oid:1.2.840.114350.1.13.362.3.7.3.737384.0',
        type: { text: 'MC' }, value: '30001006705' }
    ],
    name: [{ use: 'official', family: 'Valuetype', given: ['Loop'] }],
    gender: 'female',
    birthDate: '1970-05-04'
  };
}
function scenarioFile(vendor) {
  return path.join(DIR, 'scenarios', vendor + '-' + activeScenario() + '.json');
}
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const u = new URL(req.url, 'http://x');
    log(`${req.method} ${req.url}`);
    if (u.pathname === '/oauth2/token') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ access_token: 'mock-token', token_type: 'Bearer', expires_in: 3600 }));
    }
    const m = u.pathname.match(/^\/(mayo|mgb)\/R4\/(\w+)$/);
    res.writeHead(200, { 'Content-Type': 'application/fhir+json' });
    if (!m) return res.end(bundle([]));
    const [, vendor, resource] = m;
    if (resource === 'Patient') return res.end(bundle([patient(vendor)]));
    if (resource === 'Observation') {
      let entries = [];
      try { entries = JSON.parse(fs.readFileSync(scenarioFile(vendor), 'utf8')); }
      catch (e) { log('scenario read failed: ' + e.message); }
      log(`  -> ${vendor} scenario=${activeScenario()} observations=${entries.length}`);
      return res.end(bundle(entries));
    }
    return res.end(bundle([]));
  });
});
server.listen(8899, '::', () => log('mock epic listening on 8899'));
