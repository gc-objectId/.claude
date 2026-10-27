const { chromium, request: pwRequest } = require("/Users/ryanducharme/dev/orci/qa-suite/node_modules/playwright");

const BASE = "http://127.0.0.1:64203";
const TENANT = "demo-demo";
const ADMIN = { u: "admin", p: "admin" };
const USER = { u: "loopuser", p: "LoopValidate1!" };
const MODE = process.argv[2] || "green";
const DELAY_MS = 4000;
const results = [];
const t0 = Date.now();
const log = (...a) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(2)}s]`, ...a);
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " :: " + detail : ""}`);
}

async function csrf(ctx) {
  const r = await ctx.get(`${BASE}/csrf`);
  const body = await r.json();
  const cookie = (await ctx.storageState()).cookies.find((c) => c.name === "XSRF-TOKEN");
  return { header: body.headerName, token: cookie.value };
}

async function adminSetup() {
  const ctx = await pwRequest.newContext({ baseURL: BASE });
  let c = await csrf(ctx);
  const login = await ctx.post(`${BASE}/api/login/basic`, { form: { username: ADMIN.u, password: ADMIN.p }, headers: { [c.header]: c.token } });
  if (!login.ok()) throw new Error("admin login " + login.status());
  c = await csrf(ctx);
  const mint = await ctx.post(`${BASE}/api/tokens/user`, { headers: { [c.header]: c.token }, data: { label: "or2986-validate" } });
  const { token } = await mint.json();
  const api = await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { "X-API-Key": token, "X-Tenant-Id": TENANT, "Content-Type": "application/json" } });
  for (const name of ["MEDICATION_FAVORITES", "MEDICATION_MACROS"]) {
    const r = await api.post(`${BASE}/api/admin/feature-flags/flags`, { data: { name, description: name, enabled: true, strategyId: "ENABLED_FOR_ALL_TENANTS_EXCEPT", strategyParams: JSON.stringify({ disabledTenants: [], enableDate: 0 }) } });
    log("enable flag", name, r.status());
  }
  return api;
}

async function newCase(api, prefix) {
  const dob = new Date(); dob.setFullYear(dob.getFullYear() - 45);
  const p = await api.post(`${BASE}/api/admin/patients/`, { data: { prmnPrefix: prefix, firstName: "Test", lastName: "Patient", dob: dob.toISOString().split("T")[0], height: "170 cm", weight: "70 kg", gender: "MALE", genderIdentity: "MALE" } });
  if (!p.ok()) throw new Error("createPatient " + p.status() + " " + (await p.text()));
  const patient = await p.json();
  const o = await api.post(`${BASE}/api/admin/patients/${patient.uuid}/operations/create`, { data: { procedureTypes: [{ id: "p-gastro-uncomplicated", qualifier: null }], startTime: new Date().toISOString() } });
  if (!o.ok()) throw new Error("createOperation " + o.status() + " " + (await o.text()));
  const { caseId } = await o.json();
  log("case", patient.pmrn, caseId);
  return { pmrn: patient.pmrn, caseId };
}

async function uiLogin(context) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.locator("#username").fill(USER.u);
  await page.locator("#password").fill(USER.p);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/", { timeout: 10000 });
  await page.locator("text=Welcome,").waitFor({ timeout: 5000 });
  await page.close();
}

async function launch(context, { pmrn, caseId }) {
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") log("browser console error:", m.text().slice(0, 200)); });
  page.on("request", (r) => { if (r.url().includes("/api/cds/medication-selection/")) log("REQ", r.method(), r.url().replace(BASE, ""), (r.postData() || "").slice(0, 120)); });
  page.on("response", (r) => { if (r.url().includes("/api/cds/medication-selection/")) log("RES", r.status(), r.url().replace(BASE, "")); });
  await page.goto(`${BASE}/app-launch?patient_id=${pmrn}&case_id=${caseId}&client_id=${TENANT}&forceLaunch=true`);
  await page.locator("#tab-navigation-tab-HOME_TAB").waitFor({ timeout: 20000 });
  const html = await (await page.request.get(`${BASE}/login`)).text();
  log("served bundle:", (html.match(/static\/index\.[A-Za-z0-9_-]+\.js/) || ["?"])[0]);
  return page;
}

// Delay (or fail) the medication lookup so the pending window is observable.
async function gateLookups(page, opts) {
  const state = { inFlight: 0, resolved: 0 };
  const handler = async (route) => {
    state.inFlight++;
    await new Promise((r) => setTimeout(r, opts.delay ?? DELAY_MS));
    state.inFlight--;
    state.resolved++;
    if (opts.status) return route.fulfill({ status: opts.status, contentType: "application/json", body: JSON.stringify({ message: "boom" }) });
    return route.continue();
  };
  await page.route("**/api/cds/medication-selection/**", handler);
  return { state, off: () => page.unroute("**/api/cds/medication-selection/**", handler) };
}

async function dump(page, label) {
  const tabs = await page.locator("[role=tab]").allInnerTexts();
  const alerts = await page.locator(".alert").filter({ visible: true }).allInnerTexts();
  const active = await page.evaluate(() => { const e = document.activeElement; return e ? e.tagName + (e.id ? "#" + e.id : "") + (e.className ? "." + String(e.className).split(" ")[0] : "") : "none"; });
  await page.screenshot({ path: `${label.replace(/[^a-z0-9]+/gi, "_")}.png`, fullPage: false });
  log(`DUMP ${label}: tabs=[${tabs.join("|")}] alerts=[${alerts.join("|")}] activeElement=${active}`);
}
const skeleton = (page) => page.locator(".MedicationDosingFormSkeleton");
const tab = (page, name) => page.getByRole("tab", { name, exact: true });
const spinnerIn = (page, name) => tab(page, name).locator(".spinner-border");
const doseForm = (page) => page.getByTestId("dose-button-container").filter({ visible: true });

async function observePending(page, label, title, gate, expectPending = true) {
  // Sample immediately after the trigger, while the lookup is still gated.
  await page.waitForTimeout(400);
  const tabVisible = await tab(page, title).isVisible();
  const skel = await skeleton(page).count();
  const spin = await spinnerIn(page, title).count();
  const stillPending = gate.state.resolved === 0;
  const detail = `tab=${tabVisible} skeletons=${skel} spinner=${spin} lookupResolved=${!stillPending}`;
  check(`${label}: placeholder tab shown while lookup pending`, (tabVisible && skel > 0 && spin > 0 && stillPending) === expectPending, detail);
  return { tabVisible, skel, spin, stillPending };
}

async function observeResolved(page, label, title) {
  const wasSelected = await tab(page, title).getAttribute("aria-selected");
  if (wasSelected !== "true") await tab(page, title).click();
  await doseForm(page).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
  const skel = await skeleton(page).count();
  const spin = await spinnerIn(page, title).count();
  const tabVisible = await tab(page, title).isVisible();
  check(`${label}: real dosing form replaces placeholder`, tabVisible && skel === 0 && spin === 0, `tab=${tabVisible} selectedOnResolve=${wasSelected} skeletons=${skel} spinner=${spin}`);
}

async function selectFromDropdown(page, typed, label) {
  await page.getByRole("tab", { name: "+" }).click();
  await page.getByLabel("Medication:").fill(typed);
  await page.getByText(label, { exact: true }).click();
}

async function openSidebar(page) {
  await page.locator(".favorites-sidebar__toggle").click();
  await page.getByText("Favorite Medications").waitFor({ timeout: 5000 });
}

(async () => {
  const api = await adminSetup();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await uiLogin(context);
  // Seed the user's default macros + favorites before the app loads them.
  const pr = await context.request;
  log("macros:", (await (await pr.get(`${BASE}/api/macros/medications`, { headers: { "X-Tenant-Id": TENANT } })).json()).map((m) => m.name).join(","));
  log("favorites:", (await (await pr.get(`${BASE}/api/favorites/medications`, { headers: { "X-Tenant-Id": TENANT } })).json()).map((m) => m.medicationName).join(","));

  if (MODE === "green") {
    // ---- dropdown
    let page = await launch(context, await newCase(api, "or2986-dd"));
    let gate = await gateLookups(page, {});
    await selectFromDropdown(page, "cefazolin", "CeFAZolin");
    await observePending(page, "dropdown", "CeFAZolin", gate);
    await observeResolved(page, "dropdown", "CeFAZolin");
    await gate.off();
    // ---- favorite
    await openSidebar(page);
    gate = await gateLookups(page, {});
    await page.locator(".favorites-sidebar__favorites-section").getByRole("button", { name: "Phenylephrine" }).click();
    await observePending(page, "favorite", "Phenylephrine", gate);
    await observeResolved(page, "favorite", "Phenylephrine");
    await gate.off();
    // ---- macro
    gate = await gateLookups(page, {});
    await page.locator(".favorites-sidebar__macros-section").getByRole("button", { name: "Induction" }).click();
    await page.waitForTimeout(400);
    const macroMeds = ["Lidocaine", "Fentanyl", "Propofol", "Rocuronium"];
    const vis = [];
    for (const m of macroMeds) vis.push(await page.getByRole("tab", { name: m }).isVisible());
    const skel = await skeleton(page).count();
    const spinners = await page.locator("[role=tab] .spinner-border").count();
    await dump(page, "macro-pending");
    check("macro: all four placeholder tabs shown while lookups pending", vis.every(Boolean) && skel > 0 && spinners === 4 && gate.state.resolved === 0, `tabs=${vis} skeletons=${skel} spinners=${spinners} inFlight=${gate.state.inFlight} resolved=${gate.state.resolved}`);
    await page.waitForTimeout(DELAY_MS + 3000);
    const skelAfter = await skeleton(page).count();
    const spinAfter = await page.locator("[role=tab] .spinner-border").count();
    await dump(page, "macro-resolved");
    check("macro: placeholders all resolve to dosing forms", skelAfter === 0 && spinAfter === 0 && gate.state.resolved === 4, `skeletons=${skelAfter} spinners=${spinAfter} resolved=${gate.state.resolved}`);
    await gate.off();
    await page.close();

    // ---- hardware scanner (keypress wedge), fresh case
    page = await launch(context, await newCase(api, "or2986-scan"));
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    gate = await gateLookups(page, {});
    await page.keyboard.type("0143926201", { delay: 5 });
    await observePending(page, "scan", "Loading medication…", gate);
    await observeResolved(page, "scan", "CeFAZolin");
    const loadingLeft = await tab(page, "Loading medication…").count();
    check("scan: placeholder title replaced by medication name", loadingLeft === 0, `loadingTabs=${loadingLeft}`);
    await gate.off();

    // ---- NEGATIVE: scanner failure branches. Each must remove the placeholder, leaving no spinner/skeleton behind.
    const scanFailures = [
      { label: "negative-204 (not an NDC)", barcode: "OR2986NOTANNDC", banner: null },
      { label: "negative-404 (unmapped NDC)", barcode: "9999999999", banner: "Barcode not found. Select medication from dropdown." },
      { label: "negative-406 (error-mapped NDC)", barcode: "65293000200", banner: "Clevidipine is an infusion. Infusions must be documented directly in the EHR." },
    ];
    for (const sf of scanFailures) {
      await page.locator("#tab-navigation-tab-HOME_TAB").click();
      await page.locator("body").click({ position: { x: 5, y: 5 } });
      gate = await gateLookups(page, {});
      const resP = page.waitForResponse((r) => r.url().includes("/api/cds/medication-selection/"), { timeout: 20000 });
      await page.keyboard.type(sf.barcode, { delay: 5 });
      await observePending(page, `${sf.label} pre-response`, "Loading medication…", gate);
      const res = await resP;
      if (sf.banner) await page.getByText(sf.banner).waitFor({ timeout: 10000 }).catch(async (e) => { await dump(page, sf.label + "-timeout"); throw e; });
      await page.waitForTimeout(500);
      await dump(page, sf.label + "-after");
      const loadingLeft = await tab(page, "Loading medication…").count();
      const skelLeft = await skeleton(page).count();
      const spinLeft = await page.locator("[role=tab] .spinner-border").count();
      const homeSel = await page.locator("#tab-navigation-tab-HOME_TAB").getAttribute("aria-selected");
      const bannerShown = sf.banner ? await page.getByText(sf.banner).isVisible() : (await page.locator(".alert").filter({ visible: true }).count()) === 0;
      check(`${sf.label}: placeholder removed, Home reselected, ${sf.banner ? "banner shown" : "no banner"}`, loadingLeft === 0 && skelLeft === 0 && spinLeft === 0 && homeSel === "true" && bannerShown, `status=${res.status()} loadingTabs=${loadingLeft} skeletons=${skelLeft} spinners=${spinLeft} homeSelected=${homeSel} bannerOk=${bannerShown}`);
      await gate.off();
      if (sf.banner) { const x = page.locator(".alert").filter({ visible: true }).getByRole("button").first(); if (await x.count()) await x.click().catch(() => {}); }
    }

    // ---- NEGATIVE 2: server failure (500) turns the placeholder into an error, no spinner left
    gate = await gateLookups(page, { status: 500, delay: 1000 });
    await selectFromDropdown(page, "ondansetron iv", "Ondansetron IV");
    await observePending(page, "negative-500 (pre-response)", "Ondansetron IV", gate);
    await page.getByText("Something went wrong looking up this medication.").waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);
    const n2Skel = await skeleton(page).count();
    const n2Spin = await spinnerIn(page, "Ondansetron IV").count();
    check("negative-500: error shown in tab, spinner and skeleton gone", n2Skel === 0 && n2Spin === 0, `skeletons=${n2Skel} spinner=${n2Spin}`);
    await gate.off();
    await page.close();
  }

  if (MODE === "red") {
    const page = await launch(context, await newCase(api, "or2986-red"));
    let gate = await gateLookups(page, {});
    await selectFromDropdown(page, "cefazolin", "CeFAZolin");
    await observePending(page, "RED dropdown", "CeFAZolin", gate);
    await observeResolved(page, "RED dropdown (eventual form)", "CeFAZolin");
    await gate.off();
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    gate = await gateLookups(page, {});
    await page.keyboard.type("REDCHECK-OR2986-PREFIX-BUNDLE", { delay: 5 });
    const redRes = page.waitForResponse((r) => r.url().includes("/api/cds/medication-selection/"), { timeout: 20000 });
    await observePending(page, "RED scan (distinctive barcode)", "Loading medication…", gate);
    log("RED scan response status", (await redRes).status());
    await dump(page, "red-scan-after");
    await gate.off();
    await page.close();
  }

  await context.close();
  await browser.close();
  await api.dispose();
  const failed = results.filter((r) => !r.ok);
  log(`SUMMARY ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length && MODE === "green" ? 1 : 0);
})().catch((e) => { log("ERROR", e); process.exit(2); });
