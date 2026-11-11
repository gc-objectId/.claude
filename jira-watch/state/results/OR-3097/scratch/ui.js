const { chromium } = require("/Users/ryanducharme/dev/orci/qa-suite/node_modules/playwright");
const fs = require("fs");
const BASE = "http://127.0.0.1:61621";
const [tenant, pmrn, caseId, medName, tag, ...clicks] = process.argv.slice(2);
const OUT = "/Users/ryanducharme/.claude/jira-watch/state/results/OR-3097/scratch";

async function snapshot(page, label) {
  const state = await page.evaluate(() => {
    const groupButtons = (id) => {
      const g = document.getElementById(id)?.closest(".form-section") || document.querySelector(`[id='${id}']`)?.parentElement;
      const grp = g || document.querySelector(`.form-section:has(#${id})`);
      if (!grp) return null;
      return Array.from(grp.querySelectorAll("button")).map((b) => ({
        text: b.textContent.trim(),
        selected: b.classList.contains("btn-secondary") && !b.classList.contains("btn-outline-secondary"),
      }));
    };
    const sections = Array.from(document.querySelectorAll(".form-section"));
    const byLabel = (name) => {
      const s = sections.find((sec) => sec.querySelector("label")?.textContent.trim() === name);
      if (!s) return null;
      return Array.from(s.querySelectorAll("button")).map((b) => ({
        text: b.textContent.trim(),
        selected: b.classList.contains("btn-secondary") && !b.classList.contains("btn-outline-secondary"),
      }));
    };
    const doseContainer = document.querySelector("[data-testid='dose-button-container']");
    const doses = doseContainer
      ? Array.from(doseContainer.querySelectorAll("button")).map((b) => ({
          text: b.textContent.replace(/ /g, " ").trim(),
          selected: b.getAttribute("data-selected") === "true",
        }))
      : null;
    const doseInput = document.querySelector("input[aria-label='Dose'], input[name='dose'], input[id*='dose']");
    return { route: byLabel("Route"), indication: byLabel("Indication"), doses, doseInput: doseInput ? doseInput.value : undefined };
  });
  await page.screenshot({ path: `${OUT}/${tag}-${label}.png`, fullPage: true });
  console.log(JSON.stringify({ step: label, ...state }));
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") fs.appendFileSync(`${OUT}/${tag}-console.log`, m.text() + "\n"); });
  await page.goto(`${BASE}/login`);
  await page.locator("#username").fill("loopuser");
  await page.locator("#password").evaluate((el, pwd) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, pwd);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, "LoopValidate1!");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/", { timeout: 15000 });
  await page.goto(`${BASE}/app-launch?patient_id=${pmrn}&case_id=${caseId}&client_id=${tenant}`);
  const home = page.locator("#tab-navigation-tab-HOME_TAB");
  await home.waitFor({ state: "visible", timeout: 30000 });
  await home.click();
  await page.getByRole("tab", { name: "+" }).click();
  await page.getByLabel("Medication:").fill(medName.toLowerCase());
  await page.getByText(medName, { exact: true }).click();
  await page.getByTestId("dose-button-container").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await snapshot(page, "open");
  let i = 0;
  for (const click of clicks) {
    i++;
    if (click === "SAVE_FIRST_DOSE") {
      await page.getByTestId("dose-button-container").getByRole("button").first().click();
      await page.waitForTimeout(300);
      await snapshot(page, `${i}-dose-picked`);
      const tab = page.getByRole("tab", { name: medName });
      await page.getByRole("button", { name: "Save" }).click();
      await tab.waitFor({ state: "detached", timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${tag}-${i}-saved.png`, fullPage: true });
      console.log(JSON.stringify({ step: `${i}-saved` }));
      continue;
    }
    await page.getByRole("button", { name: click, exact: true }).click();
    await page.waitForTimeout(300);
    await snapshot(page, `${i}-click-${click.replace(/\s+/g, "_")}`);
  }
  await browser.close();
})().catch((e) => { console.error("UI ERROR", e); process.exit(1); });
