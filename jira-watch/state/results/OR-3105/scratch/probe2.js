const { chromium, request } = require('/Users/ryanducharme/dev/orci/qa-suite/node_modules/playwright');
const BASE = 'http://localhost:53217';
const LABEL = process.argv[2] || 'run';
const CLIENT = process.argv[3] || 'demo-demo';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function adminCtx() {
  const ctx = await request.newContext({ baseURL: BASE });
  const r = await ctx.get('/csrf'); const body = await r.json();
  const tok = (await ctx.storageState()).cookies.find(c => c.name === 'XSRF-TOKEN').value;
  const lr = await ctx.post('/api/login/basic', { form: { username: 'admin', password: 'admin' }, headers: { [body.headerName]: tok } });
  console.log('admin login', lr.status());
  return ctx;
}
async function audioCount(ctx) {
  const r = await ctx.get('/actuator/metrics/http.server.requests?tag=uri:/audio/**');
  if (!r.ok()) return 'metrics http ' + r.status();
  const j = await r.json(); return j.measurements.find(m => m.statistic === 'COUNT').value;
}
(async () => {
  const admin = await adminCtx();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page); await cdp.send('Network.enable');
  let seen = [];
  cdp.on('Network.responseReceived', e => {
    const u = e.response.url; if (!u.includes('/audio/')) return;
    seen.push({ url: u.replace(BASE, ''), status: e.response.status, fromDiskCache: !!e.response.fromDiskCache, fromMemoryCache: !!e.response.fromMemoryCache, cc: e.response.headers['cache-control'] || e.response.headers['Cache-Control'] || null });
  });
  const launchUrl = `${BASE}/app-launch?patient_id=patient-1&case_id=case-3105&client_id=${CLIENT}&forceLaunch=true`;
  const phase = async (name, fn) => {
    seen = []; const before = await audioCount(admin); await fn(); await sleep(5000); const after = await audioCount(admin);
    const med = seen.filter(s => s.url.includes('/audio/medications/'));
    const summary = { total: med.length, network: med.filter(s => !s.fromDiskCache && !s.fromMemoryCache).length, diskCache: med.filter(s => s.fromDiskCache).length, memCache: med.filter(s => s.fromMemoryCache).length, statuses: [...new Set(med.map(s => s.status))], cacheControl: [...new Set(med.map(s => s.cc))] };
    console.log(`\n== [${LABEL}] ${name}\n   server-side /audio/** request count ${before} -> ${after} (delta ${after - before})\n   browser: ${JSON.stringify(summary)}\n   page url: ${page.url().replace(BASE, '')}`);
    for (const s of med.slice(0, 3)) console.log('   ', JSON.stringify(s));
  };
  await phase('login', async () => {
    await page.goto(BASE + '/login');
    await page.locator('#username').fill('loopuser');
    await page.locator('#password').evaluate((el, pwd) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, pwd); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, 'LoopValidate1!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 10000 });
    await page.locator('text=Welcome,').waitFor({ timeout: 10000 });
  });
  await phase('first app-launch (AppLaunch mounts, preloadCommonMedicationAudioAnnouncements fires)', async () => { await page.goto(launchUrl); await page.waitForURL('**/app-launch**', { timeout: 15000 }); });
  await page.screenshot({ path: `launch-${LABEL}.png` });
  await phase('second app-launch (page.goto same URL, same release)', async () => { await page.goto(launchUrl); await page.waitForURL('**/app-launch**', { timeout: 15000 }); });
  await phase('reload of app-launch (page.reload)', async () => { await page.reload(); await page.waitForURL('**/app-launch**', { timeout: 15000 }); });
  await phase('new release URL (?v=deadbeef0) fetched from the app page', async () => { await page.evaluate(() => fetch('/audio/medications/m-lidocaine.mp3?v=deadbeef0').then(r => r.blob())); });
  await phase('same new release URL fetched again', async () => { await page.evaluate(() => fetch('/audio/medications/m-lidocaine.mp3?v=deadbeef0').then(r => r.blob())); });
  await browser.close(); await admin.dispose();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
