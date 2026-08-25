const { chromium } = require("playwright-core");
const EXE = "/Users/ryanducharme/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const DIR = "/Users/ryanducharme/.claude/jira-watch/state/results/OR-2723/scratch/";

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  page.on("response", (r) => { if (r.url().includes("practitioner")) console.log("NET", r.status(), r.request().method(), r.url()); });

  await page.goto("http://localhost:3999/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/Username/i).fill("admin");
  await page.getByLabel(/Password/i).fill("admin");
  await page.getByRole("button", { name: /^Log in$/i }).click();
  await page.waitForTimeout(4000);
  console.log("after login:", page.url());
  await page.screenshot({ path: DIR + "ui-02-home.png", fullPage: false });

  await page.goto("http://localhost:3999/admin/manage-data", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: DIR + "ui-03-managedata.png" });
  console.log("BODY:\n" + (await page.locator("body").innerText()).slice(0, 2000));
  await b.close();
})().catch((e) => console.log("ERR", e.message));
