const { chromium } = require("/Users/ryanducharme/dev/orci/qa-suite/node_modules/playwright-core");
const BASE = "http://127.0.0.1:50453";
const [pu, ou, exec] = process.argv.slice(2);

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: exec });
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  const reqs = [];
  const errs = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/") || r.url().includes("feature-flag")) reqs.push(r.method() + " " + r.url());
  });
  page.on("response", (r) => {
    if (r.url().includes("feature-flag") || r.url().includes("/context")) reqs.push("  <- " + r.status() + " " + r.url());
  });
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + ": " + m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message.slice(0, 300)));

  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: "login.png", fullPage: true });
  console.log("login page inputs:", await page.$$eval("input", (ns) => ns.map((n) => n.name + "|" + n.type + "|" + n.id).join(", ")));
  const inputs = await page.$$("input");
  if (inputs.length >= 2) {
    await inputs[0].fill("admin");
    await inputs[1].fill("admin");
    await page.keyboard.press("Enter");
  }
  await page.waitForTimeout(5000);
  console.log("after login url:", page.url());
  reqs.length = 0;
  errs.length = 0;

  const target = BASE + "/admin/patients/" + pu + "/operations/" + ou + "/debugger";
  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);
  console.log("debugger url:", page.url());
  console.log("=== requests ===\n" + reqs.join("\n"));
  console.log("=== console errors ===\n" + (errs.join("\n") || "(none)"));
  console.log("=== body text (first 1500) ===\n" + (await page.innerText("body")).slice(0, 1500));
  await page.screenshot({ path: "debugger.png", fullPage: true });
  await b.close();
})().catch((e) => {
  console.log("FAIL", e.message);
  process.exit(1);
});
