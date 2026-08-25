const http = require('http');
const fs = require('fs');
const path = require('path');

const MODE_FILE = path.join(__dirname, 'stub-mode');
const LOG_FILE = path.join(__dirname, 'stub-requests.log');
const PORT = 62151;

function mode() {
  try { return fs.readFileSync(MODE_FILE, 'utf8').trim(); } catch { return 'nomatch'; }
}

function emptyBundle() {
  return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
}

function practitionerBundle(perid) {
  return {
    resourceType: 'Bundle', type: 'searchset', total: 1,
    entry: [{
      resource: {
        resourceType: 'Practitioner',
        id: 'stub-fhir-id-' + perid,
        identifier: [
          { system: 'urn:oid:1.2.840.114350.1.13.451.3.7.5.737384.135', value: perid },
          { system: 'urn:oid:1.2.840.114350.1.13.451.3.7.5.737384.6', value: 'PROV' + perid }
        ],
        name: [{ family: 'Stubbed', given: ['Refreshed'], text: 'Refreshed Stubbed MD' }],
        telecom: [{ system: 'email', value: 'refreshed.stubbed@example.org' }]
      }
    }]
  };
}

function roleBundle() {
  return {
    resourceType: 'Bundle', type: 'searchset', total: 1,
    entry: [{
      resource: {
        resourceType: 'PractitionerRole',
        id: 'stub-role-1',
        code: [{ text: 'Anesthesiologist' }],
        specialty: [{ text: 'Anesthesiology' }]
      }
    }]
  };
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const m = mode();
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} mode=${m} ${req.method} ${req.url}\n`);

    if (req.url.startsWith('/oauth2/token')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ access_token: 'stub-access-token', token_type: 'bearer', expires_in: 3600 }));
    }

    if (req.url.startsWith('/fhir/R4/Practitioner?')) {
      if (m === 'error') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', diagnostics: 'stub forced failure' }] }));
      }
      const perid = decodeURIComponent((req.url.match(/identifier=[^&]*/) || [''])[0]).split('|')[1] || 'unknown';
      const payload = (m === 'match') ? practitionerBundle(perid) : emptyBundle();
      res.writeHead(200, { 'Content-Type': 'application/fhir+json' });
      return res.end(JSON.stringify(payload));
    }

    if (req.url.startsWith('/fhir/R4/PractitionerRole?')) {
      res.writeHead(200, { 'Content-Type': 'application/fhir+json' });
      return res.end(JSON.stringify(roleBundle()));
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', diagnostics: 'stub: no route ' + req.url }] }));
  });
});

server.listen(PORT, () => console.log('stub epic listening on ' + PORT));
