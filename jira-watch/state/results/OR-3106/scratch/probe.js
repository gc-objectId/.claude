const http = require('http');
const args = process.argv.slice(2);
const showBody = args[0] === '--body'; if (showBody) args.shift();
const [path, ...hdrs] = args;
const headers = {};
for (const h of hdrs) { const i = h.indexOf('='); headers[h.slice(0, i)] = h.slice(i + 1); }
const req = http.request({ host: 'localhost', port: 53375, path, method: 'GET', headers }, res => {
  let n = 0; const chunks = [];
  res.on('data', c => { n += c.length; if (chunks.length < 4) chunks.push(c); });
  res.on('end', () => {
    console.log(`GET ${path} -> ${res.statusCode}`);
    for (const k of ['content-type','content-encoding','cache-control','content-length','transfer-encoding','vary','pragma','expires','location'])
      if (res.headers[k] !== undefined) console.log(`  ${k}: ${res.headers[k]}`);
    console.log(`  body bytes on wire: ${n}`);
    if (showBody) process.stdout.write(Buffer.concat(chunks).toString('utf8').slice(0, 1500) + '\n');
  });
});
req.on('error', e => { console.log('ERR', e.message); process.exit(1); });
req.end();
