const { chromium } = require("playwright-core");
const EXE = "/Users/ryanducharme/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const DIR = "/Users/ryanducharme/.claude/jira-watch/state/results/OR-2723/scratch/";

async function pickTenant(page, tenant) {
  await page.locator(".mb-2").first().click();
  await page.waitForTimeout(500);
  await page.keyboard.type(tenant);
  await page.waitForTimeout(800);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
}

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  const caps = [];
  page.on("response", async (r) => {
    if (r.url().includes("capabilities")) {
      caps.push(`${r.status()} ${r.request().headers()["x-tenant-id"]} -> ${await r.text().catch(() => "?")}`);
    }
  });

  await page.goto("http://localhost:3999/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/Username/i).fill("admin");
  await page.getByLabel(/Password/i).fill("admin");
  await page.getByRole("button", { name: /^Log in$/i }).click();
  await page.waitForTimeout(3500);

  for (const tenant of ["mayo-mayo", "demo-demo"]) {
    await page.goto("http://localhost:3999/admin/manage-data", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await pickTenant(page, tenant);
    await page.getByRole("tab", { name: /Practitioners/i }).click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: DIR + `ui-tab-${tenant}.png` });
    const body = await page.locator("body").innerText();
    const bulk = await page.getByRole("button", { name: /Refresh Selected/i }).count();
    const rowBtns = await page.locator("table button").count();
    console.log(`--- ${tenant}: bulkRefreshButtons=${bulk} tableButtons=${rowBtns}`);
    console.log(body.split("\n").filter(l => l.trim()).slice(0, 25).join(" | "));
  }
  console.log("CAPABILITY CALLS:", JSON.stringify(caps, null, 1));
  await b.close();
})().catch((e) => console.log("ERR", e.message));
