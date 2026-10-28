const { chromium, request } = require('/Users/ryanducharme/dev/orci/qa-suite/node_modules/playwright');
const BASE = 'http://localhost:53217';
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
  const phase = async (name, fn) => {
    seen = []; const before = await audioCount(admin); await fn(); await sleep(4000); const after = await audioCount(admin);
    const med = seen.filter(s => s.url.includes('/audio/medications/'));
    console.log(`\n== ${name}: server /audio/** request count ${before} -> ${after} (delta ${after - before}); browser saw ${med.length} medication audio responses`);
    for (const s of med) console.log('  ', JSON.stringify(s));
  };
  await phase('first launch (login -> home mounts AppLaunch, preload fires)', async () => {
    await page.goto(BASE + '/login');
    await page.locator('#username').fill('loopuser');
    await page.locator('#password').evaluate((el, pwd) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, pwd); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, 'LoopValidate1!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/', { timeout: 10000 });
    await page.locator('text=Welcome,').waitFor({ timeout: 10000 });
  });
  await phase('second launch (page.goto home again, same release URL)', async () => { await page.goto(BASE + '/'); await page.locator('text=Welcome,').waitFor({ timeout: 10000 }); });
  await phase('reload (page.reload)', async () => { await page.reload(); await page.locator('text=Welcome,').waitFor({ timeout: 10000 }); });
  await phase('new release URL (?v=deadbeef0 via fetch from the app page)', async () => { await page.evaluate(() => fetch('/audio/medications/m-lidocaine.mp3?v=deadbeef0').then(r => r.blob())); });
  await phase('same new release URL fetched again', async () => { await page.evaluate(() => fetch('/audio/medications/m-lidocaine.mp3?v=deadbeef0').then(r => r.blob())); });
  await browser.close(); await admin.dispose();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
