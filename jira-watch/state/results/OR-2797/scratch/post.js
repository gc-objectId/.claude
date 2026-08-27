const http = require('http');
const fs = require('fs');

const template = fs.readFileSync(__dirname + '/in_room.xml', 'utf8');

function buildBody(userId, displayName, logId) {
  return template
    .replace('<ID>INTRARN</ID>', `<ID>${userId}</ID>`)
    .replace('<DisplayName>INTRA-OP, NURSE</DisplayName>', `<DisplayName>${displayName}</DisplayName>`)
    .replace('<ID>14961</ID>', `<ID>${logId}</ID>`);
}

function post(body) {
  return new Promise((resolve) => {
    const req = http.request({
      host: 'localhost', port: 60725, path: '/api/integration/mgh/event', method: 'POST',
      headers: { 'Content-Type': 'application/xml', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 200) }));
    });
    req.on('error', e => resolve({ status: 'ERR', body: e.message }));
    req.end(body);
  });
}

(async () => {
  const [, , userId, displayName, count, logId] = process.argv;
  const n = parseInt(count || '1', 10);
  const bodies = [];
  for (let i = 0; i < n; i++) bodies.push(buildBody(userId, displayName, logId || '14961'));
  const t0 = process.hrtime.bigint();
  const results = await Promise.all(bodies.map(b => post(b)));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(JSON.stringify({ userId, n, elapsedMs: Math.round(ms), statuses: results.map(r => r.status) }));
})();
