const { chromium } = require("playwright-core");
const EXE = "/Users/ryanducharme/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const DIR = "/Users/ryanducharme/.claude/jira-watch/state/results/OR-2723/scratch/";

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  page.on("response", async (r) => {
    if (/practitioners\/[0-9a-f-]{36}\/refresh/.test(r.url())) console.log("NET", r.status(), await r.text().catch(()=>"?"));
  });

  await page.goto("http://localhost:3999/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/Username/i).fill("admin");
  await page.getByLabel(/Password/i).fill("admin");
  await page.getByRole("button", { name: /^Log in$/i }).click();
  await page.waitForTimeout(3500);

  await page.goto("http://localhost:3999/admin/manage-data", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.locator(".mb-2").first().click();
  await page.waitForTimeout(400);
  await page.keyboard.type("mayo-mayo");
  await page.waitForTimeout(700);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);
  await page.getByRole("tab", { name: /Practitioners/i }).click();
  await page.waitForTimeout(2500);

  for (const perid of ["PERID-NONAME-001", "PERID-NAMED-002"]) {
    const row = page.locator("tr", { hasText: perid });
    await row.locator("button").last().click();
    await page.waitForTimeout(3000);
    const btn = row.locator("button").last();
    console.log(`ROW ${perid}: text=${JSON.stringify((await btn.innerText()).trim())} class=${await btn.getAttribute("class")} title=${JSON.stringify(await btn.getAttribute("title"))}`);
    await page.screenshot({ path: DIR + `ui-row-${perid}.png` });
  }

  // bulk: select all, refresh
  await page.locator("thead input[type=checkbox]").first().check().catch(async () => {
    for (const cb of await page.locator("tbody input[type=checkbox]").all()) await cb.check();
  });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Refresh Selected/i }).click();
  await page.waitForTimeout(5000);
  const body = await page.locator("body").innerText();
  console.log("BULK LINE:", body.split("\n").find((l) => /refreshed/i.test(l)) || "(none)");
  await page.screenshot({ path: DIR + "ui-bulk.png" });
  await b.close();
})().catch((e) => console.log("ERR", e.message));
