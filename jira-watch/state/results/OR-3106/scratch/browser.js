const { chromium } = require('/Users/ryanducharme/dev/orci/qa-suite/node_modules/playwright');
const BASE = 'http://localhost:53375';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  let launch = 0;
  const seen = {};
  const note = (l, url, how) => { (seen[l] ||= []).push(`${how} ${url.replace(BASE, '')}`); };
  cdp.on('Network.requestWillBeSent', e => { if (/\/static\/.*\.(js|css)$|\/$|index\.html|app-launch/.test(e.request.url.split('?')[0]) && e.request.url.startsWith(BASE)) note(launch, e.request.url, 'REQUEST'); });
  cdp.on('Network.requestServedFromCache', e => note(launch, 'id=' + e.requestId, 'SERVED-FROM-CACHE'));
  cdp.on('Network.responseReceived', e => {
    const u = e.response.url; if (!u.startsWith(BASE) || !/\/static\/.*\.(js|css)$/.test(u.split('?')[0])) return;
    note(launch, u, `RESPONSE status=${e.response.status} fromDiskCache=${e.response.fromDiskCache} fromMemory=${e.response.fromPrefetchCache||false} encodedDataLength=${e.response.encodedDataLength} content-encoding=${(e.response.headers['content-encoding']||e.response.headers['Content-Encoding'])} cache-control=${(e.response.headers['cache-control']||e.response.headers['Cache-Control'])}`);
  });
  const run = async (label, path) => { launch = label; await page.goto(BASE + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(500); };
  await run('launch1', '/app-launch');
  await run('launch2', '/app-launch');
  const mode = process.argv[2];
  if (mode === 'deploy') {
    const { execSync } = require('child_process');
    execSync(`docker exec orci-loop-or-3106-orci-1 sh -c 'cp /app/resources/static/static/index.WYelJArk.js /app/resources/static/static/index.LOOPDEPLOY.js && sed -i "s/index.WYelJArk.js/index.LOOPDEPLOY.js/g" /app/resources/static/index.html'`);
    console.log('-- deploy simulated: shell now references index.LOOPDEPLOY.js --');
    await run('launch3-after-deploy', '/app-launch');
  }
  for (const [k, v] of Object.entries(seen)) { console.log(`== ${k}`); v.forEach(l => console.log('  ' + l)); }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
